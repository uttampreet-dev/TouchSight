import type { Tdm, TdmValidation, ValidationFinding, Point } from './types'
import { area, boundaryDistance, bbox, contains, intersectionArea, polylineLength, segmentsIntersect } from './geometry'
import { RULES } from './simplify'

/**
 * Stage 4 — Accessibility Validator. Deterministic rules with named, located failures.
 * A TDM with any blocking finding cannot be published. Thresholds are the ones in `simplify.RULES`
 * and documented in docs/VALIDATOR-RULES.md.
 */

export const VALIDATOR_RULES = [
  { rule: 'S1', blocking: true, text: `Raised elements at least ${RULES.minGap} mm apart (region–region, line–line, line–region unless they connect)` },
  { rule: 'S2', blocking: true, text: `Regions at least ${RULES.minRegionArea} mm²; lines at least ${RULES.minLineLength} mm long` },
  { rule: 'S3', blocking: true, text: `Lines at least ${RULES.minLineWidth} mm wide` },
  { rule: 'T1', blocking: true, text: `Regions within ${RULES.adjacency} mm of each other use different textures` },
  { rule: 'K1', blocking: true, text: 'Braille key fits on the sheet below the diagram and overlaps no raised element' },
  { rule: 'O1', blocking: false, text: 'Every label used was read with OCR confidence ≥ 0.75' },
  { rule: 'R1', blocking: true, text: 'Every relation references existing elements' },
  { rule: 'R2', blocking: true, text: 'Every region and line appears in the reading order exactly once' },
  { rule: 'M1', blocking: true, text: 'Diagram and key sit inside the sheet margins' },
  { rule: 'N1', blocking: false, text: 'Every element has a real name, not a placeholder' },
] as const

const mid = (a: Point[], b: Point[]): Point => {
  // a point between the two closest vertices, for locating a finding
  let best: [number, Point, Point] = [Infinity, a[0], b[0]]
  for (const p of a) for (const q of b) { const d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < best[0]) best = [d, p, q] }
  return [+((best[1][0] + best[2][0]) / 2).toFixed(1), +((best[1][1] + best[2][1]) / 2).toFixed(1)]
}

function lineTouchesPolygon(path: Point[], poly: Point[]): boolean {
  for (let i = 0; i < path.length - 1; i++)
    for (let j = 0, k = poly.length - 1; j < poly.length; k = j++)
      if (segmentsIntersect(path[i], path[i + 1], poly[k], poly[j])) return true
  return false
}

function linesShareEndpoint(a: Point[], b: Point[]): boolean {
  const ends = [a[0], a[a.length - 1]], ends2 = [b[0], b[b.length - 1]]
  return ends.some((p) => ends2.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 1.0))
}

