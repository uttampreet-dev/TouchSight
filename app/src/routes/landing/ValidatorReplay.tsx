import { useEffect, useMemo, useRef, useState } from 'react'
import { TdmCanvas } from '../../components/TdmCanvas'
import { simplify } from '../../tdm/simplify'
import { validate } from '../../tdm/validate'
import type { Tdm } from '../../tdm/types'
import draftJson from '../../opener/heart-draft.json'

/** The validator's real findings on the real first draft of the heart, then the solver's fix, replayed when it scrolls into view. */
const draft = draftJson as unknown as Tdm
const STEP = 380

export function useDraftFacts() {
  return useMemo(() => {
    const d: Tdm = JSON.parse(JSON.stringify(draft))
    d.title = 'The human heart'
    const findings = validate(d).blocking.filter((f) => f.rule !== 'R3')
    const { tdm, report } = simplify(d)
    tdm.relations = tdm.relations.filter((r) => r.source !== 'detected')
    tdm.validation = validate(tdm)
    return { before: d, after: tdm, findings, report }
  }, [])
}

export function ValidatorReplay() {
  const { before, after, findings, report } = useDraftFacts()
  const [shown, setShown] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'findings' | 'solving' | 'done'>('idle')
  const [gap, setGap] = useState(report.minGapBefore)
  const [run, setRun] = useState(0)
  const [started, setStarted] = useState(false)
  const host = useRef<HTMLDivElement>(null)
  const raf = useRef(0)

  useEffect(() => {
    const el = host.current
    if (!el || started) return
    if (!('IntersectionObserver' in window)) { setStarted(true); return }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setStarted(true); io.disconnect() } }, { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [started])

  useEffect(() => {
    if (!started) return
    let alive = true
    const timers: number[] = []
    setPhase('findings'); setShown(0); setGap(report.minGapBefore)
    const total = Math.min(findings.length, 8)
    for (let i = 1; i <= total; i++) timers.push(window.setTimeout(() => alive && setShown(i), 300 + i * STEP))
    const tSolve = 300 + (total + 1) * STEP + 400
    timers.push(window.setTimeout(() => {
      if (!alive) return
      setPhase('solving')
      const t0 = performance.now(), dur = 1500
      const tick = () => { if (!alive) return; const k = Math.min(1, (performance.now() - t0) / dur); const e = 1 - Math.pow(1 - k, 3); setGap(+(report.minGapBefore + (report.minGapAfter - report.minGapBefore) * e).toFixed(2)); if (k < 1) raf.current = requestAnimationFrame(tick); else setPhase('done') }
      raf.current = requestAnimationFrame(tick)
    }, tSolve))
    return () => { alive = false; timers.forEach(clearTimeout); cancelAnimationFrame(raf.current) }
  }, [started, run]) // eslint-disable-line react-hooks/exhaustive-deps

  const solved = phase === 'done'
  const visible = findings.slice(0, shown)
  return (
    <div className="vr" ref={host}>
      <div className="vr-sheets">
        <figure className={`vr-sheet ${phase === 'findings' || phase === 'idle' ? 'on' : ''}`}><TdmCanvas tdm={before} showRefs={false} ink="#10292b" paper="#f6f2e9" /><figcaption className="mono">the first draft · {findings.length} blocking</figcaption></figure>
        <figure className={`vr-sheet ${solved || phase === 'solving' ? 'on' : ''}`}><TdmCanvas tdm={after} showRefs={false} ink="#10292b" paper="#f6f2e9" /><figcaption className="mono">after the solver · {after.validation.blocking.length} blocking</figcaption></figure>
      </div>
      <div className="vr-log">
        <div className="vr-head"><span className="mono">validator · rule · finding</span><span className="mono">{phase === 'findings' ? `${visible.length} of ${findings.length}` : solved ? 'ready to publish' : phase === 'solving' ? 'separating…' : 'waiting'}</span></div>
        <ol className="mono">
          {visible.map((f, i) => <li key={i} className={solved ? 'fixed' : ''}><em>{f.rule}</em><span>{f.msg}</span></li>)}
          {findings.length > 8 && shown >= 8 && <li className={solved ? 'fixed' : ''}><em>…</em><span>{findings.length - 8} more</span></li>}
          {phase !== 'findings' && phase !== 'idle' && <li className="solve"><em>FIX</em><span>{report.separationPasses} separation pass{report.separationPasses === 1 ? '' : 'es'} · {report.dropped.length} slivers dropped · {report.textures} textures · key laid out</span></li>}
        </ol>
        <div className="vr-gap">
          <span className="mono">minimum gap between raised elements</span>
          <b className={solved ? 'ok' : ''}>{gap.toFixed(2)}<small> mm</small></b>
          <span className="mono">rule S1 · ≥ 3.0 mm · BANA 2010</span>
          <button className="mono" onClick={() => setRun((r) => r + 1)}>replay</button>
        </div>
      </div>
    </div>
  )
}
