import type { Tdm, Texture, Lang, TdmRegion, TdmLine } from './types'
import { cloneTdm } from './io'
import { union, simplifyPolygon } from './geometry'
import { RULES } from './simplify'
import { validate } from './validate'

/** Pure editing operations for the teacher console. Each returns a new model with validation re-run. */

const revalidate = (t: Tdm): Tdm => ({ ...t, validation: validate(t) })

export function rename(tdm: Tdm, id: string, lang: Lang, name: string): Tdm {
  const t = cloneTdm(tdm)
  const el = t.regions.find((r) => r.id === id) ?? t.lines.find((l) => l.id === id)
  if (!el) return tdm
  el.name = { ...el.name, [lang]: name }
  const k = t.key.find((k) => k.regionId === id)
  if (k) k.text = { ...k.text, [lang]: name }
  return revalidate(t)
}

export function setTexture(tdm: Tdm, id: string, texture: Texture): Tdm {
  const t = cloneTdm(tdm)
  const r = t.regions.find((r) => r.id === id)
  if (!r) return tdm
  r.texture = texture
  return revalidate(t)
}

export function remove(tdm: Tdm, id: string): Tdm {
  const t = cloneTdm(tdm)
  t.regions = t.regions.filter((r) => r.id !== id)
  t.lines = t.lines.filter((l) => l.id !== id)
  t.key = t.key.filter((k) => k.regionId !== id)
  t.readingOrder = t.readingOrder.filter((x) => x !== id)
  t.relations = t.relations.filter((r) => r.from !== id && r.to !== id)
  return revalidate(reletter(t))
}

/** Merge two regions into the first; the result keeps the first's name unless it is a placeholder. */
export function merge(tdm: Tdm, keepId: string, absorbId: string): Tdm {
  const t = cloneTdm(tdm)
  const a = t.regions.find((r) => r.id === keepId), b = t.regions.find((r) => r.id === absorbId)
  if (!a || !b) return tdm
  const u = union([a.polygon, b.polygon])
  if (!u) return tdm
  a.polygon = simplifyPolygon(u, RULES.outlineTolerance, RULES.vertexSpacing)
  if (/^Region \d+$/.test(a.name.en) && !/^Region \d+$/.test(b.name.en)) a.name = b.name
  t.relations = t.relations.map((r) => ({ ...r, from: r.from === absorbId ? keepId : r.from, to: r.to === absorbId ? keepId : r.to })).filter((r) => r.from !== r.to)
  return remove(t, absorbId)
}

export function addRelation(tdm: Tdm, from: string, to: string, kind: Tdm['relations'][number]['kind']): Tdm {
  const t = cloneTdm(tdm)
  if (!t.relations.some((r) => r.from === from && r.to === to)) t.relations.push({ from, to, kind, direction: 'forward' })
  return revalidate(t)
}

export function moveInOrder(tdm: Tdm, id: string, dir: -1 | 1): Tdm {
  const t = cloneTdm(tdm)
  const i = t.readingOrder.indexOf(id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= t.readingOrder.length) return tdm
  ;[t.readingOrder[i], t.readingOrder[j]] = [t.readingOrder[j], t.readingOrder[i]]
  return revalidate(reletter(t))
}

/** Key letters follow the reading order. */
export function reletter(t: Tdm): Tdm {
  const ref = (i: number) => String.fromCharCode(97 + (i % 26)) + (i >= 26 ? String(Math.floor(i / 26)) : '')
  const byId = new Map<string, TdmRegion | TdmLine>([...t.regions.map((r): [string, TdmRegion] => [r.id, r]), ...t.lines.map((l): [string, TdmLine] => [l.id, l])])
  t.readingOrder.forEach((id, i) => { const el = byId.get(id); if (el) el.keyRef = ref(i) })
  t.key = t.readingOrder.map((id) => { const el = byId.get(id)!; const old = t.key.find((k) => k.regionId === id); return { ref: el.keyRef, regionId: id, text: el.name, braille: old?.braille ?? {} } })
  return t
}

export function markReviewed(tdm: Tdm): Tdm {
  const t = cloneTdm(tdm)
  t.provenance = { ...t.provenance, teacherReviewed: true, reviewedAt: new Date().toISOString() }
  return revalidate(t)
}
