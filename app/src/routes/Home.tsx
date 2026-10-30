import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { TdmCanvas } from '../components/TdmCanvas'
import { BrailleCells } from '../components/BrailleCells'
import { simplify } from '../tdm/simplify'
import { validate } from '../tdm/validate'
import { centroid } from '../tdm/geometry'
import type { Tdm, Lang, Point } from '../tdm/types'
import { createState, step, describeFully, DWELL_MS } from '../student/explore'
import { toBraille } from '../student/braille'
import { speak, stopSpeech as hush } from '../device/speech'
import type { Pulse } from '../device/haptics'
import { TEXTURE_LABEL } from '../components/TdmCanvas'
import draftJson from '../opener/heart-draft.json'
import heartPhoto from '../opener/heart.png'
import heartJson from '../samples/sample-heart.tdm.json'
import './home.css'

/**
 * The opener, one screen. Left: the sentence, the physics, the three doors. Right: the published heart as the
 * fingertip gets it, with a scripted finger driven by the real explorer, so every tick, rhythm and name is the
 * student app's own output, not an animation of it.
 */

const heart = heartJson as unknown as Tdm
const draft = draftJson as unknown as Tdm
const LANGS: Lang[] = ['en', 'hi', 'pa']
const LANG_LABEL: Record<Lang, string> = { en: 'English', hi: 'हिन्दी', pa: 'ਪੰਜਾਬੀ' }
const MOVE_MS = 1150, DWELL_HOLD_MS = 1650, TRAIL_MS = 1100, TICK_MS = 650

type Tick = { p: Point; t: number }

function waypoints(tdm: Tdm): Point[] {
  const box = tdm.regions.reduce((b, r) => { for (const [x, y] of r.polygon) { b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x); b.y0 = Math.min(b.y0, y); b.y1 = Math.max(b.y1, y) } return b }, { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 })
  const order = tdm.readingOrder.map((id) => tdm.regions.find((r) => r.id === id)).filter((r): r is NonNullable<typeof r> => !!r && r.texture !== 'empty')
  const pts = order.map((r) => { const c = centroid(r.polygon); return [c[0] + 5, c[1] + 6] as Point })
  return [[box.x0 - 6, (box.y0 + box.y1) / 2], ...pts, [box.x1 + 6, (box.y0 + box.y1) / 2]]
}