export function validate(tdm: Tdm): TdmValidation {
  const blocking: ValidationFinding[] = []
  const advisory: ValidationFinding[] = []
  const B = (rule: string, msg: string, ids: string[], at?: Point) => blocking.push({ rule, msg, ids, at })
  const A = (rule: string, msg: string, ids: string[], at?: Point) => advisory.push({ rule, msg, ids, at })
  const { regions, lines, sheet } = tdm

  // S1 — separation
  for (let i = 0; i < regions.length; i++) for (let j = i + 1; j < regions.length; j++) {
    const a = regions[i], b = regions[j]
    const d = boundaryDistance(a.polygon, b.polygon)
    const nested = contains(a.polygon, b.polygon) || contains(b.polygon, a.polygon)
    if (!nested && intersectionArea(a.polygon, b.polygon) > 0) B('S1', `${a.name.en} and ${b.name.en} overlap`, [a.id, b.id], mid(a.polygon, b.polygon))
    else if (d < RULES.minGap) B('S1', `${a.name.en} and ${b.name.en} are ${d.toFixed(1)} mm apart (min ${RULES.minGap})`, [a.id, b.id], mid(a.polygon, b.polygon))
  }
  for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length; j++) {
    const a = lines[i], b = lines[j]
    if (linesShareEndpoint(a.path, b.path)) continue
    const d = boundaryDistance(a.path, b.path, false, false)
    if (d < RULES.minGap) B('S1', `${a.name.en} and ${b.name.en} are ${d.toFixed(1)} mm apart (min ${RULES.minGap})`, [a.id, b.id], mid(a.path, b.path))
  }
  for (const l of lines) for (const r of regions) {
    if (lineTouchesPolygon(l.path, r.polygon)) continue // a connector may cross a boundary
    const inside = l.path.every((p) => contains(r.polygon, [p]))
    const d = boundaryDistance(l.path, r.polygon, false, true)
    if (!inside && d < RULES.minGap) B('S1', `${l.name.en} runs ${d.toFixed(1)} mm from ${r.name.en} (min ${RULES.minGap})`, [l.id, r.id], mid(l.path, r.polygon))
  }

  // S2, S3 — size
  for (const r of regions) { const a = area(r.polygon); if (a < RULES.minRegionArea) B('S2', `${r.name.en} is ${a.toFixed(0)} mm² (min ${RULES.minRegionArea})`, [r.id]) }
  for (const l of lines) {
    const len = polylineLength(l.path)
    if (len < RULES.minLineLength) B('S2', `${l.name.en} is ${len.toFixed(1)} mm long (min ${RULES.minLineLength})`, [l.id])
    if (l.width < RULES.minLineWidth) B('S3', `${l.name.en} is ${l.width} mm wide (min ${RULES.minLineWidth})`, [l.id])
  }

  // T1 — textures
  for (let i = 0; i < regions.length; i++) for (let j = i + 1; j < regions.length; j++) {
    const a = regions[i], b = regions[j]
    const near = boundaryDistance(a.polygon, b.polygon) < RULES.adjacency || intersectionArea(a.polygon, b.polygon) > 0
    if (near && a.texture === b.texture && a.texture !== 'empty') B('T1', `${a.name.en} and ${b.name.en} are neighbours with the same texture (${a.texture})`, [a.id, b.id], mid(a.polygon, b.polygon))
  }

  // M1, K1 — sheet and key
  const pts = [...regions.flatMap((r) => r.polygon), ...lines.flatMap((l) => l.path)]
  if (pts.length) {
    const b = bbox(pts)
    const m = sheet.margin
    if (b.x0 < m || b.y0 < m || b.x1 > sheet.w - m || b.y1 > sheet.h - m) B('M1', `diagram extends outside the ${m} mm margins (${b.x0.toFixed(0)},${b.y0.toFixed(0)})–(${b.x1.toFixed(0)},${b.y1.toFixed(0)})`, [])
    const keyRows = Math.ceil(tdm.key.length / 2)
    const keyTop = b.y1 + RULES.keyGap
    const keyBottom = keyTop + keyRows * RULES.keyRowHeight
    if (keyBottom > sheet.h - m) B('K1', `braille key (${tdm.key.length} entries, ${keyRows} rows) needs ${(keyBottom - (sheet.h - m)).toFixed(0)} mm more sheet`, [])
  }

  // O1, N1 — label quality
  for (const r of regions) {
    if (r.sourceLabel && r.sourceLabel.ocrConfidence < 0.75) A('O1', `${r.name.en}: read at ${Math.round(r.sourceLabel.ocrConfidence * 100)}% confidence`, [r.id])
    if (/^Region \d+$/.test(r.name.en)) A('N1', `${r.id} has no label`, [r.id])
  }
  for (const l of lines) if (/^Line \d+$/.test(l.name.en)) A('N1', `${l.id} has no label`, [l.id])

  // R1, R2 — structure
  const ids = new Set([...regions.map((r) => r.id), ...lines.map((l) => l.id)])
  for (const rel of tdm.relations) if (!ids.has(rel.from) || !ids.has(rel.to)) B('R1', `relation ${rel.from} → ${rel.to} references a missing element`, [rel.from, rel.to])
  const counts = new Map<string, number>()
  for (const id of tdm.readingOrder) counts.set(id, (counts.get(id) ?? 0) + 1)
  for (const id of ids) { const c = counts.get(id) ?? 0; if (c !== 1) B('R2', `${id} appears ${c} times in the reading order`, [id]) }
  for (const id of counts.keys()) if (!ids.has(id)) B('R2', `reading order names a missing element ${id}`, [id])

  return { status: blocking.length ? 'fail' : 'pass', blocking, advisory }
}
