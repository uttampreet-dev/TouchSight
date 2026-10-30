import type { Tdm, Point } from '../tdm/types'

/**
 * The projector link. Every student event goes two ways at once: a BroadcastChannel for a stage tab on the same
 * device, and the WebSocket relay on the app's own origin for the laptop at the jury table. The relay carries the
 * whole diagram first, so the projector can draw one it has never stored.
 */

export type StageEvent =
  | { type: 'hello'; tdm: Tdm }
  | { type: 'finger'; p: Point | null; id: string | null }
  | { type: 'focus'; id: string | null }
  | { type: 'say'; text: string }
  | { type: 'mode'; mode: string }
  | { type: 'quiz'; target: string | null; result?: 'correct' | 'wrong'; hitId?: string | null }
  | { type: 'ping'; t0: number; from: string }
  | { type: 'pong'; t0: number; from: string }

export type StageMessage = StageEvent & { t: number; src: 'student' | 'stage' }

export const CHANNEL = 'touchsight-stage'
export const relayUrl = () => `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/relay`

class Mirror {
  private bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null
  private ws: WebSocket | null = null
  private tdm: Tdm | null = null
  private backoff = 1000
  private enabled = typeof WebSocket !== 'undefined' && typeof location !== 'undefined'
  state: 'off' | 'connecting' | 'open' = 'off'

  constructor() {
    if (this.bc) this.bc.onmessage = (e: MessageEvent<StageMessage>) => this.onIncoming(e.data, 'local')
  }

  private onIncoming(m: StageMessage, via: 'local' | 'relay') {
    if (m.type === 'ping' && m.src === 'stage') {
      const pong: StageMessage = { type: 'pong', t0: m.t0, from: m.from, t: Date.now(), src: 'student' }
      if (via === 'local') this.bc?.postMessage(pong)
      else this.ws?.readyState === 1 && this.ws.send(JSON.stringify(pong))
    }
  }

  connect() {
    if (!this.enabled || this.ws) return
    this.state = 'connecting'
    try {
      const ws = new WebSocket(relayUrl())
      this.ws = ws
      ws.onopen = () => { this.state = 'open'; this.backoff = 1000; if (this.tdm) ws.send(JSON.stringify({ type: 'hello', tdm: this.tdm, t: Date.now(), src: 'student' })) }
      ws.onmessage = (e) => { try { this.onIncoming(JSON.parse(e.data), 'relay') } catch { /* not ours */ } }
      ws.onclose = () => { this.ws = null; this.state = 'off'; setTimeout(() => this.connect(), this.backoff); this.backoff = Math.min(10_000, this.backoff * 2) }
      ws.onerror = () => ws.close()
    } catch { this.ws = null; this.state = 'off' }
  }

  hello(tdm: Tdm) {
    this.tdm = tdm
    this.post({ type: 'hello', tdm })
    this.connect()
  }

  post(ev: StageEvent) {
    const m: StageMessage = { ...ev, t: Date.now(), src: 'student' }
    try { this.bc?.postMessage(m) } catch { /* a diagram too big for the channel is still sent over the relay */ }
    if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(m))
    else this.connect()
  }
}

export const mirror = new Mirror()
