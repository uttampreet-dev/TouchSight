import type { Tdm, Texture } from '../tdm/types'
import { centroid } from '../tdm/geometry'

/** The tactile model drawn as SVG in true millimetres. Shared by the console, the student app and the projector. */

export const TEXTURE_LABEL: Record<Texture, string> = {
  dots: 'dots', 'diagonal-lines': 'diagonal lines', 'horizontal-lines': 'horizontal lines', grid: 'grid', solid: 'solid', empty: 'empty',
}

function Patterns({ ink, scale }: { ink: string; scale: number }) {
  const s = 2.2 * scale
  return (
    <defs>
      <pattern id="tx-dots" width={s} height={s} patternUnits="userSpaceOnUse">
        <circle cx={s / 2} cy={s / 2} r={0.45 * scale} fill={ink} />
      </pattern>
      <pattern id="tx-diagonal-lines" width={s} height={s} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width={0.5 * scale} height={s} fill={ink} />
      </pattern>
      <pattern id="tx-horizontal-lines" width={s} height={s * 0.9} patternUnits="userSpaceOnUse">
        <rect width={s} height={0.5 * scale} fill={ink} />
      </pattern>
      <pattern id="tx-grid" width={s * 1.2} height={s * 1.2} patternUnits="userSpaceOnUse">
        <rect width={s * 1.2} height={0.45 * scale} fill={ink} />
        <rect width={0.45 * scale} height={s * 1.2} fill={ink} />
      </pattern>
      <marker id="arrow-end" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L6,3 L0,6 Z" fill={ink} />
      </marker>
      <marker id="rel-end" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto" markerUnits="userSpaceOnUse">
        <path d="M0,0 L5,2.5 L0,5 Z" fill="#3d7dd8" />
      </marker>
      <marker id="rel-start" markerWidth="5" markerHeight="5" refX="1" refY="2.5" orient="auto" markerUnits="userSpaceOnUse">
        <path d="M5,0 L0,2.5 L5,5 Z" fill="#3d7dd8" />
      </marker>
      <marker id="rel-end-detected" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto" markerUnits="userSpaceOnUse">
        <path d="M0,0 L5,2.5 L0,5 Z" fill="#ff6f59" />
      </marker>
      <marker id="rel-start-detected" markerWidth="5" markerHeight="5" refX="1" refY="2.5" orient="auto" markerUnits="userSpaceOnUse">
        <path d="M5,0 L0,2.5 L5,5 Z" fill="#ff6f59" />
      </marker>
    </defs>
  )
}

export interface TdmCanvasProps {
  tdm: Tdm
  /** ids drawn in the accent colour */
  highlight?: string[]
  selected?: string | null
  onSelect?: (id: string | null) => void
  showRefs?: boolean
  showKey?: boolean
  /** a point in mm to mark (the student's finger, a validator finding) */
  marker?: [number, number] | null
  ink?: string
  paper?: string
  accent?: string
  className?: string
  style?: React.CSSProperties
  /** full sheet or just the diagram's bounding box plus padding */
  frame?: 'sheet' | 'diagram'
  /** draw relations as dashed arrows between element centres (console only, never on tactile output) */
  showRelations?: boolean
}

