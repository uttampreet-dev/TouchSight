/** Unicode braille drawn as embossed dot cells: 2.5 mm dot pitch, 6 mm cell pitch, raised dots solid, the rest as faint guide marks. */
export function BrailleCells({ text, ink = '#17181a', guide = 'rgba(0,0,0,.12)', scale = 1, max = 14 }: { text: string; ink?: string; guide?: string; scale?: number; max?: number }) {
  const cells = Array.from(text).slice(0, max)
  const pitch = 6 * scale, dot = 2.5 * scale, r = 0.85 * scale
  const w = cells.length * pitch, h = 3 * dot
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ height: `${h}px`, width: `${w}px`, display: 'block' }} aria-label={text}>
      {cells.map((ch, i) => {
        const bits = ch.codePointAt(0)! - 0x2800
        return Array.from({ length: 6 }, (_, d) => {
          const col = d < 3 ? 0 : 1, row = d % 3
          const on = bits >= 0 && bits < 256 && (bits >> d) & 1
          return <circle key={`${i}-${d}`} cx={i * pitch + dot / 2 + col * dot} cy={dot / 2 + row * dot} r={on ? r : r * 0.45} fill={on ? ink : guide} data-on={on ? 1 : undefined} />
        })
      })}
    </svg>
  )
}
