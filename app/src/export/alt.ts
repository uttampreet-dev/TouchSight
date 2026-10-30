import type { Tdm, Lang } from '../tdm/types'
import { t, nameIn } from '../i18n'
import { describeFully } from '../student/explore'

/** The alt-text paragraph: deterministic, from the title, the counts, the reading order, meanings and relations. */
export function altText(tdm: Tdm, lang: Lang = 'en'): string {
  const s = t(lang)
  const stop = lang === 'en' ? '.' : '।'
  const parts: string[] = [s.tourIntro(nameIn({ en: tdm.title }, lang), tdm.regions.length, tdm.lines.length)]
  for (const id of tdm.readingOrder) {
    const el = tdm.regions.find((r) => r.id === id) ?? tdm.lines.find((l) => l.id === id)
    if (!el) continue
    parts.push(`${el.keyRef}${lang === 'en' ? ', ' : '، '}${describeFully(tdm, id, lang)}`)
  }
  parts.push(s.endOfDiagram)
  return parts.map((p) => p.trim()).map((p) => (/[.।]$/.test(p) ? p : p + stop)).join(' ')
}
