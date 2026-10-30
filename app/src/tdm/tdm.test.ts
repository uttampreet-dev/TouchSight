import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseTdm, serializeTdm, cloneTdm } from './io'
import { simplify, RULES } from './simplify'
import { validate } from './validate'
import { area, boundaryDistance } from './geometry'
import { confirmRelation, removeRelation, addRelation, setRelation } from './edit'
import type { Tdm } from './types'

const EXAMPLE = resolve(__dirname, '../../../examples/bio-heart-01.tdm.json')
const RESULTS = resolve(__dirname, '../../../benchmark/results')

const loadExample = () => parseTdm(readFileSync(EXAMPLE, 'utf8'))

describe('Stage 2 — Tactile Diagram Model', () => {
  it('round-trips the example without change', () => {
    const a = loadExample()
    const b = parseTdm(serializeTdm(a))
    expect(b).toEqual(a)
    expect(serializeTdm(b)).toBe(serializeTdm(a))
  })
  it('rejects a document with a dangling relation', () => {
    const t = cloneTdm(loadExample())
    t.relations.push({ from: 'r-lv', to: 'nope', kind: 'connects', direction: 'forward' })
    expect(() => parseTdm(serializeTdm(t))).toThrow(/unknown id/)
  })
})

describe('Stage 3 — Simplify', () => {
  it('separates two touching regions to the minimum gap and gives them different textures', () => {
    const t = cloneTdm(loadExample())
    // two squares sharing an edge
    t.regions = [
      { ...t.regions[0], id: 'a', polygon: [[40, 60], [80, 60], [80, 100], [40, 100]], texture: 'dots' },
      { ...t.regions[1], id: 'b', polygon: [[80, 60], [120, 60], [120, 100], [80, 100]], texture: 'dots' },
    ]
    t.lines = []; t.relations = []; t.readingOrder = ['a', 'b']
    const { tdm, report } = simplify(t)
    expect(tdm.regions).toHaveLength(2)
    const gap = boundaryDistance(tdm.regions[0].polygon, tdm.regions[1].polygon)
    expect(gap).toBeGreaterThanOrEqual(RULES.minGap - 0.05)
    expect(tdm.regions[0].texture).not.toBe(tdm.regions[1].texture)
    expect(report.minGapBefore).toBe(0)
    expect(report.minGapAfter).toBeGreaterThanOrEqual(RULES.minGap - 0.05)
  })
  it('drops slivers and near-duplicate outlines', () => {
    const t = cloneTdm(loadExample())
    const big = t.regions[0]
    t.regions = [
      big,
      { ...big, id: 'dup', polygon: big.polygon.map(([x, y]) => [x + 0.3, y + 0.3]) },
      { ...t.regions[1], id: 'sliver', polygon: [[150, 150], [154, 150], [154, 152], [150, 152]] },
    ]
    t.lines = []; t.relations = []; t.readingOrder = t.regions.map((r) => r.id)
    const { tdm, report } = simplify(t)
    expect(tdm.regions.map((r) => r.id)).toEqual([big.id])
    expect(report.dropped.map((d) => d.id).sort()).toEqual(['dup', 'sliver'])
  })
  it('produces a reading order with every element exactly once and a key entry per element', () => {
    const { tdm } = simplify(loadExample())
    const ids = [...tdm.regions.map((r) => r.id), ...tdm.lines.map((l) => l.id)].sort()
    expect([...tdm.readingOrder].sort()).toEqual(ids)
    expect(tdm.key.map((k) => k.regionId).sort()).toEqual(ids)
    expect(new Set(tdm.key.map((k) => k.ref)).size).toBe(ids.length)
  })
  it('keeps every region at or above the minimum area and within the sheet', () => {
    const { tdm } = simplify(loadExample())
    for (const r of tdm.regions) expect(area(r.polygon)).toBeGreaterThanOrEqual(RULES.minRegionArea)
    const m = tdm.sheet.margin
    for (const r of tdm.regions) for (const [x, y] of r.polygon) { expect(x).toBeGreaterThanOrEqual(m - 0.01); expect(y).toBeGreaterThanOrEqual(m - 0.01); expect(x).toBeLessThanOrEqual(tdm.sheet.w - m + 0.01) }
  })
})

