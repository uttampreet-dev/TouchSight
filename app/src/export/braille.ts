import type { Tdm, Lang, Point } from '../tdm/types'
import { diagramBox } from '../tdm/geometry'

/**
 * Braille geometry shared by every export: a Unicode braille string becomes dot masks, dot masks become dot
 * positions on a standard cell (2.5 mm dot pitch, 6 mm cell pitch, 10 mm line pitch), and the key is laid out
 * below the diagram the same way on paper, in plastic and on the embosser.
 */

export const DOT_PITCH = 2.5
export const CELL_PITCH = 6
export const ROW_PITCH = 10
export const KEY_GAP = 10

/** dots 1–6 as a 6-bit mask from a Unicode braille character (U+2800 + mask) */
export const maskOf = (ch: string): number => {
  const c = ch.codePointAt(0) ?? 0
  return c >= 0x2800 && c <= 0x28ff ? c - 0x2800 : -1
}

/** North American ASCII braille (BRF): one character per 6-dot mask, mask 0 = space */
const BRF = ' A1B\'K2L@CIF/MSP"E3H9O6R^DJG>NTQ,*5<-U8V.%[$+X!&;:4\\0Z7(_?W]#Y)='
export const toBrf = (unicode: string): string => [...unicode].map((ch) => { const m = maskOf(ch); return m < 0 ? (ch === ' ' ? ' ' : '') : BRF[m & 63] }).join('')

/** Uncontracted English (UEB grade 1) for when liblouis is not available: letters, digits, capital and number signs, basic punctuation. */
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'
const LETTER_MASK = [1, 3, 9, 25, 17, 11, 27, 19, 10, 26, 5, 7, 13, 29, 21, 15, 31, 23, 14, 30, 37, 39, 58, 45, 61, 53]
const PUNCT: Record<string, number> = { ' ': 0, ',': 2, '.': 50, '-': 36, "'": 4, ';': 6, ':': 18, '?': 38, '!': 22, '(': 55, ')': 62, '/': 12 }
export function uebGrade1(text: string): string {
  let out = ''
  let inNumber = false
  for (const ch of text) {
    const lower = ch.toLowerCase()
    const li = LETTERS.indexOf(lower)
    if (li >= 0) {
      inNumber = false
      if (ch !== lower) out += '⠠'
      out += String.fromCodePoint(0x2800 + LETTER_MASK[li])
    } else if (/[0-9]/.test(ch)) {
      if (!inNumber) { out += '⠼'; inNumber = true }
      out += String.fromCodePoint(0x2800 + LETTER_MASK[(+ch + 9) % 10]) // 1→a … 9→i, 0→j
    } else if (ch in PUNCT) {
      inNumber = false
      out += String.fromCodePoint(0x2800 + PUNCT[ch])
    }
  }
  return out
}

/** Dot centres for one cell at (x, y) = top-left dot position, mm */
export function dotPositions(x: number, y: number, mask: number): Point[] {
  const out: Point[] = []
  // dots 1,2,3 left column top→bottom; 4,5,6 right column
  for (let d = 0; d < 6; d++) if (mask & (1 << d)) out.push([x + (d >= 3 ? DOT_PITCH : 0), y + (d % 3) * DOT_PITCH])
  return out
}

export interface KeyRow { id: string; ref: string; name: string; unicode: string; cells: number[]; x: number; y: number; truncated: boolean }

export interface KeyLayout { rows: KeyRow[]; top: number; bottom: number; maxCells: number; columns: 1 | 2; fits: boolean; cells: number }

/**
 * The braille key below the diagram: one element per row (ref cell, blank cell, name) at the standard 10 mm line
 * pitch. One column when it fits above the bottom margin, otherwise two columns with names shortened to the
 * column; the validator's K1 uses this same layout, so paper, plastic and the rule can never disagree.
 */
export function keyLayout(tdm: Tdm, lang: Lang = 'en', braille?: Record<string, string>): KeyLayout {
  const box = diagramBox(tdm, 0)
  const top = box.y + box.h + KEY_GAP
  const left = tdm.sheet.margin
  const limit = tdm.sheet.h - tdm.sheet.margin
  const entries = tdm.readingOrder.map((id) => {
    const el = tdm.regions.find((r) => r.id === id) ?? tdm.lines.find((l) => l.id === id)
    if (!el) return null
    const name = el.name[lang] ?? el.name.en
    const uni = braille?.[id] ?? tdm.key.find((k) => k.regionId === id)?.braille?.[lang] ?? (lang === 'en' ? uebGrade1(name) : uebGrade1(el.name.en))
    return { id, ref: el.keyRef, name, unicode: uni, masks: [...uebGrade1(el.keyRef), '⠀', ...uni].map(maskOf).filter((m) => m >= 0) }
  }).filter((e): e is NonNullable<typeof e> => !!e)
  const build = (columns: 1 | 2): KeyLayout => {
    const colWidth = (tdm.sheet.w - 2 * tdm.sheet.margin) / columns
    const maxCells = Math.floor((colWidth - (columns === 2 ? 4 : 0)) / CELL_PITCH)
    const perCol = Math.ceil(entries.length / columns)
    const rows = entries.map((e, i) => ({ id: e.id, ref: e.ref, name: e.name, unicode: e.unicode, cells: e.masks.slice(0, maxCells), truncated: e.masks.length > maxCells, x: left + Math.floor(i / perCol) * colWidth, y: top + (i % perCol) * ROW_PITCH }))
    const bottom = top + perCol * ROW_PITCH
    return { rows, top, bottom, maxCells, columns, fits: bottom <= limit, cells: rows.reduce((s, r) => s + r.cells.length, 0) }
  }
  const one = build(1)
  return one.fits || entries.length < 2 ? one : build(2)
}
