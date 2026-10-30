import ClipperLib from 'clipper-lib'
import type { Point } from './types'

/** Millimetre geometry on the sheet. Clipper works in integers, so 1 unit = 0.01 mm. */
export const SCALE = 100

export const toClip = (poly: Point[]): ClipperLib.Path => poly.map((p) => new ClipperLib.IntPoint(Math.round(p[0] * SCALE), Math.round(p[1] * SCALE)))
export const fromClip = (path: ClipperLib.Path): Point[] => path.map((p) => [+(p.X / SCALE).toFixed(2), +(p.Y / SCALE).toFixed(2)])

export function area(poly: Point[]): number {
  let a = 0
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1])
  return Math.abs(a) / 2
}

export function centroid(poly: Point[]): Point {
  const n = poly.length
  return [poly.reduce((s, p) => s + p[0], 0) / n, poly.reduce((s, p) => s + p[1], 0) / n]
}

export function bbox(poly: Point[]) {
  const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1])
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
}

export function pointInPolygon(p: Point, poly: Point[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function segDist(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const l2 = dx * dx + dy * dy
  const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

function segSegDist(a: Point, b: Point, c: Point, d: Point): number {
  if (segmentsIntersect(a, b, c, d)) return 0
  return Math.min(segDist(a, c, d), segDist(b, c, d), segDist(c, a, b), segDist(d, a, b))
}

function orient(a: Point, b: Point, c: Point) {
  return Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]))
}

export function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const o1 = orient(a, b, c), o2 = orient(a, b, d), o3 = orient(c, d, a), o4 = orient(c, d, b)
  return o1 !== o2 && o3 !== o4
}

/** Smallest distance between the boundaries of two polylines/polygons (0 when they touch or cross). */
export function boundaryDistance(a: Point[], b: Point[], closedA = true, closedB = true): number {
  let best = Infinity
  const na = closedA ? a.length : a.length - 1, nb = closedB ? b.length : b.length - 1
  for (let i = 0; i < na; i++) {
    const a1 = a[i], a2 = a[(i + 1) % a.length]
    for (let j = 0; j < nb; j++) {
      const b1 = b[j], b2 = b[(j + 1) % b.length]
      best = Math.min(best, segSegDist(a1, a2, b1, b2))
      if (best === 0) return 0
    }
  }
  return best
}

/** Does polygon A contain polygon B (all of B's vertices inside A)? */
export const contains = (a: Point[], b: Point[]) => b.every((p) => pointInPolygon(p, a))

/** Grow (+) or shrink (−) a polygon by `delta` mm with rounded corners. Returns the largest resulting piece. */
export function offset(poly: Point[], delta: number): Point[] | null {
  const co = new ClipperLib.ClipperOffset(2, 0.25 * SCALE)
  co.AddPath(toClip(poly), ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon)
  const out: ClipperLib.Paths = []
  co.Execute(out, delta * SCALE)
  if (!out.length) return null
  out.sort((p, q) => Math.abs(ClipperLib.Clipper.Area(q)) - Math.abs(ClipperLib.Clipper.Area(p)))
  return fromClip(out[0])
}

/** Union of polygons; returns the largest resulting outer piece. */
export function union(polys: Point[][]): Point[] | null {
  const c = new ClipperLib.Clipper()
  c.AddPaths(polys.map(toClip), ClipperLib.PolyType.ptSubject, true)
  const out: ClipperLib.Paths = []
  c.Execute(ClipperLib.ClipType.ctUnion, out, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero)
  if (!out.length) return null
  out.sort((p, q) => Math.abs(ClipperLib.Clipper.Area(q)) - Math.abs(ClipperLib.Clipper.Area(p)))
  return fromClip(out[0])
}

/** A ∩ B; returns the largest piece. */
export function intersection(a: Point[], b: Point[]): Point[] | null {
  const c = new ClipperLib.Clipper()
  c.AddPath(toClip(a), ClipperLib.PolyType.ptSubject, true)
  c.AddPath(toClip(b), ClipperLib.PolyType.ptClip, true)
  const out: ClipperLib.Paths = []
  c.Execute(ClipperLib.ClipType.ctIntersection, out, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero)
  if (!out.length) return null
  out.sort((p, q) => Math.abs(ClipperLib.Clipper.Area(q)) - Math.abs(ClipperLib.Clipper.Area(p)))
  return fromClip(out[0])
}

/** A minus B; returns the largest remaining piece. */
export function difference(a: Point[], b: Point[]): Point[] | null {
  const c = new ClipperLib.Clipper()
  c.AddPath(toClip(a), ClipperLib.PolyType.ptSubject, true)
  c.AddPath(toClip(b), ClipperLib.PolyType.ptClip, true)
  const out: ClipperLib.Paths = []
  c.Execute(ClipperLib.ClipType.ctDifference, out, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero)
  if (!out.length) return null
  out.sort((p, q) => Math.abs(ClipperLib.Clipper.Area(q)) - Math.abs(ClipperLib.Clipper.Area(p)))
  return fromClip(out[0])
}

/** Area of overlap between two polygons, in mm². */
export function intersectionArea(a: Point[], b: Point[]): number {
  const c = new ClipperLib.Clipper()
  c.AddPath(toClip(a), ClipperLib.PolyType.ptSubject, true)
  c.AddPath(toClip(b), ClipperLib.PolyType.ptClip, true)
  const out: ClipperLib.Paths = []
  c.Execute(ClipperLib.ClipType.ctIntersection, out, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero)
  return out.reduce((s, p) => s + Math.abs(ClipperLib.Clipper.Area(p)), 0) / (SCALE * SCALE)
}

/** Douglas–Peucker, tolerance in mm. */
export function simplifyPolyline(pts: Point[], tol: number): Point[] {
  if (pts.length <= 2) return pts
  let maxD = 0, idx = 0
  const a = pts[0], b = pts[pts.length - 1]
  for (let i = 1; i < pts.length - 1; i++) {
    const d = segDist(pts[i], a, b)
    if (d > maxD) { maxD = d; idx = i }
  }
  if (maxD <= tol) return [a, b]
  return [...simplifyPolyline(pts.slice(0, idx + 1), tol).slice(0, -1), ...simplifyPolyline(pts.slice(idx), tol)]
}

/** Closed polygon simplification: DP on the ring, then drop vertices closer than `minSpacing` to their neighbour. */
export function simplifyPolygon(poly: Point[], tol: number, minSpacing: number): Point[] {
  const ring = simplifyPolyline([...poly, poly[0]], tol).slice(0, -1)
  const out: Point[] = []
  for (const p of ring) {
    const last = out[out.length - 1]
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= minSpacing) out.push(p)
  }
  if (out.length > 3 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) < minSpacing) out.pop()
  return out.length >= 3 ? out : poly
}

export const polylineLength = (pts: Point[]) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0)
