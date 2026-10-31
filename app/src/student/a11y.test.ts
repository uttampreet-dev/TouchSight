import { describe, it, expect } from 'vitest'
import { GestureRecognizer } from './a11y'

const two = (x: number, y: number) => [{ x, y }, { x: x + 40, y }]
describe('gestures', () => {
  it('two-finger swipe left and right', () => {
    const g = new GestureRecognizer()
    g.start(two(200, 300), 0); g.move(two(100, 305)); expect(g.end(1, 200)).toBeNull(); expect(g.end(0, 210)).toBe('swipe-left')
    g.start(two(100, 300), 1000); g.move(two(220, 300)); g.end(1, 1200); expect(g.end(0, 1210)).toBe('swipe-right')
  })
  it('two-finger double tap says where am I, a single two-finger tap does not', () => {
    const g = new GestureRecognizer()
    g.start(two(100, 100), 0); g.end(1, 100); expect(g.end(0, 120)).toBeNull()
    g.start(two(100, 100), 300); g.end(1, 380); expect(g.end(0, 400)).toBe('double-tap-2')
  })
  it('three-finger tap changes language; a slow or moved three-finger touch does not', () => {
    const g = new GestureRecognizer()
    g.start([{ x: 1, y: 1 }, { x: 50, y: 1 }, { x: 100, y: 1 }], 0); g.end(2, 100); g.end(1, 110); expect(g.end(0, 120)).toBe('tap-3')
    g.start([{ x: 1, y: 1 }, { x: 50, y: 1 }, { x: 100, y: 1 }], 1000); g.end(2, 1800); g.end(1, 1810); expect(g.end(0, 1820)).toBeNull()
  })
  it('a vertical two-finger drag is not a swipe', () => {
    const g = new GestureRecognizer()
    g.start(two(100, 100), 0); g.move(two(110, 300)); g.end(1, 200); expect(g.end(0, 210)).toBeNull()
  })
})

import { matchCommand } from '../device/voice'
describe('spoken commands', () => {
  it('matches English, Hindi, Punjabi and romanised phrases', () => {
    expect(matchCommand('where am I')).toBe('where')
    expect(matchCommand('मैं कहाँ हूँ')).toBe('where')
    expect(matchCommand('main kahan hoon')).toBe('where')
    expect(matchCommand('what does it do')).toBe('explain')
    expect(matchCommand('ਕੁਇਜ਼ ਸ਼ੁਰੂ ਕਰੋ')).toBe('quiz')
    expect(matchCommand('switch to hindi')).toBe('lang-hi')
    expect(matchCommand('banana')).toBeNull()
  })
})
