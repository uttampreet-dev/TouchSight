import type { Lang, LocalText } from '../tdm/types'
import { glossaryName } from './glossary'
import { STRINGS } from './strings'

export { STRINGS, LANG_NAME } from './strings'
export type { Position } from './strings'

/** A part's name in the student's language: teacher-entered first, then the glossary, then English. */
export function nameIn(name: LocalText, lang: Lang): string {
  return name[lang] || glossaryName(name.en, lang) || name.en
}

export const t = (lang: Lang) => STRINGS[lang]

const KEY = 'touchsight.lang'
export function loadLang(): Lang {
  try { const v = localStorage.getItem(KEY); if (v === 'hi' || v === 'pa' || v === 'en') return v } catch { /* private mode */ }
  return 'en'
}
export function storeLang(l: Lang) {
  try { localStorage.setItem(KEY, l) } catch { /* private mode */ }
}
