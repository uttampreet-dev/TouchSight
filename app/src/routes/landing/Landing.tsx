import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { TouchSheet } from './TouchSheet'
import { ValidatorReplay, useDraftFacts } from './ValidatorReplay'
import { BrailleLine, Count } from './BrailleLine'
import { useReveal, useActiveSection } from './useReveal'
import { BrailleCells } from '../../components/BrailleCells'
import { Relief3D } from './Relief3D'
import type { Tdm } from '../../tdm/types'
import heartJson from '../../samples/sample-heart.tdm.json'
import heartPhoto from '../../opener/heart.png'
import shotConsole from '../../assets/landing/teacher-relations-1440.jpg'
import shotPhone from '../../assets/landing/student-explore.jpg'
import shotStage from '../../assets/landing/stage-trail.jpg'
import './landing.css'

const heart = heartJson as unknown as Tdm
const SECTIONS = [
  { id: 'top', ref: 'a', brl: '⠁', name: 'The sheet' },
  { id: 'compile', ref: 'b', brl: '⠃', name: 'Compiled' },
  { id: 'validator', ref: 'c', brl: '⠉', name: 'Checked' },
  { id: 'surfaces', ref: 'd', brl: '⠙', name: 'Surfaces' },
  { id: 'measured', ref: 'e', brl: '⠑', name: 'Measured' },
]
const IDS = SECTIONS.map((s) => s.id)

