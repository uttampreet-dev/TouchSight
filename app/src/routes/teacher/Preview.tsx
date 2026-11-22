import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { listDiagrams } from '../../store/db'
import { SAMPLES } from '../../samples'
import type { Tdm } from '../../tdm/types'

/**
 * The classroom on one screen: the student's phone and the projector side by side, both the real surfaces in frames,
 * joined by the same channel they use in a room. The pointer is the finger. Nothing here is a recording.
 */
const QUESTIONS = ['How many parts are there?', 'Where is the left ventricle?', 'What is next to the right atrium?', 'What does the right ventricle do?', 'Start quiz']

export function Preview() {
  const { id } = useParams()
  const nav = useNavigate()
  const [mine, setMine] = useState<Tdm[]>([])
  const [stageReady, setStageReady] = useState(false)
  const [guide, setGuide] = useState(false)
  const [k, setK] = useState(0.8)
  const [run, setRun] = useState(0)
  const well = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const [q, setQ] = useState('')
  // a typed question goes down the same path as a spoken one: answered from the published model, aloud and on the projector
  const ask = (text: string) => { const t = text.trim(); if (!t) return; (frame.current?.contentWindow as unknown as { __tsVoice?: (p: string) => void } | null)?.__tsVoice?.(t); setQ('') }
  useEffect(() => { listDiagrams(true).then((r) => setMine(r.map((x) => x.tdm))).catch(() => {}) }, [])
  const all = [...mine, ...SAMPLES.filter((s) => !mine.some((m) => m.id === s.id))]
  const cur = id ?? all[0]?.id ?? 'sample-heart'
  const title = all.find((d) => d.id === cur)?.title ?? cur

  // the phone is drawn at its real size (390 × 844 css px) and scaled to the pane
  useEffect(() => {
    const el = well.current
    if (!el) return
    const fit = () => setK(Math.min(1, (el.clientHeight - 36) / 868, (el.clientWidth - 36) / 414))
    fit()
    const ro = new ResizeObserver(fit); ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="pv">
      <div className="pv-bar">
        <div className="pv-bar-l">
          <span className="kicker">Classroom on one screen</span>
          <select value={cur} onChange={(e) => { setGuide(false); nav(`/teacher/preview/${e.target.value}`) }} aria-label="diagram">
            {all.map((d) => <option key={d.id} value={d.id}>{d.title}{mine.some((m) => m.id === d.id) ? '' : ' · sample'}</option>)}
          </select>
          <button className={`btn ${guide ? 'coral' : ''}`} onClick={() => { setGuide((g) => !g); setRun((n) => n + 1) }}>{guide ? 'guided tour on' : 'start the guided tour'}</button>
          <button className="btn" onClick={() => setRun((n) => n + 1)}>restart</button>
        </div>
        <span className="mono pv-hint">press and drag on the phone: the pointer is the student's finger · sound on</span>
      </div>
      <div className="pv-table">
        <section className="wb-pane pv-phone">
          <header className="wb-pane-h"><span className="kicker">01 · The student's phone</span><span className="mono">{title}</span></header>
          <div className="wb-pane-b pv-well" ref={well}>
            <div className="pv-device" style={{ width: 414 * k, height: 868 * k }}>
              <div className="pv-bezel" style={{ transform: `scale(${k})` }}>
                {stageReady && <iframe ref={frame} key={`${cur}-${guide}-${run}`} title="Student app" src={`/student/d/${cur}${guide ? '?guide=1' : ''}`} allow="microphone; autoplay" />}
              </div>
            </div>
          </div>
          <footer className="wb-pane-f pv-foot">
            <form className="pv-ask" onSubmit={(e) => { e.preventDefault(); ask(q) }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} list="pv-questions" placeholder="Ask the diagram a question" aria-label="ask the diagram" />
              <datalist id="pv-questions">{QUESTIONS.map((c) => <option key={c} value={c} />)}</datalist>
              <button className="btn primary" type="submit">Ask</button>
            </form>
          </footer>
        </section>
        <section className="wb-pane pv-stage">
          <header className="wb-pane-h"><span className="kicker">02 · The projector</span><span className="mono">what the class and the teacher see, live</span></header>
          <div className="wb-pane-b pv-screen"><iframe title="Projector" src="/stage?local" onLoad={() => setStageReady(true)} /></div>
          <footer className="wb-pane-f pv-foot mono">
            <span className="pv-foot-t">same channel as a real room</span><span className="pv-foot-t pv-foot-2">trail · captions · quiz target</span>
            <span className="pv-chips">{QUESTIONS.slice(0, 3).map((c) => <button key={c} onClick={() => ask(c)}>{c}</button>)}</span>
          </footer>
        </section>
      </div>
    </div>
  )
}
