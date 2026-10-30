import { useEffect, useMemo, useRef, useState } from 'react'
import { TdmCanvas, TEXTURE_LABEL } from '../../components/TdmCanvas'
import { BrailleCells } from '../../components/BrailleCells'
import { centroid } from '../../tdm/geometry'
import type { Tdm, Lang, Point } from '../../tdm/types'
import { createState, step, describeFully, DWELL_MS } from '../../student/explore'
import { toBraille } from '../../student/braille'
import { speak, stopSpeech } from '../../device/speech'
import { vibrate, hapticsSupported, type Pulse } from '../../device/haptics'

/**
 * The published heart as the fingertip gets it, driven by the real explorer. A scripted finger tours the parts in
 * reading order; the moment the visitor's own pointer touches the sheet, the script yields and the explorer answers
 * them instead (ticks, rhythm, name after a dwell, where-am-I). On a phone it vibrates for real.
 */

const LANGS: Lang[] = ['en', 'hi', 'pa']
const LANG_LABEL: Record<Lang, string> = { en: 'English', hi: 'हिन्दी', pa: 'ਪੰਜਾਬੀ' }
const MOVE_MS = 1150, HOLD_MS = 1700, TRAIL_MS = 1100, TICK_MS = 650, YIELD_MS = 2600

type Mark = { p: Point; t: number }

function route(tdm: Tdm): Point[] {
  const b = tdm.regions.reduce((o, r) => { for (const [x, y] of r.polygon) { o.x0 = Math.min(o.x0, x); o.x1 = Math.max(o.x1, x); o.y0 = Math.min(o.y0, y); o.y1 = Math.max(o.y1, y) } return o }, { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 })
  const parts = tdm.readingOrder.map((id) => tdm.regions.find((r) => r.id === id)).filter((r): r is NonNullable<typeof r> => !!r && r.texture !== 'empty')
  return [[b.x0 - 6, (b.y0 + b.y1) / 2], ...parts.map((r) => { const c = centroid(r.polygon); return [c[0] + 5, c[1] + 6] as Point }), [b.x1 + 6, (b.y0 + b.y1) / 2]]
}

