import type { Tdm } from './types'

/** Parse and structurally check a TDM document. Throws with a readable message on a bad document. */
export function parseTdm(text: string): Tdm {
  let doc: unknown
  try {
    doc = JSON.parse(text)
  } catch (e) {
    throw new Error(`TDM is not valid JSON: ${(e as Error).message}`)
  }
  return assertTdm(doc)
}

export function assertTdm(doc: unknown): Tdm {
  const d = doc as Partial<Tdm>
  const fail = (m: string) => {
    throw new Error(`TDM invalid: ${m}`)
  }
  if (!d || typeof d !== 'object') fail('not an object')
  if (d.tdm !== '0.1') fail(`unsupported schema version ${String(d.tdm)}`)
  for (const k of ['id', 'title', 'subject'] as const) if (typeof d[k] !== 'string') fail(`${k} missing`)
  if (!d.sheet || !(d.sheet.w > 0) || !(d.sheet.h > 0)) fail('sheet w/h missing')
  if (!Array.isArray(d.regions)) fail('regions missing')
  if (!Array.isArray(d.lines)) fail('lines missing')
  if (!Array.isArray(d.relations)) fail('relations missing')
  if (!Array.isArray(d.key)) fail('key missing')
  if (!Array.isArray(d.readingOrder)) fail('readingOrder missing')
  const ids = new Set<string>()
  for (const r of d.regions!) {
    if (!r.id || ids.has(r.id)) fail(`region id missing or duplicate: ${r.id}`)
    ids.add(r.id)
    if (!r.polygon || r.polygon.length < 3) fail(`region ${r.id} polygon needs ≥3 points`)
    if (!r.name?.en) fail(`region ${r.id} needs name.en`)
  }
  for (const l of d.lines!) {
    if (!l.id || ids.has(l.id)) fail(`line id missing or duplicate: ${l.id}`)
    ids.add(l.id)
    if (!l.path || l.path.length < 2) fail(`line ${l.id} path needs ≥2 points`)
  }
  for (const rel of d.relations!) {
    if (!ids.has(rel.from) || !ids.has(rel.to)) fail(`relation references unknown id: ${rel.from} → ${rel.to}`)
  }
  return d as Tdm
}

export function serializeTdm(tdm: Tdm): string {
  return JSON.stringify(tdm, null, 2) + '\n'
}

/** Deterministic deep clone for editing without touching the stored document. */
export function cloneTdm(tdm: Tdm): Tdm {
  return JSON.parse(JSON.stringify(tdm)) as Tdm
}
