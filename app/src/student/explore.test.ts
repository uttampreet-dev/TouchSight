import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseTdm } from '../tdm/io'
import { simplify } from '../tdm/simplify'
import { createState, step, describeFully, DWELL_MS, REPEAT_MS } from './explore'
import { hitAt, positionOf, directionTo, isNamed } from './hit'
import { nameIn } from '../i18n'
import { centroid } from '../tdm/geometry'
import { TEXTURE_PULSE, EDGE_PULSE, enterPulse } from '../device/haptics'

const heart = () => simplify(parseTdm(readFileSync(resolve(__dirname, '../../../examples/bio-heart-01.tdm.json'), 'utf8'))).tdm

describe('Stage 6 — finger to feedback', () => {
  it('finds the part under a fingertip and the blank paper beside it', () => {
    const tdm = heart()
    const r = tdm.regions[0]
    expect(hitAt(tdm, centroid(r.polygon))?.el.id).toBe(r.id)
    expect(hitAt(tdm, [tdm.sheet.margin + 1, tdm.sheet.margin + 1])).toBeNull()
  })
  it('entering a part plays the edge tick then its texture as one pattern and speaks its name after the dwell', () => {
    const tdm = heart()
    const r = tdm.regions[0]
    const st = createState()
    const acts = step(tdm, st, centroid(r.polygon), 1000, 'en')
    expect(acts.find((a) => a.do === 'pulse')).toEqual({ do: 'pulse', pulse: enterPulse(TEXTURE_PULSE[r.texture]) })
    expect(enterPulse(TEXTURE_PULSE.dots)).toEqual([EDGE_PULSE, 90, 30, 70, 30, 70, 30, 70, 30])
    expect(enterPulse(TEXTURE_PULSE.empty)).toBe(EDGE_PULSE)
    const say = acts.find((a) => a.do === 'say')
    expect(say && say.do === 'say' && say.text.startsWith(r.name.en)).toBe(true)
    expect(say && say.do === 'say' && say.after).toBe(DWELL_MS)
    // a second sample in the same spot a moment later: nothing new to say
    expect(step(tdm, st, centroid(r.polygon), 1050, 'en')).toEqual([])
    // moving on inside the part after the repeat interval: the texture is felt again, nothing is said
    const c = centroid(r.polygon)
    const again = step(tdm, st, [c[0] + 3, c[1]], 1000 + REPEAT_MS + 1, 'en')
    expect(again).toEqual([{ do: 'pulse', pulse: TEXTURE_PULSE[r.texture] }])
  })
  it('leaving onto blank paper gives the edge pulse and lifting the finger hushes', () => {
    const tdm = heart()
    const st = createState()
    step(tdm, st, centroid(tdm.regions[0].polygon), 0, 'en')
    const off = step(tdm, st, [tdm.sheet.margin + 1, tdm.sheet.margin + 1], 10, 'en')
    expect(off).toContainEqual({ do: 'pulse', pulse: EDGE_PULSE })
    expect(step(tdm, st, null, 20, 'en')).toContainEqual({ do: 'hush' })
    expect(st.id).toBeNull()
  })
  it('speaks the name in the chosen language with the glossary as fallback', () => {
    expect(nameIn({ en: 'Left ventricle' }, 'hi')).toBe('बायाँ निलय')
    expect(nameIn({ en: 'Left ventricle' }, 'pa')).toBe('ਖੱਬਾ ਨਿਲਯ')
    expect(nameIn({ en: 'Left ventricle', hi: 'शिक्षक का नाम' }, 'hi')).toBe('शिक्षक का नाम')
    expect(nameIn({ en: 'Zorblat' }, 'hi')).toBe('Zorblat')
  })
  it('speaks a relation from both ends, in all three languages', () => {
    const tdm = heart()
    const [a, b] = tdm.regions
    tdm.relations = [{ from: a.id, to: b.id, kind: 'flows-into', direction: 'forward' }]
    expect(describeFully(tdm, a.id, 'en')).toContain(`Flows into the ${b.name.en}`)
    expect(describeFully(tdm, b.id, 'en')).toContain(`Receives from the ${a.name.en}`)
    expect(describeFully(tdm, b.id, 'hi')).toContain('से प्राप्त करता है')
    expect(describeFully(tdm, b.id, 'pa')).toContain('ਤੋਂ ਪ੍ਰਾਪਤ ਕਰਦਾ ਹੈ')
    tdm.relations = [{ from: a.id, to: b.id, kind: 'flows-into', direction: 'backward' }]
    expect(describeFully(tdm, a.id, 'en')).toContain(`Receives from the ${b.name.en}`)
    tdm.relations = [{ from: a.id, to: b.id, kind: 'connects', direction: 'both' }]
    expect(describeFully(tdm, b.id, 'en')).toContain(`Connects to the ${a.name.en}`)
  })
  it('describes a part with its position and relations and points the quiz hint at it', () => {
    const tdm = heart()
    const named = tdm.regions.filter(isNamed)
    expect(named.length).toBeGreaterThan(0)
    const r = named[0]
    const text = describeFully(tdm, r.id, 'en')
    expect(text.startsWith(r.name.en)).toBe(true)
    expect(['top left', 'top', 'top right', 'left', 'centre', 'right', 'bottom left', 'bottom', 'bottom right']).toContain(positionOf(tdm, r.id))
    const c = centroid(r.polygon)
    expect(directionTo(tdm, [c[0] - 50, c[1]], r.id)).toBe('right')
    expect(directionTo(tdm, [c[0], c[1] + 50], r.id)).toBe('up')
  })
})
