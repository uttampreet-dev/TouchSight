import type { Tdm, TdmRegion, TdmLine, Texture, Point } from './types'
import { area, boundaryDistance, bbox, centroid, contains, intersectionArea, intersection, offset, union, difference, simplifyPolygon, simplifyPolyline, polylineLength, segmentsIntersect } from './geometry'

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
  smoothRadius: 2.0, // mm, protrusions and notches narrower than twice this are rounded away
  adjacency: 5.0, // mm, regions this close must differ in texture
  keyRowHeight: 10.0, // mm per braille key row (standard braille line pitch; the exporters use the same)
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

import { keyLayout } from '../export/braille'

/**
 * `reserveKeyMm` is set only by the solver itself: the first pass reserves a capped estimate for the braille key,
 * and if the key the survivors actually need does not fit, one second pass re-fits with the measured height.
 */
export function simplify(input: Tdm, opts: { reserveKeyMm?: number } = {}): { tdm: Tdm; report: SimplifyReport } {
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
      const keyReserve = opts.reserveKeyMm ?? Math.min(60, keyRows * RULES.keyRowHeight)
      const availH = sheet.h - 2 * sheet.margin - RULES.keyGap - keyReserve
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

  // 1. clean outlines: round off spikes and notches a fingertip cannot resolve, then thin the vertices
  const smooth = (poly: Point[]): Point[] => {
    const opened = offset(poly, -RULES.smoothRadius)
    const o2 = opened ? offset(opened, RULES.smoothRadius) : null
    const closed = o2 ? offset(o2, RULES.smoothRadius * 0.75) : null
    const c2 = closed ? offset(closed, -RULES.smoothRadius * 0.75) : null
    const out = c2 && area(c2) >= RULES.minRegionArea * 0.5 ? c2 : poly
    return simplifyPolygon(out, RULES.outlineTolerance, RULES.vertexSpacing)
  }
  regions = regions.map((r) => ({ ...r, polygon: smooth(r.polygon) }))
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

  // 2b. containers: a region holding two or more other parts is a silhouette or outline, not a part of its own.
  //     It keeps its outline, takes no texture, and is left out of the separation loop below.
  //     "Holding" is measured by area, not strict geometry: a chamber's outline sits on the wall it shares with the
  //     silhouette, so after smoothing it can poke a fraction of a millimetre outside and still be inside the part.
  regions.sort((a, b) => area(b.polygon) - area(a.polygon))
  const mostlyInside = (outer: Point[], part: Point[]) => intersectionArea(outer, part) >= 0.9 * area(part)
  const containerIds = new Set<string>()
  for (const r of regions) {
    const held = regions.filter((o) => o !== r && area(o.polygon) < 0.8 * area(r.polygon) && mostlyInside(r.polygon, o.polygon))
    if (held.length >= 2) { containerIds.add(r.id); r.texture = 'empty' }
  }
  const isContainer = (r: TdmRegion) => containerIds.has(r.id)

  // 3. duplicates and heavy overlaps: a nested near-copy is dropped; a big overlap merges into the better-named one
  for (let i = 0; i < regions.length; i++) {
    for (let j = regions.length - 1; j > i; j--) {
      const A = regions[i], B = regions[j]
      if (isContainer(A) || isContainer(B)) {
        // a part straddling its outline is clipped to the outline's inside, a gap away from it
        const [outer, partIdx] = isContainer(A) ? [A, j] : [B, i]
        const part = regions[partIdx]
        if (isContainer(part) || contains(outer.polygon, part.polygon) || !intersectionArea(outer.polygon, part.polygon)) continue
        const inside = offset(outer.polygon, -(RULES.minGap + 0.1))
        const clipped = inside ? intersection(part.polygon, inside) : null
        if (clipped && area(clipped) >= RULES.minRegionArea) regions[partIdx] = { ...part, polygon: simplifyPolygon(clipped, RULES.outlineTolerance, RULES.vertexSpacing) }
        else { dropped.push({ id: part.id, why: `straddles the outline of ${outer.id} with too little inside` }); regions.splice(partIdx, 1); j = regions.length }
        continue
      }
      const aA = area(A.polygon), aB = area(B.polygon)
      const inter = intersectionArea(A.polygon, B.polygon)
      if (!inter) continue
      const nestedIn = mostlyInside(A.polygon, B.polygon)
      const nestedCopy = nestedIn && aB / aA > 0.85
      const heavy = inter / Math.min(aA, aB) > 0.6 && !nestedIn
      if (nestedCopy) {
        const keep = hasRealName(B) && !hasRealName(A) ? B : A
        const drop = keep === A ? B : A
        if (keep === B) { regions[i] = { ...B, polygon: A.polygon }; }
        dropped.push({ id: drop.id, why: `near-duplicate outline of ${keep.id}` })
        regions.splice(j, 1)
      } else if (nestedIn) {
        // a part inside another part (a nucleus in a cell): both stay, the inner one keeps a gap from the outer outline
        if (contains(A.polygon, B.polygon)) continue
        const inside = offset(A.polygon, -(RULES.minGap + 0.1))
        const clipped = inside ? intersection(B.polygon, inside) : null
        if (clipped && area(clipped) >= RULES.minRegionArea) regions[j] = { ...B, polygon: simplifyPolygon(clipped, RULES.outlineTolerance, RULES.vertexSpacing) }
        else { dropped.push({ id: B.id, why: `inside ${A.id} with too little left once a gap is kept from its outline` }); regions.splice(j, 1) }
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
        if (nested && (isContainer(A) || isContainer(B))) {
          // part inside its outline: shrink the part away from the outline, never drop it
          const inner = isContainer(A) ? j : i
          const outerIdx = inner === i ? j : i
          const shrunk = offset(regions[inner].polygon, -deficit)
          if (shrunk && area(shrunk) >= RULES.minRegionArea) { regions[inner] = { ...regions[inner], polygon: shrunk }; moved = true; continue }
          dropped.push({ id: regions[inner].id, why: `too small once moved ${RULES.minGap} mm clear of the outline of ${regions[outerIdx].id}` })
          regions.splice(inner, 1)
          continue outer
        }
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
  const result = finish()
  const layout = keyLayout(result.tdm)
  if (!layout.fits && opts.reserveKeyMm == null) return simplify(input, { reserveKeyMm: layout.bottom - layout.top + 2 })
  return result

  function finish() {
    // final sweep: vertex thinning after a clip can shave a part under the minimum; nothing undersized leaves here
    regions = regions.filter((r) => { const ok = area(r.polygon) >= RULES.minRegionArea; if (!ok) dropped.push({ id: r.id, why: `area ${area(r.polygon).toFixed(0)} mm² after redesign` }); return ok })
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
      if (isContainer(regions[i])) { tex[i] = 'empty'; continue }
      const used = new Set<Texture>([...adj[i]].map((k) => tex[k]).filter((t): t is Texture => !!t && t !== 'empty'))
      tex[i] = TEXTURE_ORDER.find((t) => !used.has(t)) ?? TEXTURE_ORDER[i % TEXTURE_ORDER.length]
    }
    regions = regions.map((r, i) => ({ ...r, texture: tex[i] }))

    // 7. reading order: the parts first, then the lines; each group is a top-left serial scan in 20 mm bands, then relations
    const band = (a: { c: Point }, b: { c: Point }) => Math.floor(a.c[1] / 20) - Math.floor(b.c[1] / 20) || a.c[0] - b.c[0]
    const items = [...regions.map((r) => ({ id: r.id, c: centroid(r.polygon) })).sort(band), ...lines.map((l) => ({ id: l.id, c: l.path[0] })).sort(band)]
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