describe('Stage 4 — Validator', () => {
  it('passes the simplified example', () => {
    const { tdm } = simplify(loadExample())
    const v = validate(tdm)
    expect(v.blocking.map((b) => `${b.rule}: ${b.msg}`)).toEqual([])
    expect(v.status).toBe('pass')
  })
  it('names the rule for each deliberate defect', () => {
    const t = cloneTdm(loadExample())
    const { tdm } = simplify(t)
    const broken = cloneTdm(tdm)
    // S1: move region b to 1 mm from a
    const [a, b] = broken.regions
    const dx = a.polygon[1][0] + 1.0 - b.polygon[0][0]
    b.polygon = b.polygon.map(([x, y]) => [x + dx, y])
    // T1: same texture as its neighbour
    b.texture = a.texture
    // S3: a hairline
    broken.lines[0].width = 0.5
    // R1: dangling relation
    broken.relations.push({ from: 'ghost', to: a.id, kind: 'connects', direction: 'forward' })
    // R2: duplicate in reading order
    broken.readingOrder.push(a.id)
    const v = validate(broken)
    const rules = new Set(v.blocking.map((x) => x.rule))
    for (const r of ['S1', 'T1', 'S3', 'R1', 'R2']) expect(rules, `expected ${r}`).toContain(r)
    expect(v.status).toBe('fail')
    const s1 = v.blocking.find((x) => x.rule === 'S1')!
    expect(s1.ids).toEqual(expect.arrayContaining([a.id, b.id]))
    expect(s1.at).toBeDefined()
  })
  it('R3 blocks a detected relation until the teacher confirms, removes or edits it', () => {
    const { tdm } = simplify(loadExample())
    const [a, b] = tdm.regions
    tdm.relations = [{ from: a.id, to: b.id, kind: 'connects', direction: 'forward', confidence: 0.8, source: 'detected', via: tdm.lines[0]?.id }]
    const v = validate(tdm)
    expect(v.status).toBe('fail')
    const r3 = v.blocking.find((x) => x.rule === 'R3')!
    expect(r3.msg).toContain('Detected:')
    expect(r3.msg).toContain(a.name.en)
    expect(r3.ids).toEqual([a.id, b.id])
    expect(confirmRelation(tdm, 0).validation.blocking.map((x) => x.rule)).not.toContain('R3')
    expect(confirmRelation(tdm, 0).relations[0].source).toBe('teacher')
    expect(removeRelation(tdm, 0).relations).toHaveLength(0)
    expect(setRelation(tdm, 0, { kind: 'flows-into' }).validation.blocking.map((x) => x.rule)).not.toContain('R3')
    const drawn = addRelation(tdm, b.id, a.id, 'flows-into', 'backward')
    expect(drawn.relations).toHaveLength(1) // replaces the detected pair
    expect(drawn.relations[0]).toMatchObject({ from: b.id, to: a.id, kind: 'flows-into', direction: 'backward', source: 'teacher' })
    expect(drawn.validation.blocking.map((x) => x.rule)).not.toContain('R3')
  })
  it('flags low-confidence and unnamed elements as advisory only', () => {
    const { tdm } = simplify(loadExample())
    tdm.regions[0].sourceLabel = { text: 'x', ocrConfidence: 0.5 }
    tdm.regions[1].name = { en: 'Region 7' }
    const v = validate(tdm)
    expect(v.status).toBe('pass')
    expect(v.advisory.map((x) => x.rule).sort()).toEqual(['N1', 'O1'])
  })
})

describe('Stage 3+4 on real drafts from the understand stage', () => {
  const drafts = existsSync(RESULTS) ? readdirSync(RESULTS).filter((f) => f.endsWith('.draft.tdm.json')) : []
  it.skipIf(!drafts.length)('every draft simplifies to a model the validator passes on geometry rules', () => {
    const rows: string[] = []
    for (const f of drafts) {
      const draft = parseTdm(readFileSync(resolve(RESULTS, f), 'utf8')) as Tdm
      const t0 = performance.now()
      const { tdm, report } = simplify(draft)
      const v = validate(tdm)
      const ms = Math.round(performance.now() - t0)
      const geomBlocking = v.blocking.filter((b) => ['S1', 'S2', 'S3', 'T1', 'M1', 'R1', 'R2'].includes(b.rule))
      rows.push(`    relations proposed: ${draft.relations.length}${draft.relations.length ? ' → ' + draft.relations.map((r) => `${r.from}-${r.to}@${r.confidence}`).join(' ') : ''}; R3 findings ${v.blocking.filter((b) => b.rule === 'R3').length}`)
      for (const d of report.dropped) rows.push(`    dropped ${d.id}: ${d.why}`)
      for (const m of report.merged) rows.push(`    merged ${m.absorbed} into ${m.kept}`)
      rows.push(`${f.replace('.draft.tdm.json', '')}: regions ${report.regionsIn}→${report.regionsOut}, lines ${report.linesIn}→${report.linesOut}, gap ${report.minGapBefore}→${report.minGapAfter} mm, passes ${report.separationPasses}, textures ${report.textures}, scale ${report.scaledBy}, ${ms} ms, blocking ${v.blocking.length} (${v.blocking.map((b) => b.rule).join(',')}), advisory ${v.advisory.length}`)
      expect(geomBlocking.map((b) => `${b.rule}: ${b.msg}`), f).toEqual([])
    }
    console.log('\n' + rows.join('\n'))
  })
})
