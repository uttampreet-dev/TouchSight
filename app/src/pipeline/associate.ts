import type { Label, LabelLine } from './ocr'
import type { Segment } from './lines'
import type { Px, RegionCandidate } from './segment'

export interface Association {
  labelId: string
  regionId: string | null
  how: 'inside' | 'leader' | 'nearest' | 'none'
  leaderId?: string
  distance: number
}

export function pointInPolygon(p: Px, poly: Px[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function distToPolygon(p: Px, poly: Px[]): number {
  let best = Infinity
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    best = Math.min(best, distToSegment(p, poly[j], poly[i]))
  }
  return best
}

function distToSegment(p: Px, a: Px, b: Px): number {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const l2 = dx * dx + dy * dy
  const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

const nearBox = (p: Px, b: Label['bbox'], pad: number) => p[0] >= b.x - pad && p[0] <= b.x + b.w + pad && p[1] >= b.y - pad && p[1] <= b.y + b.h + pad

interface Candidate extends Association { tier: number; score: number }

/** A read that is letters without a word: texture mistaken for text. It never names a part; the teacher names that part. */
export const isNoise = (lb: Label) => {
  const longest = Math.max(0, ...lb.text.split(/[^A-Za-z]+/).map((w) => w.length))
  return lb.confidence < 0.5 || (longest <= 3 && lb.confidence < 0.85)
}

/**
 * A column of stacked labels that OCR read as one block is split where the leader lines say so: a printed line with its
 * own leader starts a new label; lines without one stay with the line above (a wrapped name keeps its lines together).
 */
export function splitStacked(labels: Label[], segments: Segment[], scalePx: number): Label[] {
  const pad = 22 * scalePx
  const out: Label[] = []
  for (const lb of labels) {
    const lines = lb.lines ?? []
    if (lines.length < 2) { out.push(lb); continue }
    // a line owns a leader when a stroke comes in from the side at that line's height and leads away from the block
    const b = lb.bbox
    const atSide = (p: Px) => (p[0] >= b.x - pad && p[0] <= b.x + 2) || (p[0] >= b.x + b.w - 2 && p[0] <= b.x + b.w + pad)
    const away = (p: Px) => p[0] < b.x - 2 * pad || p[0] > b.x + b.w + 2 * pad || p[1] < b.y - 2 * pad || p[1] > b.y + b.h + 2 * pad
    const leaderOf = (ln: LabelLine) => segments.find((s) => {
      const cy = ln.bbox.y + ln.bbox.h / 2
      const [near, far] = Math.abs(s.a[1] - cy) <= Math.abs(s.b[1] - cy) ? [s.a, s.b] : [s.b, s.a]
      return Math.abs(near[1] - cy) <= ln.bbox.h * 0.5 && atSide(near) && away(far) && Math.abs(far[0] - near[0]) > 0.4 * Math.abs(far[1] - near[1])
    })
    const leaders = lines.map(leaderOf)
    const hasLeader = leaders.map(Boolean)
    // every line has a leader of its own: a column of names, not a wrapped name
    if (!hasLeader.every(Boolean) || new Set(leaders.map((s) => s!.id)).size < lines.length) { out.push(lb); continue }
    const parts: typeof lines[] = []
    lines.forEach((ln, i) => { if (hasLeader[i] || !parts.length) parts.push([ln]); else parts[parts.length - 1].push(ln) })
    parts.forEach((part, i) => {
      const x = Math.min(...part.map((l) => l.bbox.x)), y = Math.min(...part.map((l) => l.bbox.y))
      const x1 = Math.max(...part.map((l) => l.bbox.x + l.bbox.w)), y1 = Math.max(...part.map((l) => l.bbox.y + l.bbox.h))
      out.push({ ...lb, id: `${lb.id}${String.fromCharCode(97 + i)}`, text: part.map((l) => l.text).join(' '), lines: part, bbox: { x, y, w: x1 - x, h: y1 - y }, centre: [(x + x1) / 2, (y + y1) / 2] })
    })
  }
  return out
}

/**
 * Each label is tied to the region it sits inside, the region its leader line ends in, or the nearest edge; then the
 * ties are settled one label per region: a region keeps the label that fits it best (inside before leader before
 * nearest, then by distance) and a label that lost its first choice falls to its next.
 */
export function associate(labels: Label[], regions: RegionCandidate[], segments: Segment[], scalePx: number): Association[] {
  const leaderPad = 22 * scalePx
  const nearestMax = 70 * scalePx
  const leaderReach = 45 * scalePx
  const centre = (r: RegionCandidate): Px => { const n = r.polygon.length; return [r.polygon.reduce((a, p) => a + p[0], 0) / n, r.polygon.reduce((a, p) => a + p[1], 0) / n] }
  // a region holding two or more smaller regions is an outline, not a part of its own
  const silhouette = new Set(regions.filter((r) => regions.filter((o) => o !== r && o.area < 0.8 * r.area && pointInPolygon(centre(o), r.polygon)).length >= 2).map((r) => r.id))
  const isSilhouette = (r: RegionCandidate) => silhouette.has(r.id)

  // tiers: inside a part (0), at the end of a leader (1), inside or led to an outline (2), near an edge (3)
  const candidates: Candidate[] = []
  for (const lb of labels) {
    if (isNoise(lb)) continue
    // regions containing the label centre, smallest first; a label inside an outline names an inner part before the outline
    const containing = regions.filter((r) => pointInPolygon(lb.centre, r.polygon)).sort((a, b) => a.area - b.area)
    containing.forEach((r, i) => {
      const c = centre(r)
      const off = Math.hypot(lb.centre[0] - c[0], lb.centre[1] - c[1]) / Math.sqrt(r.area)
      candidates.push({ labelId: lb.id, regionId: r.id, how: 'inside', distance: 0, tier: isSilhouette(r) ? 2 : 0, score: i + off + (1 - lb.confidence) })
    })

    // leader lines starting at the label
    for (const s of segments) {
      const aNear = nearBox(s.a, lb.bbox, leaderPad), bNear = nearBox(s.b, lb.bbox, leaderPad)
      if (!aNear && !bNear) continue
      const far = aNear ? s.b : s.a
      let hit = regions.filter((r) => pointInPolygon(far, r.polygon)).sort((a, b) => a.area - b.area)[0]
      if (hit && isSilhouette(hit)) {
        // the leader ends on the wall of a part drawn inside the outline: the part it touches is the target, not the outline
        const wall = regions.filter((r) => r !== hit && r.area < hit.area).map((r) => ({ r, d: distToPolygon(far, r.polygon) })).filter((x) => x.d < leaderReach).sort((a, b) => a.d - b.d)[0]
        if (wall) hit = wall.r
      }
      // a leader that stops short of its part (the stroke detector clips ends): nearest part within reach, outlines last
      const near = regions.map((r) => ({ r, d: distToPolygon(far, r.polygon) })).filter((x) => x.d < leaderReach).sort((a, b) => Number(isSilhouette(a.r)) - Number(isSilhouette(b.r)) || a.d - b.d)
      const targets = hit ? [{ r: hit, d: 0 }, ...near.filter((x) => x.r !== hit)] : near
      targets.forEach((t, i) => candidates.push({ labelId: lb.id, regionId: t.r.id, how: 'leader', leaderId: s.id, distance: Math.round(t.d), tier: isSilhouette(t.r) ? 2 : 1, score: i * leaderReach + t.d }))
    }

    // nearest region edges
    regions.map((r) => ({ r, d: distToPolygon(lb.centre, r.polygon) })).filter((x) => x.d <= nearestMax).sort((a, b) => a.d - b.d)
      .forEach((x) => candidates.push({ labelId: lb.id, regionId: x.r.id, how: 'nearest', distance: Math.round(x.d), tier: 3, score: x.d }))
  }

  // one label per region, one region per label: best fit first
  const ranked = candidates.sort((a, b) => a.tier - b.tier || a.score - b.score)
  const byLabel = new Map<string, Association>()
  const taken = new Set<string>()
  for (const c of ranked) {
    if (byLabel.has(c.labelId) || taken.has(c.regionId!)) continue
    byLabel.set(c.labelId, { labelId: c.labelId, regionId: c.regionId, how: c.how, leaderId: c.leaderId, distance: c.distance })
    taken.add(c.regionId!)
  }
  return labels.map((lb) => {
    const a = byLabel.get(lb.id)
    if (a) return a
    const near = regions.map((r) => distToPolygon(lb.centre, r.polygon)).sort((x, y) => x - y)[0]
    return { labelId: lb.id, regionId: null, how: 'none', distance: near === undefined ? Infinity : Math.round(near) }
  })
}
