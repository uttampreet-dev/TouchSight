import { describe, it, expect } from 'vitest'
import { associate, splitStacked, isNoise } from './associate'
import type { Label } from './ocr'
import type { RegionCandidate } from './segment'
import type { Segment } from './lines'

const box = (id: string, x: number, y: number, w: number, h: number): RegionCandidate => ({
  id, polygon: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], area: w * h, bbox: { x, y, w, h }, centroid: [x + w / 2, y + h / 2], meanColor: [0, 0, 0], method: 'enclosed',
})
const label = (id: string, text: string, x: number, y: number, w = 60, h = 14, confidence = 0.95): Label => ({ id, text, confidence, bbox: { x, y, w, h }, centre: [x + w / 2, y + h / 2] })

describe('Stage 1 — label to region association', () => {
  it('gives each region one label and each label one region, best fit first', () => {
    const regions = [box('a', 0, 0, 100, 100), box('b', 200, 0, 100, 100)]
    // two labels inside region a: the one nearer its centre names it, the other falls to the nearest free region
    const labels = [label('t0', 'Stomach', 20, 40), label('t1', 'Liver', 130, 60)]
    const out = associate(labels, regions, [], 1)
    expect(out.find((o) => o.labelId === 't0')).toMatchObject({ regionId: 'a', how: 'inside' })
    expect(out.find((o) => o.labelId === 't1')).toMatchObject({ regionId: 'b', how: 'nearest' })
  })
  it('follows a leader line into the part it points at, past the outline it crosses', () => {
    const outline = box('o', 0, 0, 400, 400)
    const parts = [box('p1', 50, 50, 100, 100), box('p2', 250, 250, 100, 100)]
    const lb = label('t0', 'Left atrium', 420, 90)
    const leader: Segment = { id: 's0', a: [418, 97], b: [160, 97], length: 258 }
    const out = associate([lb], [outline, ...parts], [leader], 1)
    expect(out[0]).toMatchObject({ regionId: 'p1', how: 'leader', leaderId: 's0' })
  })
  it('never names a part from a read that is not a word', () => {
    const regions = [box('a', 0, 0, 100, 100)]
    const out = associate([label('t0', 'we ts', 20, 40, 60, 14, 0.54)], regions, [], 1)
    expect(out[0]).toMatchObject({ regionId: null, how: 'none' })
    expect(isNoise(label('t1', 'Aorta', 0, 0, 60, 14, 0.53))).toBe(false)
  })
  it('splits a column of names where every line has a leader of its own, and keeps a wrapped name whole', () => {
    const lines = [{ text: 'Mouth', bbox: { x: 100, y: 100, w: 50, h: 14 } }, { text: 'Palate', bbox: { x: 100, y: 120, w: 50, h: 14 } }, { text: 'Uvula', bbox: { x: 100, y: 140, w: 50, h: 14 } }]
    const column: Label = { ...label('t0', 'Mouth Palate Uvula', 100, 100, 50, 54), lines }
    const leaders: Segment[] = lines.map((l, i) => ({ id: `s${i}`, a: [152, l.bbox.y + 7], b: [320, l.bbox.y + 40], length: 170 }))
    const split = splitStacked([column], leaders, 1)
    expect(split.map((l) => l.text)).toEqual(['Mouth', 'Palate', 'Uvula'])
    expect(split.map((l) => l.id)).toEqual(['t0a', 't0b', 't0c'])
    // the same block with one leader is one wrapped name
    expect(splitStacked([column], [leaders[1]], 1).map((l) => l.text)).toEqual(['Mouth Palate Uvula'])
  })
})
