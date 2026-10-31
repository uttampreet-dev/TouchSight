import { cleanText } from '../tdm-runtime/tdm.mjs'

const esc = (value) => cleanText(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
const n = (value) => Number(value.toFixed(3)).toString()
const pointPath = (points, close = false) => `${points.map(([x, y], i) => `${i ? 'L' : 'M'}${n(x)} ${n(y)}`).join(' ')}${close ? ' Z' : ''}`
const patternId = { dots: 'dots', 'diagonal-lines': 'diagonal', 'horizontal-lines': 'horizontal', grid: 'grid' }
const supportedPattern = new Set(Object.keys(patternId))

function shifted(points, distance) {
  return points.map((point, index) => {
    const before = points[Math.max(0, index - 1)], after = points[Math.min(points.length - 1, index + 1)]
    const dx = after[0] - before[0], dy = after[1] - before[1], length = Math.hypot(dx, dy) || 1
    return [point[0] - dy / length * distance, point[1] + dx / length * distance]
  })
}

function chevron(point, neighbor, atStart) {
  const [x, y] = point, dx = point[0] - neighbor[0], dy = point[1] - neighbor[1]
  const length = Math.hypot(dx, dy) || 1, ux = dx / length, uy = dy / length
  const direction = atStart ? -1 : 1, baseX = x - direction * ux * 3, baseY = y - direction * uy * 3
  const nx = -uy * 1.5, ny = ux * 1.5
  return `<polyline points="${n(baseX + nx)},${n(baseY + ny)} ${n(x)},${n(y)} ${n(baseX - nx)},${n(baseY - ny)}" fill="none" stroke="#000" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`
}

function brailleDots(value, x, y) {
  let result = ''
  const chars = [...(value ?? '')]
  for (const [index, char] of chars.entries()) {
    const code = char.codePointAt(0)
    if (code < 0x2800 || code > 0x28ff) continue
    const mask = code - 0x2800
    for (let bit = 0; bit < 6; bit++) if (mask & (1 << bit)) {
      const col = bit < 3 ? 0 : 1, row = bit % 3
      const cx = x + index * 6 + col * 2.5, cy = y + row * 2.5
      result += `<path d="M${n(cx - 0.75)} ${n(cy)}a0.75 0.75 0 1 0 1.5 0a0.75 0.75 0 1 0 -1.5 0" fill="#000"/>`
    }
  }
  return result
}

export function exportSvg(tdm, language = 'en') {
  if (tdm.sheet.w !== 210 || tdm.sheet.h !== 297) throw new Error('A4 SVG export requires a 210 x 297 mm TDM sheet')
  const maxY = Math.max(0, ...tdm.regions.flatMap((r) => r.polygon.map((p) => p[1])), ...tdm.lines.flatMap((l) => l.path.map((p) => p[1])))
  const keyTop = maxY + 8
  if (keyTop + tdm.key.length * 8 > 292) throw new Error('Braille key does not fit below the diagram on A4')
  const defs = `<defs>
    <pattern id="dots" width="2.2" height="2.2" patternUnits="userSpaceOnUse"><path d="M0.825 1.1a0.275 0.275 0 1 0 0.55 0a0.275 0.275 0 1 0 -0.55 0" fill="#000"/></pattern>
    <pattern id="diagonal" width="2.2" height="2.2" patternUnits="userSpaceOnUse"><path d="M-0.55 2.2L2.2-0.55M1.65 2.75L2.75 1.65" fill="none" stroke="#000" stroke-width="0.55"/></pattern>
    <pattern id="horizontal" width="2.2" height="2.2" patternUnits="userSpaceOnUse"><path d="M0 0.3H2.2" fill="none" stroke="#000" stroke-width="0.55"/></pattern>
    <pattern id="grid" width="2.8" height="2.8" patternUnits="userSpaceOnUse"><path d="M0 0H2.8M0 0V2.8" fill="none" stroke="#000" stroke-width="0.5"/></pattern>
  </defs>`
  const regions = tdm.regions.map((region) => {
    const fill = supportedPattern.has(region.texture) ? `url(#${patternId[region.texture]})` : region.texture === 'solid' ? '#000' : '#fff'
    return `<path id="${esc(region.id)}" d="${pointPath(region.polygon, true)}" fill="${fill}" stroke="#000" stroke-width="1.2" stroke-linejoin="round"/>`
  }).join('\n')
  const lines = tdm.lines.map((line) => {
    const paths = line.style === 'double' ? [-line.width * 0.8, line.width * 0.8].map((offset) => `<path d="${pointPath(shifted(line.path, offset))}" fill="none" stroke="#000" stroke-width="${n(line.width)}" stroke-linecap="round" stroke-linejoin="round"/>`).join('') : `<path d="${pointPath(line.path)}" fill="none" stroke="#000" stroke-width="${n(line.width)}" stroke-linecap="round" stroke-linejoin="round"${line.style === 'dashed' ? ' stroke-dasharray="3 2"' : ''}/>`
    const arrows = []
    if (line.arrow === 'start' || line.arrow === 'both') arrows.push(chevron(line.path[0], line.path[1], true))
    if (line.arrow === 'end' || line.arrow === 'both') arrows.push(chevron(line.path.at(-1), line.path.at(-2), false))
    return `<g id="${esc(line.id)}">${paths}${arrows.join('')}</g>`
  }).join('\n')
  const keyRows = tdm.key.map((entry, index) => {
    const y = keyTop + index * 8
    const text = entry.text[language] ?? entry.text.en
    const braille = entry.braille[language] ?? entry.braille.en ?? ''
    if (15 + [...braille].length * 6 > 205) throw new Error(`Braille key row ${entry.ref} exceeds printable A4 width`)
    return `<g><text x="15" y="${n(y)}" font-family="sans-serif" font-size="2.8" fill="#000">${esc(entry.ref)}. ${esc(text)}</text>${brailleDots(braille, 15, y + 2.5)}</g>`
  }).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297">
  ${defs}
  <path d="M0 0H210V297H0Z" fill="#fff"/>
  <g>${regions}</g>
  <g>${lines}</g>
  <g>${keyRows}</g>
</svg>
`
}