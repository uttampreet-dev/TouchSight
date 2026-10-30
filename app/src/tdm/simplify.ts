import type { Tdm, TdmRegion, TdmLine, Texture, Point } from './types'
import { area, boundaryDistance, bbox, centroid, contains, intersectionArea, offset, union, difference, simplifyPolygon, simplifyPolyline, polylineLength, segmentsIntersect } from './geometry'

/**
 * Stage 3 — Simplify. Turns a draft model into one a fingertip can read.
 *
 * A fingertip resolves 1–2 mm and reads serially; raised lines closer than ~3 mm merge into one ridge.
 * So this stage: cleans outlines, removes duplicates and slivers, pushes neighbours apart to the minimum gap,
 * gives adjacent regions distinct textures, moves labels to a braille key, and orders the reading.
 */

export const RULES = {
  minGap: 3.0, // mm between any two raised elements (BANA: ≥ 1/8 in)
  minRegionArea: 60, // mm²
  minLineLength: 8, // mm
  minLineWidth: 1.2, // mm
  outlineTolerance: 0.6, // mm, Douglas–Peucker
  vertexSpacing: 1.5, // mm, no two vertices closer than this
  adjacency: 5.0, // mm, regions this close must differ in texture
  keyRowHeight: 7.0, // mm per braille key row
  keyGap: 10.0, // mm between diagram and key
}

const TEXTURE_ORDER: Texture[] = ['dots', 'diagonal-lines', 'horizontal-lines', 'grid', 'solid']

export interface SimplifyReport {
  regionsIn: number
  regionsOut: number
  linesIn: number
  linesOut: number
  dropped: { id: string; why: string }[]
  merged: { kept: string; absorbed: string }[]
  minGapBefore: number
  minGapAfter: number
  separationPasses: number
  textures: number
  scaledBy: number
}

const hasRealName = (r: TdmRegion) => !/^Region \d+$/.test(r.name.en)

