import { describe, it, expect } from 'vitest'
import { answer } from './qa'
import heart from '../samples/sample-heart.tdm.json'
import type { Tdm } from '../tdm/types'
const H = heart as unknown as Tdm

describe('questions about the diagram', () => {
  it('which part does something, from the meanings', () => {
    expect(answer(H, 'which part pumps blood to the lungs', 'en', null)).toMatch(/^Right Ventricle/)
    expect(answer(H, 'which chamber pumps blood to the whole body', 'en', null)).toMatch(/^Left Ventricle/)
  })
  it('where and what a named part is', () => {
    expect(answer(H, 'where is the left atrium', 'en', null)).toMatch(/^Left Atrium\. (top|right|centre|left|bottom)/)
    expect(answer(H, 'what does the right atrium do', 'en', null)).toMatch(/^Right Atrium\. Receives/)
  })
  it('counts and relations', () => {
    expect(answer(H, 'how many parts are there', 'en', null)).toMatch(/^5 parts/)
    expect(answer(H, 'what does the left atrium flow into', 'en', null)).toMatch(/Flows into the Left Ventricle/)
  })
  it('the part under the finger, and a polite refusal', () => {
    expect(answer(H, 'what does this do', 'en', 'r-02')).toMatch(/^Right Ventricle/)
    expect(answer(H, 'what is the capital of France', 'en', null)).toMatch(/only know this diagram/)
  })
})
