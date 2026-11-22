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

export type StageMessage = StageEvent & { t: number; src: 'student' | 'stage'; stage?: string | null }

export const CHANNEL = 'touchsight-stage'
const STAGE_KEY = 'touchsight-stage-code'
/**
 * Which projector this phone mirrors to: the code from the projector's own QR for this session, else the class room it
 * has joined. With neither there is no projector to reach over the network, and the phone mirrors only to a tab on
 * this device. Two rooms, or two visitors, never see each other's fingers.
 */
export function stageCode(): string | null {
  try { return sessionStorage.getItem(STAGE_KEY) || (JSON.parse(localStorage.getItem('touchsight-student') || 'null')?.room ?? null) } catch { return null }
}
export function setStageCode(code: string) { try { sessionStorage.setItem(STAGE_KEY, code) } catch { /* private mode */ } }
/** The relay lives on the app's own origin (serve.mjs), or wherever VITE_RELAY_URL points when the static app is hosted apart from it. */
export const relayUrl = () => (import.meta.env.VITE_RELAY_URL as string | undefined) || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/relay`

class Mirror {
  private bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null
  private ws: WebSocket | null = null
  private tdm: Tdm | null = null
  private backoff = 1000
  private code: string | null = null
  private enabled = typeof WebSocket !== 'undefined' && typeof location !== 'undefined'
  state: 'off' | 'connecting' | 'open' = 'off'

  constructor() {
    if (this.bc) this.bc.onmessage = (e: MessageEvent<StageMessage>) => this.onIncoming(e.data, 'local')
  }

  private onIncoming(m: StageMessage, via: 'local' | 'relay') {
    if (m.type === 'ping' && m.src === 'stage') {
      const pong: StageMessage = { type: 'pong', t0: m.t0, from: m.from, t: Date.now(), src: 'student' }
      if (via === 'local') this.bc?.postMessage(pong)
      else this.ws?.readyState === 1 && this.ws.send(JSON.stringify({ ...pong, stage: this.code }))
    }
  }

  connect() {
    if (!this.enabled || this.ws) return
    const code = stageCode()
    if (!code) return
    this.code = code
    this.state = 'connecting'
    try {
      const ws = new WebSocket(relayUrl())
      this.ws = ws
      ws.onopen = () => { this.state = 'open'; this.backoff = 1000; ws.send(JSON.stringify({ type: 'stage-join', stage: code, src: 'student' })); if (this.tdm) ws.send(JSON.stringify({ type: 'hello', tdm: this.tdm, t: Date.now(), src: 'student', stage: code })) }
      ws.onmessage = (e) => { try { this.onIncoming(JSON.parse(e.data), 'relay') } catch { /* not ours */ } }
      ws.onclose = () => { if (this.ws === ws) this.ws = null; this.state = 'off'; setTimeout(() => this.connect(), this.backoff); this.backoff = Math.min(10_000, this.backoff * 2) }
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
    // the phone joined a room, or was given a projector's code, after it connected: move to that projector
    if (this.ws && this.code !== stageCode()) { try { this.ws.close() } catch { /* already closed */ } this.ws = null }
    if (this.ws?.readyState === 1) this.ws.send(JSON.stringify({ ...m, stage: this.code }))
    else this.connect()
  }
}

export const mirror = new Mirror()