function tilt(e: React.PointerEvent<HTMLElement>) {
  const el = e.currentTarget, r = el.getBoundingClientRect()
  el.style.setProperty('--rx', `${((e.clientY - r.top) / r.height - 0.5) * -10}deg`)
  el.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 12}deg`)
}
function untilt(e: React.PointerEvent<HTMLElement>) { e.currentTarget.style.setProperty('--rx', '0deg'); e.currentTarget.style.setProperty('--ry', '0deg') }

export function Landing() {
  const root = useRef<HTMLElement>(null)
  const [active, setActive] = useState('top')
  const [sheetFocus, setSheetFocus] = useState<string | null>(null)
  const facts = useDraftFacts()
  useReveal(root)
  useActiveSection(IDS, useCallback((id: string) => setActive(id), []))
  const textures = new Set(heart.regions.map((r) => r.texture).filter((t) => t !== 'empty')).size

  return (
    <main className="ld" ref={root}>
      <header className="ld-mast">
        <Link to="/" className="ld-word"><span className="ld-mark" aria-hidden><i /><i /><i /><i /></span>TouchSight</Link>
        <nav className="ld-nav"><a href="#compile">How it compiles</a><a href="#validator">How it is checked</a><a href="#surfaces">Surfaces</a><a href="#measured">Measured</a></nav>
        <div className="ld-mast-r mono"><span>in the browser · no server · Wi-Fi off</span><Link to="/teacher" className="ld-go">Open the console →</Link></div>
      </header>

      <aside className="ld-index" aria-label="sections">
        {SECTIONS.map((s) => <a key={s.id} href={`#${s.id}`} className={active === s.id ? 'on' : ''} title={s.name}><BrailleCells text={s.brl} ink="currentColor" guide="rgba(127,212,203,.18)" scale={1.25} max={1} /><span className="mono">{s.ref}</span></a>)}
      </aside>

      {/* hero */}
      <section className="ld-hero" id="top">
        <div className="ld-hero-copy">
          <p className="ld-eyebrow mono" data-rv>an accessibility compiler for diagrams</p>
          <h1 className="ld-h1" data-rv>A textbook can have a braille edition.<br /><em>A blackboard can't.</em></h1>
          <BrailleLine text="A textbook can have a braille edition. A blackboard can't." max={40} scale={1.35} className="ld-h1-brl light" />
          <p className="ld-lede" data-rv style={{ ['--d' as string]: '.1s' }}>TouchSight turns any diagram a teacher draws, photocopies or projects into one model a blind student can touch, hear, be quizzed on and print.</p>
          <div className="ld-dock" data-rv style={{ ['--d' as string]: '.18s' }}>
            <Link className="ld-btn solid" to="/teacher">Photograph a diagram →</Link>
            <Link className="ld-btn" to="/student">Open the student app</Link>
          </div>
          <ul className="ld-facts mono" data-rv style={{ ['--d' as string]: '.26s' }}>
            <li><b>1–2 mm</b><span>what a fingertip resolves</span></li>
            <li><b>≥ 3 mm</b><span>between raised lines, or they merge</span></li>
            <li><b>EN · हिं · ਪੰ</b><span>spoken, with a braille key</span></li>
          </ul>
        </div>
        <div className="ld-hero-sheet" data-rv style={{ ['--d' as string]: '.12s' }}>
          <div className="ld-sheet-label mono"><span>the student app · live</span><span>{heart.regions.length} parts · {textures} textures · {heart.key.length}-entry key</span></div>
          <TouchSheet tdm={heart} onFocus={setSheetFocus} />
        </div>
      </section>

      <div className="ld-ticker" aria-hidden><div className="ld-ticker-in mono">{[...facts.findings.slice(0, 12), ...facts.findings.slice(0, 12)].map((f, i) => <span key={i}><em>{f.rule}</em> {f.msg}</span>)}</div></div>

      {/* compiled */}
      <section className="ld-sec" id="compile">
        <div className="ld-sec-head">
          <p className="ld-eyebrow mono" data-rv>⠼⠁ 01 · compiled, not described</p>
          <h2 className="ld-h2" data-rv>What the teacher drew. What the fingertip gets.</h2>
          <BrailleLine text="What the teacher drew. What the fingertip gets." className="light" />
        </div>
        <div className="ld-compare">
          <figure className="ld-cmp" data-rv><img src={heartPhoto} alt="A textbook line drawing of the heart with nine printed labels" /><figcaption><span className="mono">before</span><b>The textbook page</b><span className="mono">9 labels · 16 strokes · 0.8 s to read</span></figcaption></figure>
          <ol className="ld-steps mono" data-rv style={{ ['--d' as string]: '.1s' }}>
            <li><b>understand</b><span>regions · labels · strokes</span></li>
            <li><b>simplify</b><span>{facts.report.minGapBefore.toFixed(1)} → {facts.report.minGapAfter.toFixed(1)} mm · textures · key</span></li>
            <li><b>validate</b><span>{facts.findings.length} findings → 0</span></li>
            <li><b>teacher</b><span>confirms · publishes</span></li>
          </ol>
          <figure className="ld-cmp relief" data-rv style={{ ['--d' as string]: '.18s' }}><Relief3D tdm={heart} highlight={sheetFocus ? [sheetFocus] : []} /><figcaption><span className="mono">after</span><b>The tactile relief</b><span className="mono">{heart.regions.length} regions · {textures} textures · braille key · A4 · prints as STL</span></figcaption></figure>
        </div>
      </section>

      {/* validator */}
      <section className="ld-sec ld-deeper" id="validator">
        <div className="ld-sec-head">
          <p className="ld-eyebrow mono" data-rv>⠼⠃ 02 · checked by rule</p>
          <h2 className="ld-h2" data-rv>Nothing a fingertip can't read gets published.</h2>
          <BrailleLine text="Nothing a fingertip can't read gets published." className="light" />
          <p className="ld-p" data-rv>The validator's own findings on the heart's first draft, then the solver's fix, live.</p>
        </div>
        <div data-rv><ValidatorReplay /></div>
      </section>

      {/* surfaces */}
      <section className="ld-sec" id="surfaces">
        <div className="ld-sec-head">
          <p className="ld-eyebrow mono" data-rv>⠼⠉ 03 · three surfaces</p>
          <h2 className="ld-h2" data-rv>One model. Three rooms it is read in.</h2>
          <BrailleLine text="One model. Three rooms it is read in." className="light" />
        </div>
        <div className="ld-surf">
          <Link to="/teacher" className="ld-surf-card" onPointerMove={tilt} onPointerLeave={untilt} data-rv><div className="ld-frame laptop"><img src={shotConsole} alt="The teacher console" /></div><div className="ld-surf-t"><span className="mono">laptop</span><b>Teacher console</b><p>Photograph, review, publish, export.</p></div></Link>
          <Link to="/student" className="ld-surf-card" onPointerMove={tilt} onPointerLeave={untilt} data-rv style={{ ['--d' as string]: '.12s' }}><div className="ld-frame phone"><img src={shotPhone} alt="The student app" /></div><div className="ld-surf-t"><span className="mono">phone · offline</span><b>Student app</b><p>Feel it, hear it, be quizzed on it.</p></div></Link>
          <Link to="/stage" className="ld-surf-card" onPointerMove={tilt} onPointerLeave={untilt} data-rv style={{ ['--d' as string]: '.24s' }}><div className="ld-frame laptop"><img src={shotStage} alt="The projector view" /></div><div className="ld-surf-t"><span className="mono">projector</span><b>The room</b><p>The class watches the finger live.</p></div></Link>
        </div>
      </section>

      {/* measured */}
      <section className="ld-sec ld-deeper" id="measured">
        <div className="ld-sec-head">
          <p className="ld-eyebrow mono" data-rv>⠼⠙ 04 · measured</p>
          <h2 className="ld-h2" data-rv>Eight figures, no teacher, every number from the run.</h2>
          <BrailleLine text="Eight figures, no teacher, every number from the run." className="light" />
        </div>
        <div className="ld-stats" data-rv>
          <div><Count to={83} suffix="%" /><span className="mono">labels read</span></div>
          <div><Count to={100} suffix="%" /><span className="mono">regions named on line art</span></div>
          <div><span className="ld-num">8<small>/8</small></span><span className="mono">geometry clean first run</span></div>
          <div><span className="ld-num">8<small>/8</small></span><span className="mono">SVG · STL · BRF · alt-text</span></div>
          <div><Count to={1.7} decimals={1} suffix=" s" /><span className="mono">photo to four files</span></div>
        </div>
      </section>

      <section className="ld-close">
        <h2 className="ld-h2 center" data-rv>Photograph a diagram.<br />Hand the phone to a student.</h2>
        <div className="ld-dock center" data-rv><Link className="ld-btn solid" to="/teacher">Open the teacher console →</Link><Link className="ld-btn" to="/student">Student app</Link><Link className="ld-btn" to="/stage">Projector</Link></div>
      </section>
      <footer className="ld-foot-bar mono"><span>TouchSight</span><span>Tactile Diagram Model 0.1 · millimetres on A4</span><span>OpenCV.js · Tesseract.js · liblouis</span></footer>
    </main>
  )
}
