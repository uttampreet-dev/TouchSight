/** Vibration patterns. Android Chrome only; everything degrades to silence elsewhere. */

export const hapticsSupported = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

export type Pulse = number | number[]

/** One distinct pattern per texture so a fingertip can tell regions apart without looking. */
export const TEXTURE_PULSE: Record<string, Pulse> = {
  dots: [18, 40, 18],
  'diagonal-lines': 45,
  'horizontal-lines': [30, 30, 30, 30, 30],
  grid: [60, 25, 20],
  solid: 90,
  empty: 0,
}

export const EDGE_PULSE: Pulse = 22 // crossing a boundary
export const LINE_PULSE: Pulse = [35, 20, 35] // on a raised line
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