export function TouchSheet({ tdm, onFocus, className = '' }: { tdm: Tdm; onFocus?: (id: string | null) => void; className?: string }) {
  const way = useMemo(() => route(tdm), [tdm])
  const wrap = useRef<HTMLDivElement>(null)
  const [finger, setFinger] = useState<Point | null>(null)
  const [focus, setFocus] = useState<string | null>(null)
  const [caption, setCaption] = useState<string | null>(null)
  const [feel, setFeel] = useState<{ pulse: Pulse; at: number } | null>(null)
  const [lang, setLang] = useState<Lang>('en')
  const [voice, setVoice] = useState(false)
  const [touched, setTouched] = useState(false)
  const [braille, setBraille] = useState<Record<string, string>>({})
  const trail = useRef<Mark[]>([])
  const ticks = useRef<Mark[]>([])
  const pointer = useRef<{ p: Point | null; at: number }>({ p: null, at: -1e9 })
  const voiceRef = useRef(false)
  const langRef = useRef<Lang>('en')
  const [, force] = useState(0)

  useEffect(() => { voiceRef.current = voice; if (!voice) stopSpeech() }, [voice])
  useEffect(() => { langRef.current = lang }, [lang])
  useEffect(() => { onFocus?.(focus) }, [focus, onFocus])
  useEffect(() => {
    let alive = true
    Promise.all(tdm.key.map(async (k) => [k.ref, (await toBraille(k.text.en, 'en')) ?? ''] as const)).then((rows) => { if (alive) setBraille(Object.fromEntries(rows)) })
    return () => { alive = false }
  }, [tdm])

  useEffect(() => {
    let alive = true, raf = 0
    const st = createState()
    const timers: number[] = []
    const legs = way.length - 1
    const loopMs = legs * MOVE_MS + (way.length - 2) * HOLD_MS + 900
    let loop = 0, scriptBase = performance.now(), paused = false
    const posAt = (ms: number): Point | null => {
      let t = ms
      for (let i = 0; i < legs; i++) {
        if (t < MOVE_MS) { const k = t / MOVE_MS, e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; const a = way[i], b = way[i + 1]; return [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e] }
        t -= MOVE_MS
        if (i < legs - 1) { if (t < HOLD_MS) return way[i + 1]; t -= HOLD_MS }
      }
      return null
    }
    const frame = () => {
      if (!alive) return
      const now = performance.now()
      const live = now - pointer.current.at < YIELD_MS
      let p: Point | null
      if (live) { p = pointer.current.p; if (!paused) { paused = true } }
      else {
        if (paused) { paused = false; scriptBase = now; loop = 0 }
        const el = now - scriptBase
        const thisLoop = Math.floor(el / loopMs)
        if (thisLoop !== loop) { loop = thisLoop; const L = LANGS[loop % LANGS.length]; setLang(L); langRef.current = L; setCaption(null) }
        p = posAt(el - loop * loopMs)
      }
      const L = langRef.current
      const acts = step(tdm, st, p, now, L)
      if (p) trail.current = [...trail.current.filter((x) => now - x.t < TRAIL_MS), { p, t: now }]
      for (const a of acts) {
        if (a.do === 'hush') { if (p) ticks.current = [...ticks.current.filter((x) => now - x.t < TICK_MS), { p, t: now }]; setCaption(null); if (voiceRef.current) stopSpeech() }
        if (a.do === 'pulse') { setFeel({ pulse: a.pulse, at: now }); if (live && hapticsSupported()) vibrate(a.pulse) }
        if (a.do === 'focus') setFocus(a.id)
        if (a.do === 'say') { const text = a.text, id = st.id; timers.push(window.setTimeout(() => { if (!alive || st.id !== id) return; setCaption(text); if (voiceRef.current) speak(text, L) }, a.after)) }
      }
      setFinger(p)
      force((n) => n + 1)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => { alive = false; cancelAnimationFrame(raf); timers.forEach(clearTimeout) }
  }, [tdm, way])

  const toMm = (e: React.PointerEvent): Point | null => {
    const svg = wrap.current?.querySelector('svg')
    if (!svg) return null
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY
    const m = pt.matrixTransform(ctm.inverse())
    return [m.x, m.y]
  }
  const onMove = (e: React.PointerEvent) => { const p = toMm(e); if (!p) return; pointer.current = { p, at: performance.now() }; if (!touched) setTouched(true) }
  const onLeave = () => { pointer.current = { p: null, at: performance.now() - YIELD_MS + 600 } }

  const now = performance.now()
  const trailPts = trail.current.filter((x) => now - x.t < TRAIL_MS)
  const tickPts = ticks.current.filter((x) => now - x.t < TICK_MS)
  const focused = tdm.regions.find((r) => r.id === focus)
  const pulseBars = feel ? (typeof feel.pulse === 'number' ? [feel.pulse] : feel.pulse) : []
  const elapsed = feel ? now - feel.at : 0
  let acc = 0
  const bars = pulseBars.map((ms, i) => { const s = acc; acc += ms; return { ms, on: i % 2 === 0, now: elapsed >= s && elapsed < acc } })
  const live = now - pointer.current.at < YIELD_MS

  return (
    <div className={`ts ${className}`}>
      <div className="ts-sheet" ref={wrap} onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={onLeave} style={{ touchAction: 'none' }}>
        <TdmCanvas tdm={tdm} showRefs={false} paper="transparent" ink="#10292b" highlight={focus ? [focus] : []} accent="#e2573f">
          {tdm.regions.map((r) => { const c = centroid(r.polygon); return (
            <g key={r.id} pointerEvents="none">
              <rect x={c[0] - 3.4} y={c[1] - 3.4} width={6.8} height={6.8} rx={1.2} fill="#f6f2e9" stroke="#10292b" strokeWidth={0.45} />
              <text x={c[0]} y={c[1] + 2} fontSize={5} fontFamily="JetBrains Mono Variable, monospace" fontWeight={700} textAnchor="middle" fill="#10292b">{r.keyRef}</text>
            </g>) })}
          {trailPts.map((x, i) => { const age = (now - x.t) / TRAIL_MS; return <circle key={i} cx={x.p[0]} cy={x.p[1]} r={1.4 + 1.6 * (1 - age)} fill="#e2573f" fillOpacity={0.4 * (1 - age)} pointerEvents="none" /> })}
          {tickPts.map((x, i) => { const age = (now - x.t) / TICK_MS; return <circle key={`t${i}`} cx={x.p[0]} cy={x.p[1]} r={2 + 9 * age} fill="none" stroke="#0e7c7b" strokeWidth={1.1 * (1 - age)} strokeOpacity={1 - age} pointerEvents="none" /> })}
          {finger && <g pointerEvents="none"><circle cx={finger[0]} cy={finger[1]} r={6.5} fill="#e2573f" fillOpacity={0.16} /><circle cx={finger[0]} cy={finger[1]} r={2.1} fill="#e2573f" stroke="#fff" strokeWidth={0.6} /></g>}
        </TdmCanvas>
        <div className={`ts-hint mono ${touched ? 'off' : ''}`}>{live ? 'your finger' : 'put your finger on it · move over the sheet'}</div>
        <div className="ts-corner mono">A4 · 210 × 297 mm · sample-heart · validator pass</div>
      </div>

      <div className="ts-bar">
        <div className="ts-say">
          <span className="ts-lang mono">{LANG_LABEL[lang]}</span>
          <div className="ts-say-text">
            <b className={caption ? 'on' : ''}>{caption ?? (focused ? '' : 'nothing under the finger')}</b>
            <span className="ts-where">{focused ? describeFully(tdm, focused.id, lang) : `rest ${DWELL_MS} ms on a part and it is named`}</span>
          </div>
          <div className="ts-ctl">
            <select className="mono" value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label="language">{LANGS.map((l) => <option key={l} value={l}>{LANG_LABEL[l]}</option>)}</select>
            <button className={`mono ${voice ? 'live' : ''}`} onClick={() => setVoice((v) => !v)} aria-pressed={voice}>{voice ? 'voice on' : 'hear it'}</button>
          </div>
        </div>
        <div className="ts-feel">
          <span className="mono ts-feel-k">feel</span>
          <span className="ts-bars" aria-hidden>{bars.map((b, i) => <i key={i} style={{ width: Math.max(4, b.ms / 7) }} className={`${b.on ? 'buzz' : 'gap'} ${b.now ? 'now' : ''}`} />)}</span>
          <span className="mono ts-feel-t">{focused ? TEXTURE_LABEL[focused.texture] : finger ? 'edge' : 'lifted'}</span>
        </div>
        <div className="ts-key">
          {tdm.key.map((k) => (
            <div key={k.ref} className={`ts-key-row ${focus === k.regionId ? 'on' : ''}`}>
              <span className="mono ts-ref">{k.ref}</span>
              {braille[k.ref] ? <BrailleCells text={braille[k.ref]} ink="#f6f2e9" guide="rgba(246,242,233,.18)" scale={1.3} max={14} /> : <span className="mono" style={{ opacity: .4 }}>…</span>}
              <span className="ts-key-name">{k.text.en}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
