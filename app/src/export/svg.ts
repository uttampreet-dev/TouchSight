import type { Tdm, Lang, Point } from '../tdm/types'
import { keyLayout, dotPositions, CELL_PITCH } from './braille'

/**
 * Tactile SVG for swell paper: true A4 millimetres, black raises, grey does not. Regions carry mm-scale
 * textures, outlines are 1.2 mm, the braille key is real dot cells below the diagram. No text inside the figure.
 */

export interface SvgFacts { widthMm: number; heightMm: number; regions: number; lines: number; keyEntries: number; cells: number; keyFits: boolean; truncatedKeyRows: number }

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const pathOf = (pts: Point[], close: boolean) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ') + (close ? ' Z' : '')

export const OUTLINE_MM = 1.2
export const TEXTURE_PITCH_MM = 2.2

export function exportSvg(tdm: Tdm, opts: { lang?: Lang; braille?: Record<string, string>; printText?: boolean } = {}): { svg: string; facts: SvgFacts } {
  const lang = opts.lang ?? 'en'
  const key = keyLayout(tdm, lang, opts.braille)
  const { w, h } = tdm.sheet
  const p = TEXTURE_PITCH_MM
  const defs = `
  <defs>
    <pattern id="dots" width="${p}" height="${p}" patternUnits="userSpaceOnUse"><circle cx="${p / 2}" cy="${p / 2}" r="0.55" fill="#000"/></pattern>
    <pattern id="diagonal-lines" width="${p}" height="${p}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="0.6" height="${p}" fill="#000"/></pattern>
    <pattern id="horizontal-lines" width="${p}" height="${p}" patternUnits="userSpaceOnUse"><rect width="${p}" height="0.6" fill="#000"/></pattern>
    <pattern id="grid" width="${p * 1.2}" height="${p * 1.2}" patternUnits="userSpaceOnUse"><rect width="${p * 1.2}" height="0.5" fill="#000"/><rect width="0.5" height="${p * 1.2}" fill="#000"/></pattern>
    <marker id="chevron" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L4,2 L0,4" fill="none" stroke="#000" stroke-width="1.2" stroke-linecap="round"/></marker>
  </defs>`
  const regions = tdm.regions.map((r) => {
    const fill = r.texture === 'empty' ? 'none' : r.texture === 'solid' ? '#000' : `url(#${r.texture})`
    return `  <path id="${esc(r.id)}" data-name="${esc(r.name.en)}" d="${pathOf(r.polygon, true)}" fill="${fill}" stroke="#000" stroke-width="${OUTLINE_MM}" stroke-linejoin="round"/>`
  })
  const lines = tdm.lines.map((l) => {
    const d = pathOf(l.path, false)
    const dash = l.style === 'dashed' ? ' stroke-dasharray="3 2"' : ''
    const ends = `${l.arrow === 'end' || l.arrow === 'both' ? ' marker-end="url(#chevron)"' : ''}${l.arrow === 'start' || l.arrow === 'both' ? ' marker-start="url(#chevron)"' : ''}`
    if (l.style === 'double') {
      const wide = l.width * 3.4, gap = l.width * 1.4
      return `  <g id="${esc(l.id)}" data-name="${esc(l.name.en)}"><path d="${d}" fill="none" stroke="#000" stroke-width="${wide.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"${ends}/><path d="${d}" fill="none" stroke="#fff" stroke-width="${gap.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/></g>`
    }
    return `  <path id="${esc(l.id)}" data-name="${esc(l.name.en)}" d="${d}" fill="none" stroke="#000" stroke-width="${l.width}" stroke-linecap="round" stroke-linejoin="round"${dash}${ends}/>`
  })
  const keyRows = key.rows.map((row) => {
    const dots = row.cells.flatMap((mask, ci) => dotPositions(row.x + ci * CELL_PITCH, row.y, mask)).map(([x, y]) => `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="0.75" fill="#000"/>`).join('')
    const print = opts.printText === false ? '' : `<text x="${row.x.toFixed(2)}" y="${(row.y + 8.2).toFixed(2)}" font-family="Inter, Arial, sans-serif" font-size="2.6" fill="#8a8a8a">${esc(row.ref)}  ${esc(row.name)}</text>`
    return `  <g class="key-row" data-id="${esc(row.id)}">${dots}${print}</g>`
  })
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}" data-tdm="${esc(tdm.id)}" data-title="${esc(tdm.title)}">
  <!-- Tactile graphic for swell paper. Black raises; grey print labels do not. Units are millimetres. -->
  <title>${esc(tdm.title)}</title>${defs}
  <rect width="${w}" height="${h}" fill="#fff"/>
  <g id="regions">
${regions.join('\n')}
  </g>
  <g id="lines">
${lines.join('\n')}
  </g>
  <g id="key" data-top="${key.top.toFixed(1)}" data-rows="${key.rows.length}">
${keyRows.join('\n')}
  </g>
</svg>
`
  return { svg, facts: { widthMm: w, heightMm: h, regions: tdm.regions.length, lines: tdm.lines.length, keyEntries: key.rows.length, cells: key.cells, keyFits: key.fits, truncatedKeyRows: key.rows.filter((r) => r.truncated).length } }
}

/** Read the region outlines back out of an exported SVG (the geometry the validator checks). */
export function regionsFromSvg(svg: string): { id: string; polygon: Point[] }[] {
  const out: { id: string; polygon: Point[] }[] = []
  const re = /<path id="([^"]+)" data-name="[^"]*" d="([^"]+)" fill="(?:none|#000|url\(#[a-z-]+\))" stroke="#000" stroke-width="1.2"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(svg))) {
    const pts = [...m[2].matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((x) => [+x[1], +x[2]] as Point)
    out.push({ id: m[1], polygon: pts })
  }
  return out
}
