import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Brand } from '../components/Brand'
import { TdmCanvas } from '../components/TdmCanvas'
import type { Tdm, Point } from '../tdm/types'
import { CHANNEL, relayUrl, type StageMessage } from '../student/mirror'
import './stage.css'

/**
 * The projector: what the student's finger is doing, large enough for a room. Listens to the relay on this
 * origin and to a BroadcastChannel from a student tab on this machine; the first source to speak owns the session.
 */

type LogRow = { t: number; type: string; text: string }
const TRAIL_MS = 1500
const FLASH_MS = 450

declare global { interface Window { __sg?: { events: number; lastSay: string; rtts: number[]; source: string | null; target: string | null } } }

export function Stage() {
  const [tdm, setTdm] = useState<Tdm | null>(null)
  const [source, setSource] = useState<'relay' | 'local' | null>(null)
  const [finger, setFinger] = useState<Point | null>(null)
  const [fingerId, setFingerId] = useState<string | null>(null)
  const [focus, setFocus] = useState<string | null>(null)
  const [mode, setMode] = useState('explore')
  const [caption, setCaption] = useState('')
  const [target, setTarget] = useState<string | null>(null)
  const [verdict, setVerdict] = useState<'correct' | 'wrong' | null>(null)
  const [log, setLog] = useState<LogRow[]>([])
  const [rtts, setRtts] = useState<number[]>([])
  const [qr, setQr] = useState<string>('')
  const [, setTick] = useState(0)
  const trail = useRef<{ p: Point; t: number }[]>([])
  const flash = useRef<{ id: string; t: number } | null>(null)
  const sourceRef = useRef<'relay' | 'local' | null>(null)
  const events = useRef(0)
  const ws = useRef<WebSocket | null>(null)
  const bc = useRef<BroadcastChannel | null>(null)
  const me = useRef(Math.random().toString(36).slice(2, 8))

  useEffect(() => { QRCode.toDataURL(location.href, { margin: 1, width: 220, color: { dark: '#0c2b2d', light: '#ffffff' } }).then(setQr).catch(() => {}) }, [])

  useEffect(() => {
    const nameOf = (t: Tdm | null, id: string | null) => (id && t ? t.regions.find((r) => r.id === id)?.name.en ?? t.lines.find((l) => l.id === id)?.name.en ?? id : '')
    let current: Tdm | null = null
    const push = (type: string, text: string, t: number) => setLog((l) => [{ t, type, text }, ...l].slice(0, 16))
    const handle = (m: StageMessage, via: 'relay' | 'local') => {
      if (m.src !== 'student') return
      if (!sourceRef.current) { sourceRef.current = via; setSource(via) }
      if (sourceRef.current !== via) return
      events.current++
      const now = Date.now()
      switch (m.type) {
        case 'hello': current = m.tdm; setTdm(m.tdm); trail.current = []; setFinger(null); setTarget(null); push('hello', m.tdm.title, m.t); break
        case 'finger':
          setFinger(m.p)
          if (m.p) trail.current = [...trail.current.filter((x) => now - x.t < TRAIL_MS), { p: m.p, t: now }]
          if (m.id !== fingerIdRef.current) { fingerIdRef.current = m.id; if (m.id) { flash.current = { id: m.id, t: now }; push('cross', nameOf(current, m.id), m.t) } }
          setFingerId(m.id)
          break
        case 'focus': setFocus(m.id); break
        case 'say': setCaption(m.text); push('say', m.text, m.t); break
        case 'mode': setMode(m.mode); push('mode', m.mode, m.t); if (m.mode !== 'quiz') { setTarget(null); setVerdict(null) } break
        case 'quiz':
          if (m.result) { setVerdict(m.result); push('quiz', `${m.result}: ${nameOf(current, m.hitId ?? null)}`, m.t); setTimeout(() => setVerdict(null), 900) }
          else { setTarget(m.target); setVerdict(null); if (m.target) push('quiz', `find ${nameOf(current, m.target)}`, m.t) }
          break
        case 'pong': if (m.from === me.current) setRtts((r) => [...r, now - m.t0].slice(-10)); break
      }
    }
    const fingerIdRef = { current: null as string | null }
    try { bc.current = new BroadcastChannel(CHANNEL); bc.current.onmessage = (e: MessageEvent<StageMessage>) => handle(e.data, 'local') } catch { bc.current = null }
    let closed = false, backoff = 1000
    const connect = () => {
      if (closed) return
      try {
        const s = new WebSocket(relayUrl())
        ws.current = s
        s.onopen = () => { backoff = 1000 }
        s.onmessage = (e) => { try { handle(JSON.parse(e.data), 'relay') } catch { /* ignore */ } }
        s.onclose = () => { ws.current = null; if (!closed) { setTimeout(connect, backoff); backoff = Math.min(10_000, backoff * 2) } }
        s.onerror = () => s.close()
      } catch { /* no relay here */ }
    }
    connect()
    // round trip to the phone, independent of the two clocks
    const ping = setInterval(() => {
      const m: StageMessage = { type: 'ping', t0: Date.now(), from: me.current, t: Date.now(), src: 'stage' }
      if (sourceRef.current === 'local') bc.current?.postMessage(m)
      else if (ws.current?.readyState === 1) ws.current.send(JSON.stringify(m))
    }, 2000)
    let raf = 0
    const loop = () => { setTick((x) => x + 1); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => { closed = true; clearInterval(ping); cancelAnimationFrame(raf); ws.current?.close(); bc.current?.close() }
  }, [])

  const now = Date.now()
  const trailPts = trail.current.filter((x) => now - x.t < TRAIL_MS)
  const flashId = flash.current && now - flash.current.t < FLASH_MS ? flash.current.id : null
  const median = (a: number[]) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] }
  const rtt = median(rtts)
  const nameOf = (id: string | null) => (id && tdm ? tdm.regions.find((r) => r.id === id)?.name.en ?? tdm.lines.find((l) => l.id === id)?.name.en ?? id : '')
  const targetEl = target && tdm ? tdm.regions.find((r) => r.id === target) : null
  const flashEl = flashId && tdm ? tdm.regions.find((r) => r.id === flashId) : null
  if (typeof window !== 'undefined') window.__sg = { events: events.current, lastSay: caption, rtts, source, target }

  return (
    <main className="sg">
      <section className="sg-canvas">
        {tdm ? (
          <TdmCanvas tdm={tdm} highlight={focus ? [focus] : fingerId ? [fingerId] : []} showRefs showKey={false} paper="#fbf8f2" ink="#0c2b2d" accent="#ff6f59">
            {targetEl && <path className="sg-target" d={targetEl.polygon.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ') + ' Z'} fill="none" stroke="#ff6f59" strokeWidth={1.4} strokeDasharray="2.5 1.5" pointerEvents="none" />}
            {flashEl && <path d={flashEl.polygon.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ') + ' Z'} fill="#3d7dd8" fillOpacity={0.35 * (1 - (now - flash.current!.t) / FLASH_MS)} stroke="none" pointerEvents="none" />}
            {trailPts.map((x, i) => { const age = (now - x.t) / TRAIL_MS; return <circle key={i} cx={x.p[0]} cy={x.p[1]} r={1.6 + 1.2 * (1 - age)} fill="#3d7dd8" fillOpacity={0.55 * (1 - age)} pointerEvents="none" /> })}
            {finger && (
              <g pointerEvents="none">
                <circle cx={finger[0]} cy={finger[1]} r={6} fill="none" stroke={verdict === 'correct' ? '#2e9e6a' : verdict === 'wrong' ? '#ff6f59' : '#3d7dd8'} strokeWidth={1} />
                <circle cx={finger[0]} cy={finger[1]} r={2.4} fill={verdict === 'correct' ? '#2e9e6a' : verdict === 'wrong' ? '#ff6f59' : '#3d7dd8'} />
              </g>
            )}
          </TdmCanvas>
        ) : (
          <div className="sg-wait">
            <div className="kicker">Waiting for a phone…</div>
            <h1 className="h1">Open the student app on the phone and start a diagram.</h1>
            {qr && <img src={qr} alt="" width={220} height={220} />}
            <div className="mono sg-url">{typeof location !== 'undefined' ? location.href : ''}</div>
            <div className="mono sg-hint">relay {relayUrl()} · same tab or same origin</div>
          </div>
        )}
      </section>
      <aside className="sg-side">
        <div className="sg-head">
          <Brand />
          <span className="kicker">Projector</span>
          <span className={`sg-badge ${source ? 'on' : ''}`}>{source === 'relay' ? 'phone · relay' : source === 'local' ? 'this device' : 'no source'}</span>
        </div>
        <div className="sg-mode mono">{tdm ? tdm.title : '—'} · <b>{mode}</b>{target ? ` · find ${nameOf(target)}` : ''}</div>
        <div className="sg-caption" aria-live="polite">{caption || (fingerId ? nameOf(fingerId) : tdm ? 'Touch the diagram.' : '')}</div>
        <div className="sg-now mono">{fingerId ? `under the finger: ${nameOf(fingerId)}` : finger ? 'blank paper' : 'finger lifted'}</div>
        <div className="sg-latency mono">
          <span>round trip</span><b>{rtt == null ? '—' : `${rtt} ms`}</b>
          <span>one-way ≈</span><b>{rtt == null ? '—' : `${Math.round(rtt / 2)} ms`}</b>
          <span>samples</span><b>{rtts.length}</b>
        </div>
        <ol className="sg-log mono">
          {log.map((r, i) => <li key={`${r.t}-${i}`}><span>{new Date(r.t).toLocaleTimeString('en-GB', { hour12: false })}.{String(r.t % 1000).padStart(3, '0')}</span><em>{r.type}</em>{r.text}</li>)}
        </ol>
      </aside>
    </main>
  )
}
