import type { Tdm, Point, Lang } from '../tdm/types'
import { TEXTURE_PULSE, EDGE_PULSE, LINE_PULSE, type Pulse } from '../device/haptics'
import { hitAt, positionOf, type Hit } from './hit'
import { nameIn, t } from '../i18n'

/**
 * The haptic explorer as a pure step function: the finger position in sheet millimetres goes in, the actions the
 * phone should take come out. Nothing here touches the device, so it is tested without one.
 */

export const DWELL_MS = 320      // the finger rests this long in a part before its name is spoken
export const REPEAT_MS = 450     // while the finger keeps moving inside a part, its feel repeats at this interval

export type Action =
  | { do: 'pulse'; pulse: Pulse }
  | { do: 'say'; text: string; after: number }
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

const feelOf = (hit: NonNullable<Hit>): Pulse => (hit.kind === 'region' ? TEXTURE_PULSE[hit.el.texture] || EDGE_PULSE : LINE_PULSE)

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
    if (hit && now - st.lastPulse >= REPEAT_MS) { st.lastPulse = now; return [{ do: 'pulse', pulse: feelOf(hit) }] }
    return []
  }
  // a boundary was crossed
  const out: Action[] = [{ do: 'hush' }]
  st.id = id; st.kind = hit?.kind ?? null; st.since = now; st.lastPulse = now
  if (hit) {
    out.push({ do: 'pulse', pulse: feelOf(hit) }, { do: 'focus', id }, { do: 'say', text: nameIn(hit.el.name, lang), after: DWELL_MS })
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
  if (r?.meaning) parts.push(r.meaning.replace(/[.।]\s*$/, ''))
  for (const rel of tdm.relations) {
    if (rel.from !== id) continue
    const target = tdm.regions.find((x) => x.id === rel.to) ?? tdm.lines.find((x) => x.id === rel.to)
    if (!target) continue
    const n = nameIn(target.name, lang)
    const sentence = rel.kind === 'flows-into' ? s.flowsInto(n) : rel.kind === 'part-of' ? s.partOf(n) : rel.kind === 'points-to' ? s.pointsTo(n) : s.connectsTo(n)
    parts.push(sentence.replace(/[.।]\s*$/, ''))
  }
  return parts.join(`${stop} `) + stop
}
