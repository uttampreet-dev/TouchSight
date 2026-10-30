import type { Texture } from '../tdm/types'

/**
 * Sonification: a second tactile channel that works on every phone, including the ones with no vibration motor.
 * While a finger rests on a part, a quiet tone plays: its pitch follows the finger's height on the sheet (higher up,
 * higher note), its timbre is the part's texture (dots sing, diagonal lines buzz, horizontal lines hum, a grid
 * chimes), and it pans left to right with the finger. Crossing a boundary clicks. Blank paper is silent.
 */

const KEY = 'touchsight-sound'
export const soundEnabled = () => { try { return localStorage.getItem(KEY) !== 'off' } catch { return true } }
export const setSoundEnabled = (on: boolean) => { try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch { /* ignore */ } }

const VOICE: Record<Texture, { type: OscillatorType; cutoff: number; level: number }> = {
  dots: { type: 'sine', cutoff: 4000, level: 0.16 },
  'diagonal-lines': { type: 'sawtooth', cutoff: 900, level: 0.10 },
  'horizontal-lines': { type: 'square', cutoff: 500, level: 0.08 },
  grid: { type: 'triangle', cutoff: 3000, level: 0.14 },
  solid: { type: 'sine', cutoff: 300, level: 0.18 },
  empty: { type: 'sine', cutoff: 1200, level: 0.05 },
}
const LINE = { type: 'triangle' as OscillatorType, cutoff: 1800, level: 0.12 }
const F_LOW = 196, F_HIGH = 784 // G3 → G5 across the sheet's height

export type SoundState = { on: boolean; freq: number; type: OscillatorType | null; pan: number; level: number; ticks: number }

class Sound {
  private ctx: AudioContext | null = null
  private osc: OscillatorNode | null = null
  private filter: BiquadFilterNode | null = null
  private gain: GainNode | null = null
  private pan: StereoPannerNode | null = null
  private ducked = 1
  state: SoundState = { on: soundEnabled(), freq: 0, type: null, pan: 0, level: 0, ticks: 0 }

  private ensure() {
    if (!this.state.on || typeof AudioContext === 'undefined') return null
    if (!this.ctx) {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator(), filter = ctx.createBiquadFilter(), gain = ctx.createGain(), pan = ctx.createStereoPanner()
      filter.type = 'lowpass'; gain.gain.value = 0
      osc.connect(filter).connect(gain).connect(pan).connect(ctx.destination)
      osc.start()
      this.ctx = ctx; this.osc = osc; this.filter = filter; this.gain = gain; this.pan = pan
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {})
    return this.ctx
  }

  /** finger over a part: x and y in 0..1 across the diagram, the part's texture, or a raised line */
  move(x01: number, y01: number, texture: Texture | null, line = false) {
    const ctx = this.ensure()
    if (!ctx || !this.osc || !this.gain || !this.filter || !this.pan) return
    const now = ctx.currentTime
    if (texture === null && !line) { this.gain.gain.setTargetAtTime(0, now, 0.03); this.state.level = 0; return }
    const v = line ? LINE : VOICE[texture!]
    const freq = F_LOW * Math.pow(F_HIGH / F_LOW, Math.min(1, Math.max(0, 1 - y01)))
    if (this.osc.type !== v.type) this.osc.type = v.type
    this.osc.frequency.setTargetAtTime(freq, now, 0.02)
    this.filter.frequency.setTargetAtTime(v.cutoff, now, 0.05)
    this.pan.pan.setTargetAtTime(Math.min(1, Math.max(-1, x01 * 2 - 1)), now, 0.03)
    this.gain.gain.setTargetAtTime(v.level * this.ducked, now, 0.04)
    Object.assign(this.state, { freq: Math.round(freq), type: v.type, pan: +(x01 * 2 - 1).toFixed(2), level: v.level })
    this.expose()
  }

  /** a boundary: a short click, independent of the tone */
  tick() {
    const ctx = this.ensure()
    if (!ctx) return
    const len = Math.round(ctx.sampleRate * 0.012)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const src = ctx.createBufferSource(), g = ctx.createGain()
    g.gain.value = 0.25
    src.buffer = buf; src.connect(g).connect(ctx.destination); src.start()
    this.state.ticks++
    this.expose()
  }

  lift() { if (this.ctx && this.gain) { this.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04); this.state.level = 0; this.expose() } }

  /** quieter while the voice speaks */
  duck(ms: number) { this.ducked = 0.3; if (this.ctx && this.gain && this.state.level) this.gain.gain.setTargetAtTime(this.state.level * 0.3, this.ctx.currentTime, 0.03); setTimeout(() => { this.ducked = 1 }, ms) }

  setOn(on: boolean) { setSoundEnabled(on); this.state.on = on; if (!on) this.lift(); this.expose() }

  private expose() { (window as unknown as { __tsSound?: SoundState }).__tsSound = { ...this.state } }
}

export const sound = new Sound()
