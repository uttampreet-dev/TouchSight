import type { Label } from './ocr'
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

/** Each label is tied to the region it sits inside, the region its leader line ends in, or the nearest edge. */
export function associate(labels: Label[], regions: RegionCandidate[], segments: Segment[], scalePx: number): Association[] {
  const out: Association[] = []
  const leaderPad = 22 * scalePx
  const nearestMax = 70 * scalePx
  const leaderReach = 45 * scalePx
  const centre = (r: RegionCandidate): Px => { const n = r.polygon.length; return [r.polygon.reduce((a, p) => a + p[0], 0) / n, r.polygon.reduce((a, p) => a + p[1], 0) / n] }
  // a region holding two or more smaller regions is an outline, not a part of its own
  const isSilhouette = (r: RegionCandidate) => regions.filter((o) => o !== r && o.area < 0.8 * r.area && pointInPolygon(centre(o), r.polygon)).length >= 2
  for (const lb of labels) {
    // smallest region containing the label centre
    const containing = regions.filter((r) => pointInPolygon(lb.centre, r.polygon)).sort((a, b) => a.area - b.area)[0]
    if (containing) { out.push({ labelId: lb.id, regionId: containing.id, how: 'inside', distance: 0 }); continue }

    // a leader line starting at the label
    let found: Association | null = null
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
      const target = hit ?? regions.map((r) => ({ r, d: distToPolygon(far, r.polygon) })).filter((x) => x.d < leaderReach).sort((a, b) => Number(isSilhouette(a.r)) - Number(isSilhouette(b.r)) || a.d - b.d)[0]?.r
      if (target) { found = { labelId: lb.id, regionId: target.id, how: 'leader', leaderId: s.id, distance: 0 }; break }
    }
    if (found) { out.push(found); continue }

    // nearest region edge
    const near = regions.map((r) => ({ r, d: distToPolygon(lb.centre, r.polygon) })).sort((a, b) => a.d - b.d)[0]
    if (near && near.d <= nearestMax) out.push({ labelId: lb.id, regionId: near.r.id, how: 'nearest', distance: Math.round(near.d) })
    else out.push({ labelId: lb.id, regionId: null, how: 'none', distance: near ? Math.round(near.d) : Infinity })
  }
  return out
}
