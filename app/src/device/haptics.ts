/** Vibration patterns. Android Chrome only; everything degrades to silence elsewhere. */

export const hapticsSupported = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

export type Pulse = number | number[]

/**
 * One rhythm per texture. A phone motor needs ~40 ms to spin up, so lengths differ by hundreds of milliseconds and
 * each texture has a different count of beats: a fingertip tells a stutter from a hum, not 18 ms from 45 ms.
 */
export const TEXTURE_PULSE: Record<string, Pulse> = {
  dots: [30, 70, 30, 70, 30, 70, 30],        // rapid stutter
  'diagonal-lines': [260],                   // one long hum
  'horizontal-lines': [90, 110, 90, 110, 90], // three even beats
  grid: [40, 60, 40, 60, 240],               // short, short, long
  solid: [450],                              // one heavy hum
  empty: 0,                                  // an outline: silent inside, only the edge ticks
}

const EDGE_MS = 35
export const EDGE_PULSE: Pulse = EDGE_MS // crossing a boundary
export const LINE_PULSE: Pulse = [60, 50, 60] // on a raised line
export const ENTER_GAP_MS = 90

/** Entering an element: the edge tick, a pause, then the element's own rhythm, as ONE pattern (a second vibrate() call would cancel the first). */
export function enterPulse(feel: Pulse): Pulse {
  const body = typeof feel === 'number' ? (feel ? [feel] : []) : feel
  return body.length ? [EDGE_MS, ENTER_GAP_MS, ...body] : EDGE_MS
}
export const CORRECT_PULSE: Pulse = [40, 60, 40, 60, 120]
export const WRONG_PULSE: Pulse = [200]

export function vibrate(p: Pulse) {
  if (!hapticsSupported()) return false
  try {
    return navigator.vibrate(p)
  } catch {
    return false
  }
}

export function stopVibration() {
  if (hapticsSupported()) navigator.vibrate(0)
}
