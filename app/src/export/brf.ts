import type { Tdm, Lang } from '../tdm/types'
import { keyLayout, toBrf, uebGrade1 } from './braille'

/** Embosser-ready key: North American ASCII braille, 40 cells by 25 lines a page, a form feed between pages. */
export const BRF_COLS = 40
export const BRF_LINES = 25

export interface BrfFacts { lines: number; pages: number; cells: number; entries: number }

export function exportBrf(tdm: Tdm, opts: { lang?: Lang; braille?: Record<string, string> } = {}): { brf: string; facts: BrfFacts } {
  const key = keyLayout(tdm, opts.lang ?? 'en', opts.braille)
  const wrap = (s: string): string[] => {
    const out: string[] = []
    for (const word of s.split(' ')) {
      const last = out[out.length - 1]
      if (last != null && last.length + 1 + word.length <= BRF_COLS) out[out.length - 1] = `${last} ${word}`
      else out.push(word.slice(0, BRF_COLS))
    }
    return out
  }
  const lines: string[] = [...wrap(toBrf(uebGrade1(tdm.title))), '']
  for (const row of key.rows) lines.push(...wrap(`${toBrf(uebGrade1(row.ref))} ${toBrf(row.unicode)}`))
  const pages: string[] = []
  for (let i = 0; i < lines.length; i += BRF_LINES) pages.push(lines.slice(i, i + BRF_LINES).join('\r\n'))
  const brf = pages.join('\r\n\f') + '\r\n'
  return { brf, facts: { lines: lines.length, pages: pages.length, cells: lines.reduce((s, l) => s + l.replace(/ /g, '').length, 0), entries: key.rows.length } }
}
