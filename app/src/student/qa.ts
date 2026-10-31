import type { Tdm, Lang, TdmRegion } from '../tdm/types'
import { nameIn, t } from '../i18n'
import { meaningIn } from '../i18n/meanings'
import { positionOf } from './hit'
import { describeFully } from './explore'
import { centroid } from '../tdm/geometry'

/**
 * Questions about the diagram under the fingers, answered from the model itself: what a part does, where it is,
 * which part does something, how many parts, what flows where, what is next to what. Deterministic: every answer
 * is a fact the teacher published, never a guess.
 */

const STOP = new Set(['the', 'a', 'an', 'is', 'are', 'what', 'which', 'part', 'does', 'do', 'of', 'to', 'in', 'this', 'that', 'it', 'and', 'or', 'from', 'into', 'where', 'how', 'many', 'tell', 'me', 'about', 'please', 'can', 'you', 'on', 'diagram', 'one', 'who', 'क्या', 'है', 'का', 'की', 'के', 'में', 'से', 'को', 'कौन', 'सा', 'कहाँ', 'ਕੀ', 'ਹੈ', 'ਦਾ', 'ਦੀ', 'ਦੇ', 'ਵਿੱਚ', 'ਤੋਂ', 'ਨੂੰ', 'ਕਿਹੜਾ', 'ਕਿੱਥੇ', 'hai', 'ka', 'ki', 'ke', 'kya', 'kaun', 'kahan', 'kitne', 'yeh', 'ye'])
const words = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w && !STOP.has(w))

function findPart(tdm: Tdm, q: string, lang: Lang): TdmRegion | null {
  const ql = q.toLowerCase()
  let best: { r: TdmRegion; len: number } | null = null
  for (const r of tdm.regions) for (const n of new Set([r.name.en, nameIn(r.name, lang), r.name.hi ?? '', r.name.pa ?? ''])) {
    const nl = n.toLowerCase().trim()
    if (nl.length >= 3 && ql.includes(nl) && (!best || nl.length > best.len)) best = { r, len: nl.length }
  }
  return best?.r ?? null
}

/** The part whose meaning shares the most words with the question. */
function partByMeaning(tdm: Tdm, q: string, lang: Lang): { r: TdmRegion; score: number } | null {
  const qw = new Set(words(q))
  let best: { r: TdmRegion; score: number } | null = null
  for (const r of tdm.regions) {
    const m = `${meaningIn(r, lang) ?? ''} ${r.meaning ?? ''}`
    const mw = new Set(words(m))
    let score = 0
    for (const w of qw) for (const v of mw) if (v === w || (w.length > 4 && v.startsWith(w.slice(0, -1))) || (v.length > 4 && w.startsWith(v.slice(0, -1)))) { score++; break }
    if (score && (!best || score > best.score)) best = { r, score }
  }
  return best
}

const neighbours = (tdm: Tdm, r: TdmRegion, n = 2) => {
  const c = centroid(r.polygon)
  return tdm.regions.filter((x) => x.id !== r.id && x.texture !== 'empty').map((x) => ({ x, d: Math.hypot(...((p) => [p[0] - c[0], p[1] - c[1]])(centroid(x.polygon)) as [number, number]) })).sort((a, b) => a.d - b.d).slice(0, n).map((o) => o.x)
}

export function answer(tdm: Tdm, question: string, lang: Lang, focusId: string | null): string {
  const s = t(lang)
  const q = question.toLowerCase()
  const stop = lang === 'en' ? '.' : '।'
  const name = (r: { name: TdmRegion['name'] }) => nameIn(r.name, lang)
  const asksCount = /how many|count|kitne|कितने|ਕਿੰਨੇ/.test(q)
  const asksWhere = /where is|where's|kahan hai|कहाँ है|ਕਿੱਥੇ ਹੈ/.test(q)
  const asksDo = /what does|what do|function|purpose|kya karta|kya karti|क्या करता|क्या करती|ਕੀ ਕਰਦਾ|ਕੀ ਕਰਦੀ/.test(q)
  const asksFlow = /flow|connect|join|next to|near|beside|neighbou?r|bahta|जुड़|बहता|पास|ਜੁੜ|ਵਗਦਾ|ਨੇੜੇ/.test(q)
  const asksTitle = /what is this diagram|which diagram|what diagram|title|yeh kya hai|यह क्या है|ਇਹ ਕੀ ਹੈ/.test(q)
  const named = findPart(tdm, q, lang)

  if (asksTitle && !named) return s.tourIntro(nameIn({ en: tdm.title }, lang), tdm.regions.length, tdm.lines.length)
  if (asksCount) return `${s.parts(tdm.regions.length)}${stop} ${tdm.regions.map(name).join(', ')}${stop}`
  if (named) {
    if (asksWhere) return `${name(named)}${stop} ${s.positions[positionOf(tdm, named.id)]}${stop}`
    if (asksFlow) {
      const rels = tdm.relations.filter((x) => x.from === named.id || x.to === named.id)
      if (rels.length) return describeFully(tdm, named.id, lang)
      const nb = neighbours(tdm, named)
      return nb.length ? `${name(named)}${stop} ${lang === 'en' ? 'Next to' : lang === 'hi' ? 'पास में' : 'ਨੇੜੇ'} ${nb.map(name).join(lang === 'en' ? ' and ' : lang === 'hi' ? ' और ' : ' ਅਤੇ ')}${stop}` : name(named) + stop
    }
    const m = meaningIn(named, lang)
    if (asksDo || m) return `${name(named)}${stop} ${m ?? s.positions[positionOf(tdm, named.id)]}${stop}`
    return describeFully(tdm, named.id, lang)
  }
  // no part named: find the part whose job matches the words ("which part pumps blood to the lungs")
  const byMeaning = partByMeaning(tdm, q, lang)
  if (byMeaning && byMeaning.score >= 1) return `${name(byMeaning.r)}${stop} ${meaningIn(byMeaning.r, lang) ?? ''}`.trim()
  // "what does it do" about the part under the finger
  if ((asksDo || /this|yeh|यह|ਇਹ/.test(q)) && focusId) { const r = tdm.regions.find((x) => x.id === focusId); if (r) return `${name(r)}${stop} ${meaningIn(r, lang) ?? s.positions[positionOf(tdm, r.id)]}${stop}` }
  return s.dontKnow
}