export function simplify(input: Tdm): { tdm: Tdm; report: SimplifyReport } {
  const tdm: Tdm = JSON.parse(JSON.stringify(input))
  const dropped: SimplifyReport['dropped'] = []
  const merged: SimplifyReport['merged'] = []

  // 0. fit inside the sheet margins first, leaving room for the key, so every rule below is judged at print size
  let regions: TdmRegion[] = tdm.regions
  let lines: TdmLine[] = tdm.lines
  let scaledBy = 1
  {
    const sheet = tdm.sheet
    const pts = [...regions.flatMap((r) => r.polygon), ...lines.flatMap((l) => l.path)]
    if (pts.length) {
      const b = bbox(pts)
      const keyRows = Math.ceil((regions.length + lines.length) / 2)
      const availW = sheet.w - 2 * sheet.margin
      const availH = sheet.h - 2 * sheet.margin - RULES.keyGap - keyRows * RULES.keyRowHeight
      const s = Math.min(1, availW / Math.max(1, b.x1 - b.x0), availH / Math.max(1, b.y1 - b.y0))
      const tx = sheet.margin - b.x0 * s + (availW - (b.x1 - b.x0) * s) / 2
      const ty = sheet.margin - b.y0 * s
      if (s < 1 || b.x0 < sheet.margin - 0.01 || b.y0 < sheet.margin - 0.01) {
        scaledBy = +s.toFixed(3)
        const map = (p: Point): Point => [+(p[0] * s + tx).toFixed(2), +(p[1] * s + ty).toFixed(2)]
        regions = regions.map((r) => ({ ...r, polygon: r.polygon.map(map) }))
        lines = lines.map((l) => ({ ...l, path: l.path.map(map) }))
      }
    }
  }

  // 1. clean outlines
  regions = regions.map((r) => ({ ...r, polygon: simplifyPolygon(r.polygon, RULES.outlineTolerance, RULES.vertexSpacing) }))
  lines = lines.map((l) => ({ ...l, path: simplifyPolyline(l.path, RULES.outlineTolerance), width: Math.max(l.width, RULES.minLineWidth) }))

  // 2. slivers
  regions = regions.filter((r) => {
    const ok = area(r.polygon) >= RULES.minRegionArea
    if (!ok) dropped.push({ id: r.id, why: `area ${area(r.polygon).toFixed(0)} mm² < ${RULES.minRegionArea}` })
    return ok
  })
  lines = lines.filter((l) => {
    const ok = polylineLength(l.path) >= RULES.minLineLength
    if (!ok) dropped.push({ id: l.id, why: `length ${polylineLength(l.path).toFixed(1)} mm < ${RULES.minLineLength}` })
    return ok
  })

  // 3. duplicates and heavy overlaps: a nested near-copy is dropped; a big overlap merges into the better-named one
  regions.sort((a, b) => area(b.polygon) - area(a.polygon))
  for (let i = 0; i < regions.length; i++) {
    for (let j = regions.length - 1; j > i; j--) {
      const A = regions[i], B = regions[j]
      const aA = area(A.polygon), aB = area(B.polygon)
      const inter = intersectionArea(A.polygon, B.polygon)
      if (!inter) continue
      const nestedCopy = contains(A.polygon, B.polygon) && aB / aA > 0.85
      const heavy = inter / Math.min(aA, aB) > 0.6 && !contains(A.polygon, B.polygon)
      if (nestedCopy) {
        const keep = hasRealName(B) && !hasRealName(A) ? B : A
        const drop = keep === A ? B : A
        if (keep === B) { regions[i] = { ...B, polygon: A.polygon }; }
        dropped.push({ id: drop.id, why: `near-duplicate outline of ${keep.id}` })
        regions.splice(j, 1)
      } else if (heavy && (!hasRealName(A) || !hasRealName(B))) {
        const keep = hasRealName(B) ? B : A
        const absorbed = keep === A ? B : A
        const u = union([A.polygon, B.polygon])
        if (u) {
          regions[i] = { ...keep, polygon: simplifyPolygon(u, RULES.outlineTolerance, RULES.vertexSpacing) }
          merged.push({ kept: keep.id, absorbed: absorbed.id })
          regions.splice(j, 1)
        }
      } else if (!contains(A.polygon, B.polygon) && !contains(B.polygon, A.polygon)) {
        // two named parts claiming the same area: the smaller one gives up the overlap and the gap
        const grown = offset(A.polygon, RULES.minGap + 0.1)
        const cut = grown ? difference(B.polygon, grown) : null
        if (cut && area(cut) >= RULES.minRegionArea) regions[j] = { ...B, polygon: simplifyPolygon(cut, RULES.outlineTolerance, RULES.vertexSpacing) }
        else { dropped.push({ id: B.id, why: `overlaps ${A.id} and too little remains once separated` }); regions.splice(j, 1) }
      }
    }
  }

  // 4. separation: push neighbours apart until every boundary pair is ≥ minGap
  const minGap = () => {
    let m = Infinity
    for (let i = 0; i < regions.length; i++) for (let j = i + 1; j < regions.length; j++) m = Math.min(m, boundaryDistance(regions[i].polygon, regions[j].polygon))
    return m
  }
  const minGapBefore = regions.length > 1 ? +minGap().toFixed(2) : Infinity
  let passes = 0
  outer: for (; passes < 8; passes++) {
    let moved = false
    for (let i = 0; i < regions.length; i++) {
      for (let j = i + 1; j < regions.length; j++) {
        const A = regions[i], B = regions[j]
        const d = boundaryDistance(A.polygon, B.polygon)
        if (d >= RULES.minGap) continue
        const deficit = RULES.minGap - d + 0.1
        const nested = contains(A.polygon, B.polygon) || contains(B.polygon, A.polygon)
        if (nested) {
          // keep the outer, shrink the inner
          const inner = contains(A.polygon, B.polygon) ? j : i
          const outerIdx = inner === i ? j : i
          const shrunk = offset(regions[inner].polygon, -deficit)
          if (shrunk && area(shrunk) >= RULES.minRegionArea) { regions[inner] = { ...regions[inner], polygon: shrunk }; moved = true; continue }
          dropped.push({ id: regions[inner].id, why: `inner region too small once separated from ${regions[outerIdx].id}` })
          regions.splice(inner, 1)
          continue outer
        }
        const half = deficit / 2
        const a2 = offset(A.polygon, -half), b2 = offset(B.polygon, -half)
        const okA = a2 && area(a2) >= RULES.minRegionArea, okB = b2 && area(b2) >= RULES.minRegionArea
        if (okA && okB) { regions[i] = { ...A, polygon: a2! }; regions[j] = { ...B, polygon: b2! }; moved = true; continue }
        // one is too small to give ground: the larger gives it all
        const big = area(A.polygon) >= area(B.polygon) ? i : j
        const small = big === i ? j : i
        const alt = offset(regions[big].polygon, -deficit)
        if (alt && area(alt) >= RULES.minRegionArea) { regions[big] = { ...regions[big], polygon: alt }; moved = true; continue }
        dropped.push({ id: regions[small].id, why: `cannot be separated from ${regions[big].id} at ${RULES.minGap} mm` })
        regions.splice(small, 1)
        continue outer
      }
    }
    if (!moved) break
  }
  return finish()

  function finish() {
  // 5a. lines (after the regions have settled): the stroke detector returns duplicates and crowds. Keep a line when it is unique and either stands
  //     clear of everything or connects to something; between two crowded lines the shorter goes.
  lines.sort((a, b) => polylineLength(b.path) - polylineLength(a.path))
  const touches = (path: Point[], poly: Point[]) => {
    for (let i = 0; i < path.length - 1; i++) for (let j = 0, k = poly.length - 1; j < poly.length; k = j++) if (segmentsIntersect(path[i], path[i + 1], poly[k], poly[j])) return true
    return false
  }
  const shareEnd = (a: Point[], b: Point[]) => [a[0], a[a.length - 1]].some((p) => [b[0], b[b.length - 1]].some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 1.0))
  const keptLines: TdmLine[] = []
  for (const l of lines) {
    const clash = keptLines.find((k) => !shareEnd(k.path, l.path) && boundaryDistance(k.path, l.path, false, false) < RULES.minGap)
    if (clash) { dropped.push({ id: l.id, why: `within ${RULES.minGap} mm of ${clash.id}` }); continue }
    const nearRegion = regions.find((r) => !touches(l.path, r.polygon) && !l.path.every((p) => contains(r.polygon, [p])) && boundaryDistance(l.path, r.polygon, false, true) < RULES.minGap)
    if (nearRegion) { dropped.push({ id: l.id, why: `runs within ${RULES.minGap} mm of ${nearRegion.id} without connecting` }); continue }
    keptLines.push(l)
  }
  lines = keptLines


    // 5. textures: adjacent regions get different ones (greedy colouring, highest degree first)
    const n = regions.length
    const adj: Set<number>[] = Array.from({ length: n }, () => new Set())
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      if (boundaryDistance(regions[i].polygon, regions[j].polygon) < RULES.adjacency || intersectionArea(regions[i].polygon, regions[j].polygon) > 0) { adj[i].add(j); adj[j].add(i) }
    }
    const order = [...Array(n).keys()].sort((a, b) => adj[b].size - adj[a].size)
    const tex: Texture[] = Array(n)
    for (const i of order) {
      const used = new Set([...adj[i]].map((k) => tex[k]).filter(Boolean))
      tex[i] = TEXTURE_ORDER.find((t) => !used.has(t)) ?? TEXTURE_ORDER[i % TEXTURE_ORDER.length]
    }
    regions = regions.map((r, i) => ({ ...r, texture: tex[i] }))

    // 7. reading order: top-left serial scan in 20 mm bands, then follow relations
    const items = [...regions.map((r) => ({ id: r.id, c: centroid(r.polygon) })), ...lines.map((l) => ({ id: l.id, c: l.path[0] }))]
    items.sort((a, b) => Math.floor(a.c[1] / 20) - Math.floor(b.c[1] / 20) || a.c[0] - b.c[0])
    const seen = new Set<string>()
    const readingOrder: string[] = []
    const push = (id: string) => { if (!seen.has(id)) { seen.add(id); readingOrder.push(id) } }
    for (const it of items) {
      push(it.id)
      for (const rel of tdm.relations) if (rel.from === it.id && items.some((x) => x.id === rel.to)) push(rel.to)
    }

    // 8. braille key: one ref per element in reading order
    const ref = (i: number) => String.fromCharCode(97 + (i % 26)) + (i >= 26 ? String(Math.floor(i / 26)) : '')
    const byId = new Map<string, TdmRegion | TdmLine>([...regions.map((r) => [r.id, r] as const), ...lines.map((l) => [l.id, l] as const)])
    readingOrder.forEach((id, i) => { const el = byId.get(id); if (el) el.keyRef = ref(i) })
    tdm.key = readingOrder.map((id) => { const el = byId.get(id)!; return { ref: el.keyRef, regionId: id, text: el.name, braille: {} } })

    tdm.regions = regions
    tdm.lines = lines
    tdm.readingOrder = readingOrder
    tdm.relations = tdm.relations.filter((r) => byId.has(r.from) && byId.has(r.to))
    tdm.validation = { status: 'pending', blocking: [], advisory: [] }
    tdm.provenance = { ...tdm.provenance, pipeline: '0.1' }
    const report: SimplifyReport = {
      regionsIn: input.regions.length, regionsOut: regions.length, linesIn: input.lines.length, linesOut: lines.length,
      dropped, merged, minGapBefore, minGapAfter: regions.length > 1 ? +minGap().toFixed(2) : Infinity, separationPasses: passes, textures: new Set(tex).size, scaledBy,
    }
    return { tdm, report }
  }
}