export function diagramBox(tdm: Tdm, pad = 8) {
  const pts = [...tdm.regions.flatMap((r) => r.polygon), ...tdm.lines.flatMap((l) => l.path)]
  if (!pts.length) return { x: 0, y: 0, w: tdm.sheet.w, h: tdm.sheet.h }
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
  const x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad, x1 = Math.max(...xs) + pad, y1 = Math.max(...ys) + pad
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

export function TdmCanvas({ tdm, highlight = [], selected, onSelect, showRefs = true, showKey = false, marker, ink = '#17181a', paper = '#ffffff', accent = '#ff6f59', className, style, frame = 'diagram', showRelations = false }: TdmCanvasProps) {
  const box = frame === 'sheet' ? { x: 0, y: 0, w: tdm.sheet.w, h: tdm.sheet.h } : diagramBox(tdm)
  const keyRows = showKey ? Math.ceil(tdm.key.length / 2) : 0
  const vb = showKey && frame === 'diagram' ? { ...box, h: box.h + 10 + keyRows * 7 } : box
  const hl = highlight
  const stroke = (id: string) => (selected === id ? accent : hl.includes(id) ? accent : ink)
  const sw = (id: string) => (selected === id || hl.includes(id) ? 1.6 : 1.0)
  const keyTop = diagramBox(tdm, 0).y + diagramBox(tdm, 0).h + 10

  return (
    <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} className={className} style={{ width: '100%', height: '100%', display: 'block', ...style }} onClick={() => onSelect?.(null)}>
      <Patterns ink={ink} scale={1} />
      <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill={paper} />
      {tdm.regions.map((r) => {
        const d = r.polygon.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ') + ' Z'
        const c = centroid(r.polygon)
        return (
          <g key={r.id} onClick={(e) => { e.stopPropagation(); onSelect?.(r.id) }} style={{ cursor: onSelect ? 'pointer' : 'default' }}>
            <path d={d} fill={r.texture === 'empty' ? 'none' : r.texture === 'solid' ? ink : `url(#tx-${r.texture})`} fillOpacity={r.texture === 'solid' ? 0.85 : 1} stroke={stroke(r.id)} strokeWidth={sw(r.id)} strokeLinejoin="round" />
            {(selected === r.id || hl.includes(r.id)) && <path d={d} fill={accent} fillOpacity={0.18} stroke="none" />}
            {showRefs && (
              <g>
                <rect x={c[0] - 3.2} y={c[1] - 3.2} width={6.4} height={6.4} rx={1} fill={paper} stroke={stroke(r.id)} strokeWidth={0.5} />
                <text x={c[0]} y={c[1] + 1.9} fontSize={5} fontFamily="JetBrains Mono, monospace" fontWeight={700} textAnchor="middle" fill={ink}>{r.keyRef}</text>
              </g>
            )}
          </g>
        )
      })}
      {tdm.lines.map((l) => {
        const d = l.path.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ')
        const dash = l.style === 'dashed' ? '3 2' : undefined
        return (
          <g key={l.id} onClick={(e) => { e.stopPropagation(); onSelect?.(l.id) }} style={{ cursor: onSelect ? 'pointer' : 'default' }}>
            {l.style === 'double' && <path d={d} fill="none" stroke={paper} strokeWidth={l.width * 2.6} strokeLinecap="round" strokeLinejoin="round" />}
            <path d={d} fill="none" stroke={stroke(l.id)} strokeWidth={l.style === 'double' ? l.width * 3.4 : l.width} strokeDasharray={dash} strokeLinecap="round" strokeLinejoin="round" markerEnd={l.arrow === 'end' || l.arrow === 'both' ? 'url(#arrow-end)' : undefined} />
            {l.style === 'double' && <path d={d} fill="none" stroke={paper} strokeWidth={l.width * 1.4} strokeLinecap="round" strokeLinejoin="round" />}
            {showRefs && (
              <g>
                <rect x={l.path[0][0] - 3.2} y={l.path[0][1] - 3.2} width={6.4} height={6.4} rx={1} fill={paper} stroke={stroke(l.id)} strokeWidth={0.5} />
                <text x={l.path[0][0]} y={l.path[0][1] + 1.9} fontSize={5} fontFamily="JetBrains Mono, monospace" fontWeight={700} textAnchor="middle" fill={ink}>{l.keyRef}</text>
              </g>
            )}
          </g>
        )
      })}
      {showKey && tdm.key.map((k, i) => {
        const col = i % 2, row = Math.floor(i / 2)
        const x = box.x + 4 + col * (box.w / 2), y = keyTop + row * 7
        return (
          <g key={k.ref}>
            <text x={x} y={y + 4.5} fontSize={4.5} fontFamily="JetBrains Mono, monospace" fontWeight={700} fill={ink}>{k.ref}</text>
            <text x={x + 7} y={y + 4.5} fontSize={4.2} fontFamily="Inter, Arial, sans-serif" fill={ink}>{k.text.en}</text>
          </g>
        )
      })}
      {showRelations && tdm.relations.map((rel, i) => {
        const at = (id: string): [number, number] | null => { const r = tdm.regions.find((x) => x.id === id); if (r) return centroid(r.polygon); const l = tdm.lines.find((x) => x.id === id); return l ? l.path[Math.floor(l.path.length / 2)] : null }
        const a = at(rel.from), b = at(rel.to)
        if (!a || !b) return null
        const on = hl.includes(rel.from) && hl.includes(rel.to)
        const col = rel.source === 'detected' ? accent : '#3d7dd8'
        return (
          <g key={i} pointerEvents="none">
            <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={paper} strokeWidth={on ? 2.6 : 1.8} strokeOpacity={0.9} />
            <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={col} strokeWidth={on ? 1.1 : 0.7} strokeDasharray={rel.source === 'detected' ? '1.2 1.2' : '2.4 1.4'} markerEnd={rel.direction !== 'backward' ? `url(#rel-end${rel.source === 'detected' ? '-detected' : ''})` : undefined} markerStart={rel.direction !== 'forward' ? `url(#rel-start${rel.source === 'detected' ? '-detected' : ''})` : undefined} />
          </g>
        )
      })}
      {marker && (
        <g pointerEvents="none">
          <circle cx={marker[0]} cy={marker[1]} r={5} fill={accent} fillOpacity={0.25} stroke={accent} strokeWidth={0.8} />
          <circle cx={marker[0]} cy={marker[1]} r={1.2} fill={accent} />
        </g>
      )}
    </svg>
  )
}
