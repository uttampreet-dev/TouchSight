import earcut from 'earcut'
import type { Tdm, Lang, Point } from '../tdm/types'
import { offset, intersection, bbox as bboxOf, area, diagramBox } from '../tdm/geometry'
import { keyLayout, dotPositions, CELL_PITCH } from './braille'

/**
 * Printable relief: a base plate, 1 mm walls on every outline, textures as height fields, lines as ridges and
 * the key as braille domes. Every primitive is its own closed shell (slicers union them), written as binary STL.
 */

export const RELIEF = {
  plate: 2.0,        // base thickness
  wall: 1.0,         // outline height above the plate
  wallWidth: 1.2,
  dot: 0.6,          // texture dome height
  dotRadius: 0.65,
  ridge: 0.8,        // texture ridge height
  ridgeWidth: 0.6,
  plateau: 0.6,      // solid texture
  line: 0.8,         // raised line height
  keyDome: 0.5,
  keyDomeRadius: 0.75,
  pitch: 2.2,        // texture pitch
  inset: 1.6,        // textures keep this far from the outline wall
  margin: 5,         // plate beyond the drawing
}

type V = [number, number, number]
type Tri = [V, V, V]

export interface StlFacts { triangles: number; shells: number; bbox: { x: number; y: number; z: number; w: number; h: number; d: number }; bytes: number; keyDomes: number; textureFeatures: number }

const clean = (poly: Point[]): Point[] => {
  const out: Point[] = []
  for (const p of poly) { const q = out[out.length - 1]; if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-3) out.push([+p[0].toFixed(3), +p[1].toFixed(3)]) }
  if (out.length > 1 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) <= 1e-3) out.pop()
  return out
}
const signedArea = (p: Point[]) => { let a = 0; for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; a += x1 * y2 - x2 * y1 } return a / 2 }
const ccw = (p: Point[]) => (signedArea(p) < 0 ? [...p].reverse() : p)
const cw = (p: Point[]) => (signedArea(p) > 0 ? [...p].reverse() : p)

/** One closed shell: a polygon (with holes) between z0 and z1. Returns the triangles added. */
function extrude(outerIn: Point[], holesIn: Point[][], z0: number, z1: number, out: Tri[]): number {
  const outer = ccw(clean(outerIn))
  const holes = holesIn.map((h) => cw(clean(h))).filter((h) => h.length >= 3)
  if (outer.length < 3) return 0
  const flat: number[] = []
  const holeIdx: number[] = []
  for (const p of outer) flat.push(p[0], p[1])
  for (const h of holes) { holeIdx.push(flat.length / 2); for (const p of h) flat.push(p[0], p[1]) }
  const idx = earcut(flat, holeIdx.length ? holeIdx : undefined, 2)
  if (!idx.length) return 0
  const v = (i: number, z: number): V => [flat[2 * i], flat[2 * i + 1], z]
  const start = out.length
  for (let i = 0; i < idx.length; i += 3) {
    out.push([v(idx[i], z1), v(idx[i + 1], z1), v(idx[i + 2], z1)])
    out.push([v(idx[i], z0), v(idx[i + 2], z0), v(idx[i + 1], z0)])
  }
  let base = 0
  for (const ring of [outer, ...holes]) {
    const n = ring.length
    for (let i = 0; i < n; i++) {
      const a = base + i, b = base + ((i + 1) % n)
      out.push([v(a, z0), v(b, z0), v(b, z1)])
      out.push([v(a, z0), v(b, z1), v(a, z1)])
    }
    base += n
  }
  return out.length - start
}

const ngon = (c: Point, r: number, n = 8): Point[] => Array.from({ length: n }, (_, i) => [c[0] + r * Math.cos((2 * Math.PI * i) / n), c[1] + r * Math.sin((2 * Math.PI * i) / n)] as Point)

/** A rectangle of the given width along a segment, trimmed a hair at both ends so neighbouring pieces never share vertices. */
function strip(a: Point, b: Point, width: number, trim = 0.01): Point[] | null {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const len = Math.hypot(dx, dy)
  if (len <= 2 * trim) return null
  const ux = dx / len, uy = dy / len
  const nx = -uy * (width / 2), ny = ux * (width / 2)
  const a2: Point = [a[0] + ux * trim, a[1] + uy * trim], b2: Point = [b[0] - ux * trim, b[1] - uy * trim]
  return [[a2[0] + nx, a2[1] + ny], [b2[0] + nx, b2[1] + ny], [b2[0] - nx, b2[1] - ny], [a2[0] - nx, a2[1] - ny]]
}

