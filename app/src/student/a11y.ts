import { useCallback, useEffect, useRef, useState } from 'react'
import type { Lang } from '../tdm/types'
import { speak } from '../device/speech'
import { vibrate } from '../device/haptics'

/**
 * How a blind student drives the app without seeing it.
 *  - touch-to-hear: the first touch on any control speaks what it is; the second touch, within a few seconds, acts.
 *  - gestures on a diagram: two-finger swipe changes mode, two-finger double-tap says where the finger is,
 *    three-finger tap changes language. Nothing has to be found on the screen.
 *  - a spoken introduction the first time the app opens, replayable from the help button.
 */

const SPEAK_FIRST_KEY = 'touchsight-speak-first'
const INTRO_KEY = 'touchsight-intro-seen'
export const ARM_MS = 4000
let lastPointer = 'mouse'
if (typeof document !== 'undefined') document.addEventListener('pointerdown', (e) => { lastPointer = e.pointerType || 'mouse' }, true)
/** what kind of pointer made the last touch; a mouse is a sighted user and acts at once */
export const lastPointerType = () => lastPointer

export function speakFirstEnabled(): boolean { try { return localStorage.getItem(SPEAK_FIRST_KEY) !== 'off' } catch { return true } }
export function setSpeakFirst(on: boolean) { try { localStorage.setItem(SPEAK_FIRST_KEY, on ? 'on' : 'off') } catch { /* ignore */ } }
const CONTRAST_KEY = 'touchsight-contrast'
export function contrastEnabled(): boolean { try { return localStorage.getItem(CONTRAST_KEY) === 'on' } catch { return false } }
export function setContrast(on: boolean) { try { localStorage.setItem(CONTRAST_KEY, on ? 'on' : 'off') } catch { /* ignore */ } document.documentElement.classList.toggle('hc', on) }
if (typeof document !== 'undefined' && contrastEnabled()) document.documentElement.classList.add('hc')
export function introSeen(): boolean { try { return localStorage.getItem(INTRO_KEY) === '1' } catch { return true } }
export function markIntroSeen() { try { localStorage.setItem(INTRO_KEY, '1') } catch { /* ignore */ } }

/** Touch once to hear, touch again to act. Returns the handler factory and which control is armed. */
export function useTouchToAct(lang: Lang) {
  const [armed, setArmed] = useState<string | null>(null)
  const at = useRef(0)
  const timer = useRef<number | null>(null)
  const on = speakFirstEnabled()
  const handle = useCallback((id: string, label: string, act: () => void) => (e: React.SyntheticEvent) => {
    if (!on || lastPointer === 'mouse') { act(); return }
    const now = Date.now()
    if (armed === id && now - at.current < ARM_MS) { setArmed(null); act(); return }
    e.preventDefault()
    setArmed(id); at.current = now
    vibrate(25); speak(label, lang)
    if (timer.current) clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setArmed((a) => (a === id ? null : a)), ARM_MS)
  }, [armed, lang, on])
  return { handle, armed, on }
}

export type Gesture = 'swipe-left' | 'swipe-right' | 'double-tap-2' | 'tap-3' | 'hold-2'

/** Pure recogniser for multi-finger gestures, so it can be tested without a touchscreen. */
export class GestureRecognizer {
  private startX = 0; private startY = 0; private startN = 0; private startT = 0; moved = false
  private lastTwoTap = -1e9
  /** fingers currently down, read by the explorer to pause single-finger reading during a gesture */
  fingers = 0
  start(touches: { x: number; y: number }[], now: number) {
    this.fingers = touches.length
    if (touches.length >= 2 && this.startN < 2) { this.startN = touches.length; this.startX = avg(touches, 'x'); this.startY = avg(touches, 'y'); this.startT = now; this.moved = false }
    else if (touches.length > this.startN) this.startN = touches.length
  }
  move(touches: { x: number; y: number }[]) {
    if (this.startN >= 2 && touches.length >= 2) { const dx = avg(touches, 'x') - this.startX, dy = avg(touches, 'y') - this.startY; if (Math.hypot(dx, dy) > 18) this.moved = true; this.lastDx = dx; this.lastDy = dy }
  }
  private lastDx = 0; private lastDy = 0
  /** called when a finger lifts; returns a gesture when the last finger of a multi-finger touch leaves */
  end(remaining: number, now: number): Gesture | null {
    this.fingers = remaining
    if (remaining > 0 || this.startN < 2) { if (remaining === 0) this.startN = 0; return null }
    const n = this.startN; this.startN = 0
    const quick = now - this.startT < 600
    if (n >= 3 && !this.moved && quick) return 'tap-3'
    if (n === 2 && this.moved && Math.abs(this.lastDx) > 60 && Math.abs(this.lastDx) > Math.abs(this.lastDy) * 1.3) return this.lastDx < 0 ? 'swipe-left' : 'swipe-right'
    if (n === 2 && !this.moved && quick) { if (now - this.lastTwoTap < 450) { this.lastTwoTap = 0; return 'double-tap-2' } this.lastTwoTap = now }
    return null
  }
}
const avg = (ts: { x: number; y: number }[], k: 'x' | 'y') => ts.reduce((a, t) => a + t[k], 0) / ts.length

/** Binds the recogniser to an element's touch events. */
export function useGestures(ref: React.RefObject<HTMLElement | null>, on: (g: Gesture) => void, ready = true) {
  const rec = useRef(new GestureRecognizer())
  const cb = useRef(on); cb.current = on
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const pts = (e: TouchEvent) => Array.from(e.touches, (t) => ({ x: t.clientX, y: t.clientY }))
    const start = (e: TouchEvent) => { rec.current.start(pts(e), performance.now()); if (e.touches.length >= 2) e.preventDefault() }
    const move = (e: TouchEvent) => { rec.current.move(pts(e)); if (e.touches.length >= 2) e.preventDefault() }
    const end = (e: TouchEvent) => { const g = rec.current.end(e.touches.length, performance.now()); if (g) cb.current(g) }
    // two fingers held still for a moment: listen for a spoken command
    let hold: number | null = null
    const clearHold = () => { if (hold) { clearTimeout(hold); hold = null } }
    const start2 = (e: TouchEvent) => { start(e); clearHold(); if (e.touches.length === 2) hold = window.setTimeout(() => { hold = null; cb.current('hold-2') }, 700) }
    const move2 = (e: TouchEvent) => { move(e); if (rec.current['moved']) clearHold() }
    const end2 = (e: TouchEvent) => { clearHold(); end(e) }
    el.addEventListener('touchstart', start2, { passive: false }); el.addEventListener('touchmove', move2, { passive: false }); el.addEventListener('touchend', end2); el.addEventListener('touchcancel', end2)
    return () => { clearHold(); el.removeEventListener('touchstart', start2); el.removeEventListener('touchmove', move2); el.removeEventListener('touchend', end2); el.removeEventListener('touchcancel', end2) }
  }, [ref, ready])
  return rec
}
