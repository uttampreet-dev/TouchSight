import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { TdmCanvas } from '../components/TdmCanvas'
import { simplify } from '../tdm/simplify'
import { validate } from '../tdm/validate'
import type { Tdm } from '../tdm/types'
import draftJson from '../opener/heart-draft.json'
import './home.css'

/**
 * The opener. Not a menu: the left half is what the teacher drew, the right half is what the fingertip gets,
 * and between them the validator replays its real findings on this very figure and the solver's fix.
 */

const draft = draftJson as unknown as Tdm
const STEP_MS = 420

type Phase = 'idle' | 'findings' | 'solving' | 'done'

export function Home() {
  const { before, after, findings, report } = useMemo(() => {
    const d: Tdm = JSON.parse(JSON.stringify(draft))
    d.title = 'The human heart'
    const findings = validate(d).blocking.filter((f) => f.rule !== 'R3')
    const { tdm, report } = simplify(d)
    // the teacher's two edits on this figure, replayed so the opener shows a reviewed model
    tdm.relations = tdm.relations.filter((r) => r.source !== 'detected')
    tdm.validation = validate(tdm)
    return { before: d, after: tdm, findings, report }
  }, [])

  const [phase, setPhase] = useState<Phase>('idle')
  const [shownFindings, setShownFindings] = useState(0)
  const [shownRegions, setShownRegions] = useState(0)
  const [gap, setGap] = useState(report.minGapBefore)
  const [run, setRun] = useState(0)
  const raf = useRef(0)

  useEffect(() => {
    let alive = true
    const timers: number[] = []
    setPhase('findings'); setShownFindings(0); setShownRegions(0); setGap(report.minGapBefore)
    const total = Math.min(findings.length, 7)
    for (let i = 1; i <= total; i++) timers.push(window.setTimeout(() => alive && setShownFindings(i), 500 + i * STEP_MS))
    const tSolve = 500 + (total + 1) * STEP_MS
    timers.push(window.setTimeout(() => {
      if (!alive) return
      setPhase('solving')
      const t0 = performance.now(), dur = 1400
      const tick = () => {
        if (!alive) return
        const k = Math.min(1, (performance.now() - t0) / dur)
        const e = 1 - Math.pow(1 - k, 3)
        setGap(+(report.minGapBefore + (report.minGapAfter - report.minGapBefore) * e).toFixed(2))
        setShownRegions(Math.ceil(e * (after.regions.length + after.lines.length)))
        if (k < 1) raf.current = requestAnimationFrame(tick)
        else setPhase('done')
      }
      raf.current = requestAnimationFrame(tick)
    }, tSolve))
    timers.push(window.setTimeout(() => alive && setRun((r) => r + 1), tSolve + 1400 + 9000))
    return () => { alive = false; timers.forEach(clearTimeout); cancelAnimationFrame(raf.current) }
  }, [run]) // eslint-disable-line react-hooks/exhaustive-deps

  const partial: Tdm = useMemo(() => {
    const n = Math.min(after.regions.length, shownRegions)
    const m = Math.max(0, shownRegions - after.regions.length)
    const ids = new Set([...after.regions.slice(0, n).map((r) => r.id), ...after.lines.slice(0, m).map((l) => l.id)])
    return { ...after, regions: after.regions.slice(0, n), lines: after.lines.slice(0, m), relations: after.relations.filter((r) => ids.has(r.from) && ids.has(r.to)), key: after.key.filter((k) => ids.has(k.regionId)), readingOrder: after.readingOrder.filter((id) => ids.has(id)) }
  }, [after, shownRegions])

  const visible = findings.slice(0, shownFindings)
  const solved = phase === 'done'

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

      <section className="op-hero">
        <div className="op-pane op-photo">
          <div className="op-label"><span className="kicker">01 · what the teacher drew</span><span className="mono">bio-heart-02.png · photographed, not vectorised</span></div>
          <div className="op-photo-frame">
            <img src="/opener/heart.png" alt="A textbook line drawing of the human heart with nine printed labels" />
            <div className="op-scan" aria-hidden />
          </div>
          <div className="op-facts mono">
            <span>{draft.regions.length} regions</span><span>9 labels read</span><span>{draft.lines.length} strokes kept</span><span>0.8 s</span>
          </div>
        </div>

        <div className="op-pane op-tactile">
          <div className="op-label"><span className="kicker">03 · what the fingertip gets</span><span className="mono">A4 · millimetres · one verified model</span></div>
          <div className={`op-sheet ${solved ? 'on' : ''}`}>
            {phase === 'findings' ? (
              <TdmCanvas tdm={before} showRefs={false} ink="#9aa7a6" paper="#fbf8f2" />
            ) : (
              <TdmCanvas tdm={partial} showRefs showKey={solved} ink="#0c2b2d" paper="#fbf8f2" />
            )}
          </div>
          <div className="op-facts mono">
            <span>{after.regions.length} regions</span><span>{report.textures} textures</span><span>{after.lines.length} raised lines</span><span>{after.key.length}-entry braille key</span>
          </div>
        </div>

        <div className="op-pane op-validator">
          <div className="op-label"><span className="kicker">02 · the validator, then the solver</span><span className="mono">{phase === 'findings' ? `${visible.length} of ${findings.length} blocking` : solved ? '0 blocking · ready to publish' : 'separating…'}</span></div>
          <ol className="op-findings mono">
            {visible.map((f, i) => (
              <li key={i} className={solved ? 'fixed' : ''}><em>{f.rule}</em><span>{f.msg}</span></li>
            ))}
            {findings.length > 7 && shownFindings >= 7 && <li className={`more ${solved ? 'fixed' : ''}`}><em>…</em><span>{findings.length - 7} more</span></li>}
            {phase !== 'findings' && <li className="solve"><em>FIX</em><span>{report.separationPasses} separation pass{report.separationPasses === 1 ? '' : 'es'} · {report.dropped.length} slivers dropped · {report.textures} textures assigned</span></li>}
          </ol>
          <div className="op-counter">
            <span className="kicker">minimum gap between raised elements</span>
            <div className="op-gap"><b className={solved ? 'ok' : ''}>{gap.toFixed(2)}</b><span className="mono">mm</span><span className="mono op-rule">rule S1 · ≥ 3.0 mm · BANA 2010</span></div>
          </div>
          <button className="btn ghost op-replay" onClick={() => setRun((r) => r + 1)}>replay</button>
        </div>
      </section>

      <section className="op-why">
        <div className="op-sentence">
          <h1 className="h1">A textbook can have a braille edition.<br />A blackboard can't.</h1>
          <p>Every diagram a teacher draws, photocopies or projects is invisible to a blind student on the day it is taught. TouchSight reads the diagram's structure, redesigns that structure for a fingertip, and renders one verified model as touch, audio, quiz and print.</p>
        </div>
        <dl className="op-physics mono">
          <div><dt>1–2 mm</dt><dd>what a fingertip resolves. Raised lines closer than ~3 mm merge into one ridge, so geometry is re-spaced, not scaled.</dd></div>
          <div><dt>serial</dt><dd>touch reads one region at a time where vision reads in parallel, so detail is cut to what survives serial reading.</dd></div>
          <div><dt>no colour</dt><dd>shading, gradients and hairlines carry nothing to the skin, so meaning moves into texture, outline and a braille key.</dd></div>
        </dl>
      </section>

      <section className="op-doors">
        <Link className="op-door teacher" to="/teacher">
          <span className="kicker">Teacher console · laptop</span>
          <b>Photograph, review, publish</b>
          <span className="mono">capture → understand → validator → fix → publish → export SVG · STL · BRF</span>
        </Link>
        <Link className="op-door student" to="/student">
          <span className="kicker">Student app · phone, installed, offline</span>
          <b>Feel it, hear it, be quizzed</b>
          <span className="mono">haptic explore · audio tour · find-the-part quiz · braille key · EN हिं ਪੰ</span>
        </Link>
        <Link className="op-door stage" to="/stage">
          <span className="kicker">Projector · the room</span>
          <b>Watch the finger live</b>
          <span className="mono">trail · boundary flash · captions · quiz target · round trip in ms</span>
        </Link>
      </section>

      <footer className="op-foot mono">
        <span>benchmark · 8 figures · labels read 83% · regions named 35% (100% on clean line art) · geometry clean 8/8 · exports 8/8 · median 1.7 s</span>
        <span>numbers from benchmark/RESULTS.md · limits in benchmark/LIMITS.md</span>
      </footer>
    </main>
  )
}
