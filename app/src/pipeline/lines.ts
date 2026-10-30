import { loadCv } from './cv'
import type { Px } from './segment'

export interface Segment {
  id: string
  a: Px
  b: Px
  length: number
}

/** Straight strokes in the ink mask: leader lines to labels, wires, vessels, axes. */
export async function detectSegments(ink: Uint8Array, width: number, height: number, labelBoxes: { x: number; y: number; w: number; h: number }[]): Promise<Segment[]> {
  const cv = await loadCv()
  const mat = cv.matFromArray(height, width, cv.CV_8UC1, Array.from(ink))
  // remove text pixels so letters do not become line fragments
  for (const b of labelBoxes) {
    const pad = 3
    cv.rectangle(mat, new cv.Point(Math.max(0, b.x - pad), Math.max(0, b.y - pad)), new cv.Point(Math.min(width - 1, b.x + b.w + pad), Math.min(height - 1, b.y + b.h + pad)), new cv.Scalar(0), -1)
  }
  // dotted and dashed leaders become continuous strokes
  const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(5, 5))
  cv.dilate(mat, mat, kernel)
  kernel.delete()
  const lines = new cv.Mat()
  const minLen = Math.max(18, Math.round(Math.min(width, height) * 0.03))
  cv.HoughLinesP(mat, lines, 1, Math.PI / 180, 28, minLen, 14)
  // OpenCV.js returns the segments as a 1×N, 4-channel Mat: count from the data, not from rows
  const n = lines.data32S.length / 4
  let out: Segment[] = []
  for (let i = 0; i < n; i++) {
    const [x1, y1, x2, y2] = [lines.data32S[i * 4], lines.data32S[i * 4 + 1], lines.data32S[i * 4 + 2], lines.data32S[i * 4 + 3]]
    out.push({ id: `s${i}`, a: [x1, y1], b: [x2, y2], length: Math.hypot(x2 - x1, y2 - y1) })
  }
  mat.delete(); lines.delete()
  out = dedupe(out.sort((p, q) => q.length - p.length)).slice(0, 400)
  return mergeCollinear(out)
}

/** Thick strokes yield stacks of near-identical parallels; keep the longest of each stack. */
function dedupe(segs: Segment[]): Segment[] {
  const kept: Segment[] = []
  const close = (p: Px, q: Px) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 7
  for (const s of segs) {
    if (kept.some((k) => (close(k.a, s.a) && close(k.b, s.b)) || (close(k.a, s.b) && close(k.b, s.a)))) continue
    kept.push(s)
  }
  return kept
}

/** Join fragments that continue each other (same direction, ends within a few px). */
function mergeCollinear(segs: Segment[]): Segment[] {
  const used = new Set<number>()
  const out: Segment[] = []
  const ang = (s: Segment) => Math.atan2(s.b[1] - s.a[1], s.b[0] - s.a[0])
  for (let i = 0; i < segs.length; i++) {
    if (used.has(i)) continue
    let cur = segs[i]
    used.add(i)
    let grew = true
    while (grew) {
      grew = false
      for (let j = 0; j < segs.length; j++) {
        if (used.has(j)) continue
        const o = segs[j]
        const da = Math.abs(Math.atan2(Math.sin(ang(cur) - ang(o)), Math.cos(ang(cur) - ang(o))))
        if (da > 0.12 && Math.abs(da - Math.PI) > 0.12) continue
        const ends: [Px, Px][] = [[cur.b, o.a], [cur.b, o.b], [cur.a, o.a], [cur.a, o.b]]
        const k = ends.findIndex(([p, q]) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 8)
        if (k < 0) continue
        const far = k < 2 ? (k === 0 ? o.b : o.a) : (k === 2 ? o.b : o.a)
        cur = k < 2 ? { ...cur, b: far } : { ...cur, a: far }
        cur.length = Math.hypot(cur.b[0] - cur.a[0], cur.b[1] - cur.a[1])
        used.add(j)
        grew = true
      }
    }
    out.push({ ...cur, id: `s${out.length}` })
  }
  return out
}
