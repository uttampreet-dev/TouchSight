import { describe, it, expect } from 'vitest'
import { glossaryMeaning, GLOSSARY_SIZE } from './meanings'
import { prefillMeanings, rename, setMeaning } from '../tdm/edit'
import heart from '../samples/sample-heart.tdm.json'
import type { Tdm } from '../tdm/types'

describe('glossary of what parts do', () => {
  it('matches exact and contained names, in three languages', () => {
    expect(glossaryMeaning('Right Atrium')?.en).toMatch(/deoxygenated blood/)
    expect(glossaryMeaning('right atrium')?.hi).toMatch(/आलिंद|निलय/)
    expect(glossaryMeaning('the Left Ventricle (chamber)')?.pa).toBeTruthy()
    expect(glossaryMeaning('Region 6')).toBeNull()
    expect(GLOSSARY_SIZE).toBeGreaterThan(50)
  })
  it('prefills unexplained regions, keeps the teacher\'s own words, follows a rename', () => {
    const t = JSON.parse(JSON.stringify(heart)) as Tdm
    for (const r of t.regions) { delete r.meaning; delete r.meanings; delete r.meaningSource }
    const { tdm, filled } = prefillMeanings(t)
    expect(filled).toBeGreaterThanOrEqual(4)
    const ra = tdm.regions.find((r) => r.name.en === 'Right Atrium')!
    expect(ra.meaningSource).toBe('glossary'); expect(ra.meanings?.hi).toBeTruthy()
    const own = setMeaning(tdm, ra.id, 'Top right chamber in this drawing.')
    expect(own.regions.find((r) => r.id === ra.id)!.meaningSource).toBe('teacher')
    expect(prefillMeanings(own).tdm.regions.find((r) => r.id === ra.id)!.meaning).toBe('Top right chamber in this drawing.')
    const renamed = rename(tdm, ra.id, 'en', 'Aorta')
    expect(renamed.regions.find((r) => r.id === ra.id)!.meaning).toMatch(/largest artery/)
  })
})
