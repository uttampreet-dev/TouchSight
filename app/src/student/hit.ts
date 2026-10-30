import type { Tdm, TdmRegion, TdmLine, Point } from '../tdm/types'
import { area, pointInPolygon, segDist, centroid } from '../tdm/geometry'
import { diagramBox } from '../components/TdmCanvas'
import type { Position } from '../i18n'

export type Hit = { kind: 'region'; el: TdmRegion } | { kind: 'line'; el: TdmLine } | null

/** What is under a fingertip at a point in mm: a raised line wins over the region it crosses; the smallest region wins over the one around it. */
export function hitAt(tdm: Tdm, p: Point, fingerRadius = 1.6): Hit {
  for (const l of tdm.lines) {
    const reach = l.width / 2 + fingerRadius
    for (let i = 0; i < l.path.length - 1; i++) if (segDist(p, l.path[i], l.path[i + 1]) <= reach) return { kind: 'line', el: l }
  }
  const inside = tdm.regions.filter((r) => pointInPolygon(p, r.polygon)).sort((a, b) => area(a.polygon) - area(b.polygon))
  return inside.length ? { kind: 'region', el: inside[0] } : null
}

/** Where a part sits on the sheet, in words a listener can use: thirds of the diagram's box. */
export function positionOf(tdm: Tdm, id: string): Position {
  const box = diagramBox(tdm, 0)
  const el = tdm.regions.find((r) => r.id === id) ?? tdm.lines.find((l) => l.id === id)
  if (!el) return 'centre'
  const c = 'polygon' in el ? centroid(el.polygon) : midpoint(el.path)
  const fx = (c[0] - box.x) / box.w, fy = (c[1] - box.y) / box.h
  const col = fx < 1 / 3 ? 'left' : fx > 2 / 3 ? 'right' : ''
  const row = fy < 1 / 3 ? 'top' : fy > 2 / 3 ? 'bottom' : ''
  const key = [row, col].filter(Boolean).join(' ')
  return (key || 'centre') as Position
}

/** The direction from a point to a part, for a quiz hint. */
export function directionTo(tdm: Tdm, from: Point, id: string): 'up' | 'down' | 'left' | 'right' {
  const el = tdm.regions.find((r) => r.id === id) ?? tdm.lines.find((l) => l.id === id)
  const c = !el ? from : 'polygon' in el ? centroid(el.polygon) : midpoint(el.path)
  const dx = c[0] - from[0], dy = c[1] - from[1]
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'
}

function midpoint(path: Point[]): Point {
  const m = path[Math.floor(path.length / 2)]
  return [m[0], m[1]]
}

/** Parts that carry a real name: the quiz asks only for these. */
export const isNamed = (el: { name: { en: string } }) => !/^(Region|Line) \d+$/.test(el.name.en)
