import type { Tdm, Point, Lang } from '../tdm/types'
import { TEXTURE_PULSE, EDGE_PULSE, LINE_PULSE, enterPulse, type Pulse } from '../device/haptics'
import { hitAt, positionOf, type Hit } from './hit'
import { nameIn, t } from '../i18n'
import { meaningIn } from '../i18n/meanings'

/**
 * The haptic explorer as a pure step function: the finger position in sheet millimetres goes in, the actions the
 * phone should take come out. Nothing here touches the device, so it is tested without one.
 */

export const DWELL_MS = 320      // the finger rests this long in a part before its name is spoken
export const REPEAT_MS = 750     // while the finger keeps moving inside a part, its rhythm repeats at this interval
export const EXPLAIN_MS = 1500   // a finger that keeps resting after the name hears what the part does

export type Action =
  | { do: 'pulse'; pulse: Pulse }
  | { do: 'say'; text: string; after: number }
  | { do: 'explain'; text: string; after: number }
  | { do: 'hush' }
  | { do: 'focus'; id: string | null }

export interface ExploreState {
  id: string | null       // the element under the finger
  kind: 'region' | 'line' | null
  since: number           // when the finger entered it
  lastPulse: number
  down: boolean
}

export const createState = (): ExploreState => ({ id: null, kind: null, since: 0, lastPulse: 0, down: false })

const feelOf = (hit: NonNullable<Hit>): Pulse => (hit.kind === 'region' ? TEXTURE_PULSE[hit.el.texture] ?? 0 : LINE_PULSE)
const silent = (p: Pulse) => (typeof p === 'number' ? p === 0 : p.length === 0)

/** Finger at p (null = lifted) at time now. */
export function step(tdm: Tdm, st: ExploreState, p: Point | null, now: number, lang: Lang): Action[] {
  if (!p) {
    const out: Action[] = st.down ? [{ do: 'hush' }] : []
    st.id = null; st.kind = null; st.down = false
    return out
  }
  st.down = true
  const hit = hitAt(tdm, p)
  const id = hit?.el.id ?? null
  if (id === st.id) {
    if (hit && !silent(feelOf(hit)) && now - st.lastPulse >= REPEAT_MS) { st.lastPulse = now; return [{ do: 'pulse', pulse: feelOf(hit) }] }
    return []
  }
  // a boundary was crossed
  const out: Action[] = [{ do: 'hush' }]
  st.id = id; st.kind = hit?.kind ?? null; st.since = now; st.lastPulse = now
  if (hit) {
    out.push({ do: 'pulse', pulse: enterPulse(feelOf(hit)) }, { do: 'focus', id }, { do: 'say', text: nameIn(hit.el.name, lang), after: DWELL_MS })
    const m = hit.kind === 'region' ? meaningIn(hit.el, lang) : undefined
    if (m) out.push({ do: 'explain', text: m, after: DWELL_MS + EXPLAIN_MS })
  } else {
    out.push({ do: 'pulse', pulse: EDGE_PULSE }, { do: 'focus', id: null })
  }
  return out
}

/** The whole story of one element: its name, how it feels, where it sits, what it means and what it joins. */
export function describeFully(tdm: Tdm, id: string, lang: Lang): string {
  const s = t(lang)
  const r = tdm.regions.find((x) => x.id === id)
  const l = tdm.lines.find((x) => x.id === id)
  const el = r ?? l
  if (!el) return s.blank
  const stop = lang === 'en' ? '.' : '।'
  const parts: string[] = [nameIn(el.name, lang)]
  parts.push(r ? s.textures[r.texture] : s.line)
  parts.push(s.positions[positionOf(tdm, id)])
  const m = r ? meaningIn(r, lang) : undefined
  if (m) parts.push(m.replace(/[.।]\s*$/, ''))
  const find = (x: string) => tdm.regions.find((e) => e.id === x) ?? tdm.lines.find((e) => e.id === x)
  for (const rel of tdm.relations) {
    if (rel.from !== id && rel.to !== id) continue
    // the pair as the arrow runs: backward swaps the ends, both tells it from each side
    const pairs: [string, string][] = rel.direction === 'backward' ? [[rel.to, rel.from]] : rel.direction === 'both' ? [[rel.from, rel.to], [rel.to, rel.from]] : [[rel.from, rel.to]]
    for (const [src, dst] of pairs) {
      const other = find(src === id ? dst : src)
      if (!other) continue
      const n = nameIn(other.name, lang)
      let sentence: string | null
      if (src === id) sentence = rel.kind === 'flows-into' ? s.flowsInto(n) : rel.kind === 'part-of' ? s.partOf(n) : rel.kind === 'points-to' ? s.pointsTo(n) : rel.kind === 'contains' ? s.containsPart(n) : s.connectsTo(n)
      else sentence = rel.kind === 'flows-into' ? s.receivesFrom(n) : rel.kind === 'part-of' ? s.containsPart(n) : rel.kind === 'contains' ? s.partOf(n) : rel.kind === 'points-to' ? null : s.connectsTo(n)
      if (sentence) parts.push(sentence.replace(/[.।]\s*$/, ''))
    }
  }
  return parts.join(`${stop} `) + stop
}
