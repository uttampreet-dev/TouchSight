import { describe, it, expect } from 'vitest'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseTdm } from '../tdm/io'
import { simplify } from '../tdm/simplify'
import { validate } from '../tdm/validate'
import { exportSvg, regionsFromSvg, exportStl, checkStl, altText, exportBrf, uebGrade1, toBrf, keyLayout } from './index'
import type { Tdm } from '../tdm/types'

const OUT = resolve(__dirname, '../../../benchmark/results/exports')
mkdirSync(OUT, { recursive: true })
const load = (p: string) => parseTdm(readFileSync(resolve(__dirname, p), 'utf8')) as Tdm
const models = (): [string, Tdm][] => [
  ['bio-heart-01', (() => { const { tdm } = simplify(load('../../../examples/bio-heart-01.tdm.json')); tdm.validation = validate(tdm); return tdm })()],
  ['sample-heart', load('../samples/sample-heart.tdm.json')],
  ['sample-plant-cell', load('../samples/sample-plant-cell.tdm.json')],
]

describe('Stage 8 — braille geometry', () => {
  it('transcribes uncontracted English and maps to ASCII braille', () => {
    expect(uebGrade1('Left atrium')).toBe('⠠⠇⠑⠋⠞ ⠁⠞⠗⠊⠥⠍'.replace(' ', '⠀'))
    expect(uebGrade1('Class 10')).toBe('⠠⠉⠇⠁⠎⠎⠀⠼⠁⠚')
    expect(toBrf('⠠⠇⠑⠋⠞⠀⠁⠞⠗⠊⠥⠍')).toBe(',LEFT ATRIUM')
  })
  it('lays the key out below the diagram inside the sheet', () => {
    for (const [, tdm] of models()) {
      const k = keyLayout(tdm)
      expect(k.rows).toHaveLength(tdm.readingOrder.length)
      expect(k.top).toBeGreaterThan(0)
      expect(k.fits, `${tdm.id} key fits`).toBe(true)
      for (const r of k.rows) expect(r.cells.length).toBeLessThanOrEqual(k.maxCells)
    }
  })
})

describe('Stage 8 — exports on the example and the shipped samples', () => {
  const rows: string[] = []
  it('tactile SVG is A4 in true millimetres and its outlines re-validate', () => {
    for (const [name, tdm] of models()) {
      const { svg, facts } = exportSvg(tdm)
      writeFileSync(resolve(OUT, `${name}.tactile.svg`), svg)
      expect(svg).toContain('width="210mm" height="297mm" viewBox="0 0 210 297"')
      expect(facts.regions).toBe(tdm.regions.length)
      expect(facts.cells).toBeGreaterThan(0)
      expect(svg).not.toMatch(/<text[^>]*fill="#000"/) // no raised text inside the figure
      const back = regionsFromSvg(svg)
      expect(back.map((r) => r.id)).toEqual(tdm.regions.map((r) => r.id))
      const rebuilt: Tdm = { ...tdm, regions: tdm.regions.map((r) => ({ ...r, polygon: back.find((b) => b.id === r.id)!.polygon })) }
      const v = validate(rebuilt)
      expect(v.blocking.filter((b) => ['S1', 'S2', 'S3', 'T1', 'M1'].includes(b.rule)).map((b) => `${b.rule}: ${b.msg}`), name).toEqual([])
      rows.push(`${name}: svg ${facts.keyEntries} key entries, ${facts.cells} cells, key fits ${facts.keyFits}`)
    }
  })
  it('STL relief: every shell closed, inside the sheet, with textures and braille domes', () => {
    for (const [name, tdm] of models()) {
      const { stl, facts } = exportStl(tdm)
      writeFileSync(resolve(OUT, `${name}.relief.stl`), Buffer.from(stl))
      const chk = checkStl(stl)
      expect(chk.triangles).toBe(facts.triangles)
      expect(chk.closed, `${name}: ${chk.openEdges} open, ${chk.overusedEdges} overused edges`).toBe(true)
      expect(chk.shells).toBe(facts.shells)
      expect(facts.textureFeatures).toBeGreaterThan(10)
      expect(facts.keyDomes).toBeGreaterThan(10)
      expect(chk.bbox.w).toBeLessThanOrEqual(210)
      expect(chk.bbox.h).toBeLessThanOrEqual(297)
      expect(chk.bbox.d).toBeCloseTo(3.0, 1)
      rows.push(`${name}: stl ${facts.triangles} triangles, ${facts.shells} shells, ${facts.bbox.w}×${facts.bbox.h}×${facts.bbox.d} mm, ${facts.textureFeatures} texture features, ${facts.keyDomes} domes`)
    }
  })
  it('alt-text reads in all three languages and names every element in order', () => {
    for (const [name, tdm] of models()) {
      for (const lang of ['en', 'hi', 'pa'] as const) {
        const text = altText(tdm, lang)
        expect(text.length).toBeGreaterThan(40)
        for (const id of tdm.readingOrder) { const el = tdm.regions.find((r) => r.id === id) ?? tdm.lines.find((l) => l.id === id)!; expect(text).toContain(`${el.keyRef}${lang === 'en' ? ',' : '،'}`) }
        if (lang === 'en') writeFileSync(resolve(OUT, `${name}.alt.txt`), text)
      }
      const en = altText(tdm, 'en')
      expect(en.startsWith(tdm.title)).toBe(true)
      rows.push(`${name}: alt ${en.split(/\s+/).length} words — "${en.slice(0, 90)}…"`)
    }
  })
  it('BRF key is 40 cells wide, paged at 25 lines, ASCII only', () => {
    for (const [name, tdm] of models()) {
      const { brf, facts } = exportBrf(tdm)
      writeFileSync(resolve(OUT, `${name}.key.brf`), brf)
      for (const line of brf.split(/\r\n|\f/)) expect(line.length).toBeLessThanOrEqual(40)
      expect(/^[\x20-\x7e\r\n\f]*$/.test(brf)).toBe(true)
      expect(facts.entries).toBe(tdm.readingOrder.length)
      expect(facts.pages).toBeGreaterThanOrEqual(1)
      rows.push(`${name}: brf ${facts.entries} entries, ${facts.lines} lines, ${facts.pages} page(s), ${facts.cells} cells`)
    }
    console.log('\n' + rows.join('\n'))
  })
})
