import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { TdmCanvas } from '../../components/TdmCanvas'
import { getDiagram, recordQuiz } from '../../store/db'
import { sampleById } from '../../samples'
import type { Tdm, Point, Lang } from '../../tdm/types'
import { vibrate, stopVibration, CORRECT_PULSE, WRONG_PULSE, TEXTURE_PULSE, LINE_PULSE, type Pulse } from '../../device/haptics'
import { speak, stopSpeech } from '../../device/speech'
import { createState, step, describeFully, type Action } from '../../student/explore'
import { directionTo, isNamed } from '../../student/hit'
import { nameIn, t, LANG_NAME } from '../../i18n'
import { useLang } from '../Student'
import { BrailleKey } from './Key'
import { mirror } from '../../student/mirror'
import { classroom, studentProfile } from '../../class/classroom'
import { useTouchToAct, useGestures, type Gesture } from '../../student/a11y'
import { sound } from '../../device/sound'
import { diagramBox } from '../../tdm/geometry'

type Mode = 'explore' | 'tour' | 'quiz' | 'key'

declare global {
  interface Window { __tsLog?: { t: number; kind: string; text: string }[]; __tsTdm?: Tdm }
}
const log = (kind: string, text: string) => { (window.__tsLog ??= []).push({ t: Date.now(), kind, text }) }
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** One diagram under the fingers: explore by touch, take the audio tour, or be quizzed. */
export function Explore() {
  const { id = '' } = useParams()
  const { lang, setLang } = useLang()
  const s = t(lang)
  const [tdm, setTdm] = useState<Tdm | null>(null)
  const [mode, setMode] = useState<Mode>('explore')
  const [focus, setFocus] = useState<string | null>(null)
  const [finger, setFinger] = useState<Point | null>(null)
  const [caption, setCaption] = useState('')
  const wrap = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  const { handle, armed } = useTouchToAct(lang)
  const st = useRef(createState())
  const pending = useRef<number | null>(null)
  const pending2 = useRef<number | null>(null)

  useEffect(() => {
    let live = true
    getDiagram(id).then((row) => { const d = row?.tdm ?? sampleById(id) ?? null; if (live) { setTdm(d); if (d) { window.__tsTdm = d; mirror.hello(d); const pr = studentProfile(); if (pr?.room && pr.name) { classroom.join(pr.room, 'student', pr.name); classroom.activity({ kind: 'open', diagramId: d.id, title: d.title }) } } } })
    return () => { live = false }
  }, [id])

  // ---- the device's three outputs, each logged for the projector and the harness
  const say = useCallback((text: string, l: Lang = lang, interrupt = true) => { log('say', text); setCaption(text); mirror.post({ type: 'say', text }); sound.duck(Math.min(6000, 500 + text.length * 60)); return speak(text, l, { interrupt }) ?? wait(Math.min(2500, 250 + text.length * 45)) }, [lang])
  const buzz = useCallback((p: Pulse) => { log('pulse', JSON.stringify(p)); vibrate(p) }, [])
  const hush = useCallback(() => { if (pending.current) { clearTimeout(pending.current); pending.current = null } if (pending2.current) { clearTimeout(pending2.current); pending2.current = null } }, [])
  useEffect(() => () => { hush(); stopSpeech(); stopVibration(); sound.lift() }, [hush])
  useEffect(() => { mirror.post({ type: 'mode', mode }) }, [mode])

  // ---- quiz
  const [targets, setTargets] = useState<string[]>([])
  const pickTargets = (d: Tdm) => {
    const arr = d.regions.filter(isNamed)
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]] }
    return arr.slice(0, 5).map((r) => r.id)
  }
  const [qi, setQi] = useState(0)
  const [qFound, setQFound] = useState(0)
  const [qAttempts, setQAttempts] = useState(0)
  const qStart = useRef(0)
  const qBusy = useRef(false)
  const tries = useRef(0)
  const qDone = mode === 'quiz' && qi >= targets.length

  const askCurrent = useCallback((i: number, list = targets) => {
    if (!tdm || i >= list.length) return
    const r = tdm.regions.find((x) => x.id === list[i])!
    qStart.current = Date.now()
    mirror.post({ type: 'quiz', target: r.id })
    say(s.find(nameIn(r.name, lang)))
  }, [tdm, targets, say, s, lang])

  function startQuiz() {
    if (!tdm) return
    const list = pickTargets(tdm)
    setTargets(list)
    setMode('quiz'); setQi(0); setQFound(0); setQAttempts(0); setFocus(null)
    hush(); stopSpeech()
    setTimeout(() => askCurrent(0, list), 50)
  }
  async function answer(hitId: string | null, at: Point | null) {
    if (!tdm || qBusy.current || qi >= targets.length) return
    qBusy.current = true
    const target = targets[qi]
    const tr = tdm.regions.find((x) => x.id === target)!
    setQAttempts((a) => a + 1)
    mirror.post({ type: 'quiz', target, result: hitId === target ? 'correct' : 'wrong', hitId })
    if (hitId === target) {
      buzz(CORRECT_PULSE)
      setFocus(target)
      classroom.activity({ kind: 'quiz', diagramId: tdm.id, target, targetName: tr.name.en, found: true, attempts: tries.current + 1, seconds: +((Date.now() - qStart.current) / 1000).toFixed(1) })
      tries.current = 0
      await recordQuiz(tdm.id, target, true, (Date.now() - qStart.current) / 1000)
      await say(s.correct(nameIn(tr.name, lang)))
      const next = qi + 1
      setQi(next); setQFound((f) => f + 1)
      if (next < targets.length) askCurrent(next)
      else { mirror.post({ type: 'quiz', target: null }); say(s.quizDone(qFound + 1, targets.length)) }
    } else {
      tries.current++
      buzz(WRONG_PULSE)
      const hit = hitId ? tdm.regions.find((x) => x.id === hitId) ?? tdm.lines.find((x) => x.id === hitId) : null
      const hint = at ? s.hintMove(directionTo(tdm, at, target)) : ''
      await say(`${hit ? s.wrong(nameIn(hit.name, lang)) : s.blank} ${hint}`)
    }
    qBusy.current = false
  }
  async function skip() {
    if (!tdm || qi >= targets.length) return
    const tr = tdm.regions.find((x) => x.id === targets[qi])
    classroom.activity({ kind: 'quiz', diagramId: tdm.id, target: targets[qi], targetName: tr?.name.en ?? targets[qi], found: false, attempts: tries.current, seconds: +((Date.now() - qStart.current) / 1000).toFixed(1) })
    tries.current = 0
    await recordQuiz(tdm.id, targets[qi], false, (Date.now() - qStart.current) / 1000)
    const next = qi + 1
    setQi(next)
    if (next < targets.length) askCurrent(next)
    else say(s.quizDone(qFound, targets.length))
  }

  // ---- tour
  const [ti, setTi] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const tourRun = useRef(0)
  const order = tdm?.readingOrder ?? []

  async function playFrom(i: number) {
    if (!tdm) return
    if (i < 0) classroom.activity({ kind: 'tour', diagramId: tdm.id })
    const run = ++tourRun.current
    setPlaying(true)
    if (i < 0) { setTi(-1); setFocus(null); await say(s.tourIntro(nameIn({ en: tdm.title }, lang), tdm.regions.length, tdm.lines.length)); i = 0 }
    for (; i < order.length; i++) {
      if (run !== tourRun.current) return
      const elId = order[i]
      const r = tdm.regions.find((x) => x.id === elId), l = tdm.lines.find((x) => x.id === elId)
      const el = r ?? l
      if (!el) continue
      setTi(i); setFocus(elId)
      mirror.post({ type: 'focus', id: elId })
      buzz(r ? TEXTURE_PULSE[r.texture] || 22 : LINE_PULSE)
      await say(`${el.keyRef}. ${describeFully(tdm, elId, lang)}`)
      if (run !== tourRun.current) return
      await wait(350)
    }
    if (run !== tourRun.current) return
    await say(s.endOfDiagram)
    setPlaying(false)
  }
  function pauseTour() { tourRun.current++; setPlaying(false); stopSpeech() }
  function jump(d: 1 | -1) { const n = Math.max(0, Math.min(order.length - 1, ti + d)); pauseTour(); playFrom(n) }

  // ---- finger
  const toMm = (e: React.PointerEvent): Point | null => {
    const svg = wrap.current?.querySelector('svg')
    if (!svg) return null
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    return [pt.x, pt.y]
  }
  const dwell = useRef<{ id: string | null; since: number }>({ id: null, since: 0 })
  const leavePart = (now: number) => {
    const d = dwell.current
    if (d.id && tdm && now - d.since > 250) { const el = tdm.regions.find((r) => r.id === d.id) ?? tdm.lines.find((l) => l.id === d.id); if (el) classroom.activity({ kind: 'explore', diagramId: tdm.id, partId: d.id, partName: el.name.en, ms: Math.round(now - d.since) }) }
  }
  const tone = (p: Point | null) => {
    if (!tdm) return
    if (!p) { sound.lift(); return }
    const box = diagramBox(tdm, 0)
    const id = st.current.id
    const r = id ? tdm.regions.find((x) => x.id === id) : null, l = id && !r ? tdm.lines.find((x) => x.id === id) : null
    sound.move((p[0] - box.x) / box.w, (p[1] - box.y) / box.h, r ? r.texture : null, !!l)
  }
  const apply = (acts: Action[]) => {
    for (const a of acts) {
      if (a.do === 'pulse') buzz(a.pulse)
      else if (a.do === 'hush') { hush(); if (st.current.down) sound.tick() }
      else if (a.do === 'focus') { const now = performance.now(); leavePart(now); dwell.current = { id: a.id, since: now }; if (mode !== 'quiz') setFocus(a.id) }
      else if (a.do === 'say' && mode !== 'quiz') { hush(); pending.current = window.setTimeout(() => { pending.current = null; say(a.text) }, a.after) }
      else if (a.do === 'explain' && mode === 'explore') { if (pending2.current) clearTimeout(pending2.current); pending2.current = window.setTimeout(() => { pending2.current = null; log('explain', a.text); say(a.text, lang, false) }, a.after) }
    }
  }
  const onPointer = (e: React.PointerEvent) => {
    if (!tdm || mode === 'tour') return
    if (rec.current.fingers > 1 || !e.isPrimary) { if (st.current.id !== null) apply(step(tdm, st.current, null, performance.now(), lang)); setFinger(null); return }
    if (e.type === 'pointerdown') { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); if (mode === 'explore') stopSpeech() }
    const p = toMm(e)
    if (!p) return
    setFinger(p)
    mirror.post({ type: 'finger', p, id: st.current.id })
    apply(step(tdm, st.current, p, performance.now(), lang))
    tone(p)
  }
  const onLift = (e: React.PointerEvent) => {
    if (!tdm || mode === 'tour') return
    const last = st.current.id
    const p = toMm(e)
    apply(step(tdm, st.current, null, performance.now(), lang))
    leavePart(performance.now()); dwell.current = { id: null, since: 0 }
    tone(null)
    setFinger(null)
    mirror.post({ type: 'finger', p: null, id: null })
    if (mode === 'quiz' && !qDone) answer(last, p)
  }
  const whereAmI = () => { if (!tdm) return; const f = focus ?? st.current.id; say(f ? describeFully(tdm, f, lang) : s.blank) }

  // ---- two and three finger gestures: nothing on the screen has to be found
  const MODES: Mode[] = ['explore', 'tour', 'quiz', 'key']
  const gestureRef = useRef<(g: Gesture) => void>(() => {})
  gestureRef.current = (g) => {
    if (!tdm) return
    if (g === 'swipe-left' || g === 'swipe-right') {
      const i = MODES.indexOf(mode); const m = MODES[(i + (g === 'swipe-left' ? 1 : MODES.length - 1)) % MODES.length]
      log('gesture', `${g} → ${m}`)
      if (m === 'quiz') startQuiz(); else { pauseTour(); hush(); setMode(m); setFocus(null); say(s.modeIs(s[m])) }
    } else if (g === 'double-tap-2') { log('gesture', 'where am I'); whereAmI() }
    else if (g === 'tap-3') { const n: Lang = lang === 'en' ? 'hi' : lang === 'hi' ? 'pa' : 'en'; log('gesture', `language ${n}`); setLang(n); speak(LANG_NAME[n], n) }
  }
  const rec = useGestures(mainRef, (g) => gestureRef.current(g))
  useEffect(() => { (window as unknown as { __tsGesture?: (g: Gesture) => void }).__tsGesture = (g) => gestureRef.current(g) }, [])

  if (!tdm) return <main className="st"><p className="st-empty">…</p></main>
  const focusEl = focus ? tdm.regions.find((r) => r.id === focus) ?? tdm.lines.find((l) => l.id === focus) : null
  const target = mode === 'quiz' && !qDone ? tdm.regions.find((r) => r.id === targets[qi]) : null

  return (
    <main className="st st-explore" ref={mainRef}>
      <header className="st-head">
        <Link to="/student" className="st-back" aria-label={s.library}>‹</Link>
        <button className="st-help" aria-label={s.help} onClick={() => say(s.gestures)}>?</button>
        <div className="st-title"><b>{nameIn({ en: tdm.title }, lang)}</b><span className="mono">{tdm.subject}</span></div>
        <button className="st-lang" onClick={() => { const n: Lang = lang === 'en' ? 'hi' : lang === 'hi' ? 'pa' : 'en'; setLang(n); speak(LANG_NAME[n], n) }} aria-label={s.language}>{LANG_NAME[lang]}</button>
      </header>

      <nav className="st-modes" role="tablist">
        {(['explore', 'tour', 'quiz', 'key'] as Mode[]).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} className={`${mode === m ? 'on' : ''} ${armed === `mode-${m}` ? 'armed' : ''}`} onClick={handle(`mode-${m}`, s[m], () => { if (m === 'quiz') startQuiz(); else { pauseTour(); hush(); setMode(m); setFocus(null) } })}>{s[m]}</button>
        ))}
      </nav>

      <div ref={wrap} className={`st-canvas ${mode}`} onPointerDown={onPointer} onPointerMove={(e) => { if (e.buttons || e.pointerType === 'touch') onPointer(e) }} onPointerUp={onLift} onPointerCancel={onLift}>
        <TdmCanvas tdm={tdm} highlight={focus ? [focus] : []} marker={finger} showRefs={mode !== 'quiz'} />
      </div>

      <section className={`st-panel ${mode}`} aria-live="polite">
        {mode === 'key' && <BrailleKey tdm={tdm} lang={lang} focus={focus} onPick={(id) => { setFocus(id); const el = tdm.regions.find((r) => r.id === id) ?? tdm.lines.find((l) => l.id === id); if (el) say(nameIn(el.name, lang)) }} />}
        {mode === 'explore' && (
          <>
            <div className="st-now">{focusEl ? nameIn(focusEl.name, lang) : finger ? s.blank : '—'}</div>
            <div className="st-caption mono">{caption}</div>
            <div className="st-actions">
              <button onClick={whereAmI}>{s.whereAmI}</button>
              <button onClick={() => caption && say(caption)}>{s.repeat}</button>
            </div>
          </>
        )}
        {mode === 'tour' && (
          <>
            <div className="st-now">{focusEl ? `${focusEl.keyRef}. ${nameIn(focusEl.name, lang)}` : nameIn({ en: tdm.title }, lang)}</div>
            <div className="st-caption mono">{ti >= 0 ? `${ti + 1} / ${order.length}` : `${tdm.regions.length} + ${tdm.lines.length}`} · {caption}</div>
            <div className="st-actions three">
              <button className={armed === 'prev' ? 'armed' : ''} onClick={handle('prev', s.previous, () => jump(-1))} disabled={ti <= 0}>{s.previous}</button>
              <button className={`primary ${armed === 'play' ? 'armed' : ''}`} onClick={handle('play', playing ? s.pause : s.play, () => (playing ? pauseTour() : playFrom(ti < 0 ? -1 : ti)))}>{playing ? s.pause : s.play}</button>
              <button className={armed === 'next' ? 'armed' : ''} onClick={handle('next', s.next, () => jump(1))} disabled={ti >= order.length - 1}>{s.next}</button>
            </div>
          </>
        )}
        {mode === 'quiz' && !qDone && target && (
          <>
            <div className="st-now">{s.find(nameIn(target.name, lang))}</div>
            <div className="st-caption mono">{qi + 1} / {targets.length} · {qFound} ✓ · {qAttempts} tries</div>
            <div className="st-actions">
              <button onClick={() => askCurrent(qi)}>{s.repeat}</button>
              <button className={armed === 'skip' ? 'armed' : ''} onClick={handle('skip', s.skip, skip)}>{s.skip}</button>
            </div>
          </>
        )}
        {mode === 'quiz' && qDone && (
          <>
            <div className="st-now">{s.quizDone(qFound, targets.length)}</div>
            <div className="st-caption mono">{qAttempts} tries</div>
            <div className="st-actions">
              <button className={`primary ${armed === 'again' ? 'armed' : ''}`} onClick={handle('again', s.again, startQuiz)}>{s.again}</button>
              <Link to="/student" className="st-btn-link">{s.library}</Link>
            </div>
          </>
        )}
      </section>
    </main>
  )
}