export function exportStl(tdm: Tdm, opts: { lang?: Lang; braille?: Record<string, string> } = {}): { stl: ArrayBuffer; facts: StlFacts } {
  const R = RELIEF
  const tris: Tri[] = []
  let shells = 0
  const add = (outer: Point[], holes: Point[][], z0: number, z1: number) => { if (extrude(outer, holes, z0, z1, tris) > 0) shells++ }
  const key = keyLayout(tdm, opts.lang ?? 'en', opts.braille)
  const box = diagramBox(tdm, 0)
  const keyRight = key.rows.reduce((m, r) => Math.max(m, r.x + r.cells.length * CELL_PITCH), 0)
  const px0 = Math.min(box.x, tdm.sheet.margin) - R.margin, py0 = box.y - R.margin
  const px1 = Math.max(box.x + box.w, keyRight) + R.margin, py1 = (key.rows.length ? key.bottom : box.y + box.h) + R.margin
  // base plate
  add([[px0, py0], [px1, py0], [px1, py1], [px0, py1]], [], 0, R.plate)
  const top = R.plate
  let textureFeatures = 0

  for (const r of tdm.regions) {
    // outline wall: the ring between an outward and an inward offset
    const outer = offset(r.polygon, R.wallWidth / 2), inner = offset(r.polygon, -R.wallWidth / 2)
    if (outer && inner && area(inner) > 1) add(outer, [inner], top, top + R.wall)
    else if (outer) add(outer, [], top, top + R.wall)
    // textures as height fields inside the inset
    const field = offset(r.polygon, -(R.wallWidth / 2 + R.inset))
    if (!field || area(field) < 4 || r.texture === 'empty') continue
    const b = bboxOf(field)
    if (r.texture === 'solid') { add(field, [], top, top + R.plateau); textureFeatures++; continue }
    if (r.texture === 'dots') {
      for (let y = b.y0 + R.pitch / 2; y < b.y1; y += R.pitch) for (let x = b.x0 + R.pitch / 2; x < b.x1; x += R.pitch) {
        if (!pointIn([x, y], field, R.dotRadius)) continue
        add(ngon([x, y], R.dotRadius), [], top, top + R.dot); textureFeatures++
      }
      continue
    }
    const dirs: [number, number][] = r.texture === 'horizontal-lines' ? [[1, 0]] : r.texture === 'diagonal-lines' ? [[Math.SQRT1_2, Math.SQRT1_2]] : [[1, 0], [0, 1]]
    for (const [ux, uy] of dirs) {
      const nx = -uy, ny = ux
      const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2
      const half = Math.hypot(b.x1 - b.x0, b.y1 - b.y0) / 2 + 2
      for (let k = -half; k <= half; k += R.pitch) {
        const c: Point = [cx + nx * k, cy + ny * k]
        const ridge = strip([c[0] - ux * half, c[1] - uy * half], [c[0] + ux * half, c[1] + uy * half], R.ridgeWidth, 0)
        if (!ridge) continue
        const piece = intersection(ridge, field)
        if (piece && area(piece) > 0.3) { add(piece, [], top, top + R.ridge); textureFeatures++ }
      }
    }
  }

  for (const l of tdm.lines) {
    const w = Math.max(l.width, 1.2)
    const segs: [Point, Point][] = []
    for (let i = 0; i < l.path.length - 1; i++) segs.push([l.path[i], l.path[i + 1]])
    for (const [a, b] of segs) {
      if (l.style === 'dashed') {
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]); const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len
        for (let s = 0; s < len; s += 5) { const e = Math.min(len, s + 3); const st = strip([a[0] + ux * s, a[1] + uy * s], [a[0] + ux * e, a[1] + uy * e], w); if (st) add(st, [], top, top + R.line) }
      } else if (l.style === 'double') {
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]); const nx = -(b[1] - a[1]) / len * w, ny = (b[0] - a[0]) / len * w
        for (const s of [1, -1]) { const st = strip([a[0] + nx * s, a[1] + ny * s], [b[0] + nx * s, b[1] + ny * s], w); if (st) add(st, [], top, top + R.line) }
      } else { const st = strip(a, b, w); if (st) add(st, [], top, top + R.line) }
    }
  }

  let keyDomes = 0
  for (const row of key.rows) for (const [ci, mask] of row.cells.entries()) for (const d of dotPositions(row.x + ci * CELL_PITCH, row.y, mask)) { add(ngon(d, R.keyDomeRadius), [], top, top + R.keyDome); keyDomes++ }

  // binary STL
  const buf = new ArrayBuffer(84 + tris.length * 50)
  const dv = new DataView(buf)
  const header = `TouchSight relief ${tdm.id}`.slice(0, 80)
  for (let i = 0; i < header.length; i++) dv.setUint8(i, header.charCodeAt(i))
  dv.setUint32(80, tris.length, true)
  let o = 84
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  for (const [a, b, c] of tris) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2]
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx
    const nl = Math.hypot(nx, ny, nz) || 1
    dv.setFloat32(o, nx / nl, true); dv.setFloat32(o + 4, ny / nl, true); dv.setFloat32(o + 8, nz / nl, true); o += 12
    for (const p of [a, b, c]) {
      dv.setFloat32(o, p[0], true); dv.setFloat32(o + 4, p[1], true); dv.setFloat32(o + 8, p[2], true); o += 12
      if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0]; if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; if (p[2] < minZ) minZ = p[2]; if (p[2] > maxZ) maxZ = p[2]
    }
    dv.setUint16(o, 0, true); o += 2
  }
  return { stl: buf, facts: { triangles: tris.length, shells, bbox: { x: +minX.toFixed(1), y: +minY.toFixed(1), z: +minZ.toFixed(1), w: +(maxX - minX).toFixed(1), h: +(maxY - minY).toFixed(1), d: +(maxZ - minZ).toFixed(2) }, bytes: buf.byteLength, keyDomes, textureFeatures } }
}

function pointIn(p: Point, poly: Point[], clearance: number): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside
  }
  if (!inside) return false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j], [bx, by] = poly[i]
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy
    const t = l2 ? Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / l2)) : 0
    if (Math.hypot(p[0] - (ax + t * dx), p[1] - (ay + t * dy)) < clearance) return false
  }
  return true
}