export function Home() {
  const facts = useMemo(() => {
    const d: Tdm = JSON.parse(JSON.stringify(draft))
    const blocking = validate(d).blocking.filter((f) => f.rule !== 'R3').length
    const { report } = simplify(d)
    const textures = new Set(heart.regions.map((r) => r.texture).filter((t) => t !== 'empty')).size
    return { blocking, before: report.minGapBefore, after: report.minGapAfter, textures }
  }, [])
  const route = useMemo(() => waypoints(heart), [])
  const usedTextures = useMemo(() => Array.from(new Set(heart.regions.map((r) => r.texture).filter((t) => t !== 'empty'))), [])

  const [finger, setFinger] = useState<Point | null>(null)
  const [focus, setFocus] = useState<string | null>(null)
  const [caption, setCaption] = useState<{ text: string; lang: Lang } | null>(null)
  const [feel, setFeel] = useState<{ pulse: Pulse; at: number } | null>(null)
  const [lang, setLang] = useState<Lang>('en')
  const [voice, setVoice] = useState(false)
  const [braille, setBraille] = useState<Record<string, string>>({})
  const trail = useRef<Tick[]>([])
  const ticks = useRef<Tick[]>([])
  const voiceRef = useRef(false)
  const [, force] = useState(0)

  useEffect(() => { voiceRef.current = voice; if (!voice) hush() }, [voice])

  useEffect(() => {
    let alive = true
    Promise.all(heart.key.map(async (k) => [k.ref, (await toBraille(k.text.en, 'en')) ?? ''] as const)).then((rows) => { if (alive) setBraille(Object.fromEntries(rows)) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    let alive = true, raf = 0
    const st = createState()
    const timers: number[] = []
    const legs = route.length - 1
    const loopMs = legs * MOVE_MS + (route.length - 2) * DWELL_HOLD_MS + 900
    let loop = 0
    const t0 = performance.now()
    const posAt = (ms: number): Point | null => {
      let t = ms
      for (let i = 0; i < legs; i++) {
        if (t < MOVE_MS) { const k = t / MOVE_MS, e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; const a = route[i], b = route[i + 1]; return [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e] }
        t -= MOVE_MS
        if (i < legs - 1) { if (t < DWELL_HOLD_MS) return route[i + 1]; t -= DWELL_HOLD_MS }
      }
      return null
    }
    const frame = () => {
      if (!alive) return
      const now = performance.now()
      const el = now - t0
      const thisLoop = Math.floor(el / loopMs)
      if (thisLoop !== loop) { loop = thisLoop; setLang(LANGS[loop % LANGS.length]); setCaption(null) }
      const L = LANGS[loop % LANGS.length]
      const p = posAt(el - loop * loopMs)
      const acts = step(heart, st, p, now, L)
      if (p) trail.current = [...trail.current.filter((x) => now - x.t < TRAIL_MS), { p, t: now }]
      for (const a of acts) {
        if (a.do === 'hush') { if (p) ticks.current = [...ticks.current.filter((x) => now - x.t < TICK_MS), { p, t: now }]; setCaption(null); if (voiceRef.current) hush() }
        if (a.do === 'pulse') setFeel({ pulse: a.pulse, at: now })
        if (a.do === 'focus') setFocus(a.id)
        if (a.do === 'say') { const text = a.text, id = st.id; timers.push(window.setTimeout(() => { if (!alive || st.id !== id) return; setCaption({ text, lang: L }); if (voiceRef.current) speak(text, L) }, a.after)) }
      }
      if (!p && st.id === null && caption) setCaption(null)
      setFinger(p)
      force((n) => n + 1)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => { alive = false; cancelAnimationFrame(raf); timers.forEach(clearTimeout) }
  }, [route]) // eslint-disable-line react-hooks/exhaustive-deps

  const now = performance.now()
  const trailPts = trail.current.filter((x) => now - x.t < TRAIL_MS)
  const tickPts = ticks.current.filter((x) => now - x.t < TICK_MS)
  const focused = heart.regions.find((r) => r.id === focus)
  const pulseBars = feel ? (typeof feel.pulse === 'number' ? [feel.pulse] : feel.pulse) : []
  const pulseElapsed = feel ? now - feel.at : 0
  let acc = 0
  const bars = pulseBars.map((ms, i) => { const start = acc; acc += ms; return { ms, on: i % 2 === 0, active: pulseElapsed >= start && pulseElapsed < acc } })

  return (
    <main className="op">
      <header className="op-top">
        <Brand />
        <span className="kicker">An accessibility compiler for diagrams</span>
        <nav className="mono">
          <Link to="/teacher">teacher</Link>
          <Link to="/student">student</Link>
          <Link to="/stage">projector</Link>
          <Link to="/device">device check</Link>
        </nav>
      </header>

      <section className="op-body">
        <div className="op-left">
          <h1 className="op-h1">A textbook can have a braille edition.<br /><span>A blackboard can't.</span></h1>
          <p className="op-lede">Every diagram a teacher draws, photocopies or projects is invisible to a blind student on the day it is taught. TouchSight reads the diagram's structure, redesigns that structure for a fingertip, and renders one verified model as touch, audio, quiz and print.</p>

          <dl className="op-physics mono">
            <div><dt>1–2 mm</dt><dd>what a fingertip resolves. Raised lines closer than 3 mm merge into one ridge, so geometry is re-spaced, not scaled.</dd></div>
            <div><dt>serial</dt><dd>touch reads one region at a time where vision reads in parallel, so detail is cut to what survives serial reading.</dd></div>
            <div><dt>no colour</dt><dd>shading, gradients and hairlines carry nothing to the skin, so meaning moves into texture, outline and a braille key.</dd></div>
          </dl>

          <div className="op-pipe">
            <img src={heartPhoto} alt="The textbook drawing of the heart this sheet was compiled from" className="op-pipe-photo" />
            <ol className="op-rail mono">
              <li><span className="kicker">photo</span><b>heart-02</b><span>9 labels · 16 strokes</span></li>
              <li><span className="kicker">understand</span><b>0.8 s</b><span>OpenCV + OCR, in the browser</span></li>
              <li><span className="kicker">simplify</span><b>{facts.before.toFixed(1)} → {facts.after.toFixed(1)} mm</b><span>re-spaced, textured, keyed</span></li>
              <li><span className="kicker">validate</span><b>{facts.blocking} → 0</b><span>blocking findings, by rule</span></li>
              <li><span className="kicker">review</span><b>teacher</b><span>confirms relations, names</span></li>
              <li><span className="kicker">publish</span><b>one model</b><span>phone · projector · print</span></li>
            </ol>
          </div>

          <nav className="op-doors">
            <Link className="op-door" to="/teacher">
              <span className="op-n mono">01</span>
              <span className="op-door-t"><b>Teacher console</b><span className="kicker">laptop</span></span>
              <span className="op-door-d mono">photo → understand → validate → fix → publish → SVG · STL · BRF</span>
              <span className="op-arrow" aria-hidden>→</span>
            </Link>
            <Link className="op-door" to="/student">
              <span className="op-n mono">02</span>
              <span className="op-door-t"><b>Student app</b><span className="kicker">phone · installed · offline</span></span>
              <span className="op-door-d mono">explore by touch · audio tour · quiz · braille key · EN हिं ਪੰ</span>
              <span className="op-arrow" aria-hidden>→</span>
            </Link>
            <Link className="op-door" to="/stage">
              <span className="op-n mono">03</span>
              <span className="op-door-t"><b>Projector</b><span className="kicker">the room</span></span>
              <span className="op-door-d mono">finger trail · flashes · captions · quiz target · round trip</span>
              <span className="op-arrow" aria-hidden>→</span>
            </Link>
          </nav>

          <div className="op-bench mono">
            <span>benchmark · 8 figures</span><span>labels read 83%</span><span>regions named 35% · 100% on clean line art</span><span>geometry clean 8/8</span><span>exports 8/8</span><span>median 1.7 s</span>
          </div>
        </div>

        <div className="op-right">
          <div className="op-label">
            <span className="kicker">What the fingertip gets · the student app, live</span>
            <span className="mono">sample-heart · A4 · mm · validator pass</span>
          </div>

          <div className="op-sheet">
            <div className="op-relief">
              <TdmCanvas tdm={heart} showRefs={false} paper="transparent" ink="#1b2a2c" highlight={focus ? [focus] : []} accent="#ff6f59">
                {heart.regions.map((r) => { const c = centroid(r.polygon); return (
                  <g key={r.id} pointerEvents="none">
                    <rect x={c[0] - 3.4} y={c[1] - 3.4} width={6.8} height={6.8} rx={1.2} fill="#f4efe4" stroke="#1b2a2c" strokeWidth={0.45} />
                    <text x={c[0]} y={c[1] + 2} fontSize={5} fontFamily="JetBrains Mono Variable, JetBrains Mono, monospace" fontWeight={700} textAnchor="middle" fill="#1b2a2c">{r.keyRef}</text>
                  </g>) })}
                {trailPts.map((x, i) => { const age = (now - x.t) / TRAIL_MS; return <circle key={i} cx={x.p[0]} cy={x.p[1]} r={1.4 + 1.6 * (1 - age)} fill="#ff6f59" fillOpacity={0.45 * (1 - age)} pointerEvents="none" /> })}
                {tickPts.map((x, i) => { const age = (now - x.t) / TICK_MS; return <circle key={`t${i}`} cx={x.p[0]} cy={x.p[1]} r={2 + 9 * age} fill="none" stroke="#0e7c7b" strokeWidth={1.1 * (1 - age)} strokeOpacity={1 - age} pointerEvents="none" className="op-tick" /> })}
                {finger && <g pointerEvents="none"><circle cx={finger[0]} cy={finger[1]} r={6.5} fill="#ff6f59" fillOpacity={0.16} /><circle cx={finger[0]} cy={finger[1]} r={2.1} fill="#ff6f59" stroke="#fff" strokeWidth={0.6} /></g>}
              </TdmCanvas>
            </div>

            <aside className="op-key">
              <div className="op-key-h"><span className="kicker">Braille key</span><span className="mono">UEB grade 1</span></div>
              {heart.key.map((k) => (
                <div key={k.ref} className={`op-key-row ${focus === k.regionId ? 'on' : ''}`}>
                  <span className="op-key-ref mono">{k.ref}</span>
                  <span className="op-key-cells">{braille[k.ref] ? <BrailleCells text={braille[k.ref]} ink="#1b2a2c" guide="rgba(27,42,44,.14)" scale={1.85} max={15} /> : <span className="op-key-wait mono">…</span>}</span>
                  <span className="op-key-name">{k.text.en}</span>
                </div>
              ))}
              <div className="op-tex">
                <div className="op-key-h"><span className="kicker">Textures</span><span className="mono">{facts.textures} used</span></div>
                {usedTextures.map((tx) => (
                  <div key={tx} className={`op-tex-row ${focused?.texture === tx ? 'on' : ''}`}>
                    <svg viewBox="0 0 12 12" className="op-swatch"><defs><pattern id={`sw-${tx}`} width="3" height="3" patternUnits="userSpaceOnUse" patternTransform={tx === 'diagonal-lines' ? 'rotate(45)' : undefined}>{tx === 'dots' ? <circle cx="1.5" cy="1.5" r="0.7" fill="#1b2a2c" /> : <rect width={tx === 'horizontal-lines' ? 3 : 0.8} height={tx === 'horizontal-lines' ? 0.8 : 3} fill="#1b2a2c" />}</pattern></defs><rect width="12" height="12" rx="2" fill={`url(#sw-${tx})`} stroke="#1b2a2c" strokeWidth="0.6" /></svg>
                    <span>{TEXTURE_LABEL[tx]}</span>
                    <span className="mono op-tex-n">{heart.regions.filter((r) => r.texture === tx).map((r) => r.keyRef).join(' ')}</span>
                  </div>
                ))}
                <div className="op-tex-row"><svg viewBox="0 0 12 12" className="op-swatch"><rect width="12" height="12" rx="2" fill="none" stroke="#1b2a2c" strokeWidth="0.9" /></svg><span>outline only</span><span className="mono op-tex-n">{heart.regions.filter((r) => r.texture === 'empty').map((r) => r.keyRef).join(' ')}</span></div>
              </div>
              <div className="op-order">
                <div className="op-key-h"><span className="kicker">Audio tour</span><span className="mono">reading order</span></div>
                <div className="op-chips">{heart.readingOrder.map((id) => { const r = heart.regions.find((x) => x.id === id); return r ? <span key={id} className={`op-chip mono ${focus === id ? 'on' : ''}`}>{r.keyRef}</span> : null })}</div>
              </div>
              <div className={`op-where ${focused ? 'on' : ''}`}>
                <div className="op-key-h"><span className="kicker">Where am I</span><span className="mono">spoken at rest</span></div>
                <p>{focused ? describeFully(heart, focused.id, lang) : 'Nothing under the finger.'}</p>
              </div>
            </aside>

            <div className={`op-voice ${caption ? 'on' : ''}`}>
              <span className="op-voice-lang mono">{LANG_LABEL[lang]}</span>
              <span className="op-voice-text">{caption ? caption.text : focused ? '' : 'finger on the sheet'}</span>
              <button className={`op-voice-btn mono ${voice ? 'live' : ''}`} onClick={() => setVoice((v) => !v)} aria-pressed={voice}>{voice ? 'voice on' : 'hear it'}</button>
            </div>

            <div className="op-feel">
              <span className="kicker">Feel</span>
              <span className="op-bars" aria-hidden>{bars.map((b, i) => <i key={i} style={{ width: Math.max(4, b.ms / 7) }} className={`${b.on ? 'buzz' : 'gap'} ${b.active ? 'now' : ''}`} />)}</span>
              <span className="mono op-feel-t">{focused ? TEXTURE_LABEL[focused.texture] : finger ? 'edge' : 'lifted'}</span>
            </div>
          </div>

          <div className="op-facts mono">
            <span>every tick, rhythm and name above is the student app's own output</span>
            <span>min gap <b>{facts.after.toFixed(2)} mm</b> · S1 ≥ 3 · BANA 2010</span>
            <span>a name after <b>{DWELL_MS} ms</b> at rest</span>
          </div>
        </div>
      </section>
    </main>
  )
}
