import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { TouchSheet } from './TouchSheet'
import { ValidatorReplay, useDraftFacts } from './ValidatorReplay'
import { BrailleLine, Count } from './BrailleLine'
import { useReveal, useActiveSection } from './useReveal'
import { BrailleCells } from '../../components/BrailleCells'
import { TdmCanvas } from '../../components/TdmCanvas'
import type { Tdm } from '../../tdm/types'
import heartJson from '../../samples/sample-heart.tdm.json'
import heartPhoto from '../../opener/heart.png'
import shotConsole from '../../assets/landing/teacher-relations-1440.jpg'
import shotPhone from '../../assets/landing/student-explore.jpg'
import shotStage from '../../assets/landing/stage-trail.jpg'
import './landing.css'

const heart = heartJson as unknown as Tdm

const SECTIONS = [
  { id: 'top', ref: 'a', name: 'The sheet' },
  { id: 'gap', ref: 'b', name: 'The gap' },
  { id: 'compile', ref: 'c', name: 'Compiled' },
  { id: 'validator', ref: 'd', name: 'Validator' },
  { id: 'teacher', ref: 'e', name: 'Teacher' },
  { id: 'surfaces', ref: 'f', name: 'Surfaces' },
  { id: 'measured', ref: 'g', name: 'Measured' },
  { id: 'limits', ref: 'h', name: 'Limits' },
]
const IDS = SECTIONS.map((s) => s.id)
const BRL: Record<string, string> = { a: '⠁', b: '⠃', c: '⠉', d: '⠙', e: '⠑', f: '⠋', g: '⠛', h: '⠓' }

const RULES: [string, string, string, string][] = [
  ['S1', 'separation between raised elements', '≥ 3.0 mm', 'blocks'], ['S2', 'minimum region area · line length', '≥ 60 mm² · ≥ 8 mm', 'blocks'], ['S3', 'minimum raised line width', '≥ 1.2 mm', 'blocks'],
  ['T1', 'neighbouring regions differ in texture', 'within 5 mm', 'blocks'], ['K1', 'braille key fits the sheet as it prints', '10 mm pitch · 6 mm cells', 'blocks'], ['M1', 'everything inside the margins', '15 mm', 'blocks'],
  ['R1', 'relations reference existing parts', '—', 'blocks'], ['R2', 'every part in the reading order once', '—', 'blocks'], ['R3', 'every detected relation confirmed or removed by a teacher', '—', 'blocks'],
  ['O1', 'OCR confidence of every label used', '≥ 0.75', 'advises'], ['N1', 'every part has a real name', '—', 'advises'],
]
const BENCH: [string, string, string, string, string][] = [
  ['bio-digestive-01', 'hard', '29/30 · 97%', '3/7 · 43%', '6 · 1/4'], ['bio-eye-01', 'medium', '18/19 · 95%', '1/7 · 14%', '1 · 0/3'], ['bio-flower-01', 'medium', '16/17 · 94%', '1/6 · 17%', '3 · 0/5'],
  ['bio-heart-01', 'hard', '9/14 · 64%', '0/4 · 0%', '7 · 0/4'], ['bio-heart-02', 'easy', '9/9 · 100%', '4/4 · 100%', '6 · 2/4'], ['bio-plantcell-01', 'medium', '21/22 · 95%', '2/6 · 33%', '5 · 0/3'],
  ['bio-plantcell-02', 'easy', '6/8 · 75%', '4/9 · 44%', '1 · 0/2'], ['geo-watercycle-01', 'hard', '11/24 · 46%', '1/4 · 25%', '4 · 0/3'],
]
const LIMITS: [string, string][] = [
  ['regions', 'Naming regions on colour figures is the weak link: 35% across the set, 100% on clean line art. Labels are read well; tying a label to the right enclosed area fails over gradients and broken leader lines. The teacher renames in the console.'],
  ['relations', 'Relations are proposed from stroke adjacency only. They are often wrong, which is why rule R3 blocks every one until a teacher confirms it.'],
  ['figures', 'Shaded 3-D colour figures read at 64% and low-resolution paintings at 46% label recall. Hand-drawn chalk on a blackboard is not supported; clean printed, photocopied or projected figures are the target.'],
  ['haptics', 'Vibration is Android-only; iOS Safari has no Vibration API. Audio, quiz and print work everywhere. The phone screen is for exploration; the raised print is the study artefact.'],
  ['projector', 'The live mirror needs the phone and laptop on one link, a hotspot and tunnel or the same machine. The student app itself needs no network.'],
  ['braille', 'UEB grade 1, Bharati Hindi and Punjabi tables run through liblouis and have not yet been checked by a braille reader.'],
]

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
        <nav className="ld-nav">
          <a href="#compile">How it compiles</a><a href="#validator">How it is checked</a><a href="#measured">Measured</a><a href="#limits">What it cannot do</a>
        </nav>
        <div className="ld-mast-r mono"><span>runs in the browser · no server · Wi-Fi off</span><Link to="/teacher" className="ld-go">Open the console →</Link></div>
      </header>
      <div className="ld-strip mono"><span>an accessibility compiler for diagrams</span><span>photo → understand → simplify → validate → teacher → one model → touch · voice · quiz · print</span><span>English · हिन्दी · ਪੰਜਾਬੀ</span></div>

      <aside className="ld-index" aria-label="sections">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className={active === s.id ? 'on' : ''} title={s.name}>
            <BrailleCells text={BRL[s.ref]} ink="currentColor" guide="rgba(16,41,43,.14)" scale={1.25} max={1} />
            <span className="mono">{s.ref}</span>
          </a>
        ))}
      </aside>

      {/* a · hero */}
      <section className="ld-hero" id="top">
        <div className="ld-hero-copy">
          <p className="ld-eyebrow mono" data-rv>the diagram a blind student never gets</p>
          <h1 className="ld-h1" data-rv>A textbook can have a braille edition.<br /><em>A blackboard can't.</em></h1>
          <BrailleLine text="A textbook can have a braille edition. A blackboard can't." max={40} scale={1.35} className="ld-h1-brl" />
          <p className="ld-lede" data-rv style={{ ['--d' as string]: '.1s' }}>Every diagram a teacher draws, photocopies or projects is invisible to a blind student on the day it is taught. TouchSight reads the diagram's structure, redesigns it for a fingertip, and renders one verified model as touch, voice, quiz and print.</p>
          <div className="ld-dock" data-rv style={{ ['--d' as string]: '.18s' }}>
            <Link className="ld-btn solid" to="/teacher">Photograph a diagram →</Link>
            <Link className="ld-btn" to="/student">Open the student app</Link>
            <a className="ld-btn ghost" href="#compile">How it works ↓</a>
          </div>
          <dl className="ld-physics" data-rv style={{ ['--d' as string]: '.26s' }}>
            <div><dt>1–2 mm</dt><dd>is what a fingertip resolves. Raised lines closer than 3 mm merge into one ridge, so geometry is re-spaced, not scaled.</dd></div>
            <div><dt>serial</dt><dd>is how touch reads: one region at a time, where vision reads in parallel. Detail is cut to what survives serial reading.</dd></div>
            <div><dt>no colour</dt><dd>reaches the skin. Shading, gradients and hairlines carry nothing, so meaning moves into texture, outline and a braille key.</dd></div>
          </dl>
        </div>
        <div className="ld-hero-sheet" data-rv style={{ ['--d' as string]: '.12s' }}>
          <div className="ld-sheet-label mono"><span>what the fingertip gets · the student app, live</span><span>{heart.regions.length} parts · {textures} textures · {heart.key.length}-entry key</span></div>
          <TouchSheet tdm={heart} onFocus={setSheetFocus} />
        </div>
      </section>

      <div className="ld-ticker" aria-hidden>
        <div className="ld-ticker-in mono">
          {[...facts.findings.slice(0, 12), ...facts.findings.slice(0, 12)].map((f, i) => <span key={i}><em>{f.rule}</em> {f.msg}</span>)}
        </div>
      </div>

      {/* b · the gap */}
      <section className="ld-sec ld-gap" id="gap">
        <div className="ld-sec-head">
          <p className="ld-eyebrow mono" data-rv>⠼⠁ 01 · the gap</p>
          <h2 className="ld-h2" data-rv>"Figure 4.2: diagram of the human heart."</h2>
          <BrailleLine text="Figure 4.2: diagram of the human heart." />
        </div>
        <div className="ld-gap-grid">
          <p className="ld-p" data-rv>That is the whole of what a screen reader gives a blind student for this page. The alt-text names the figure. It does not say where the left atrium sits, that the septum runs down the middle, or that the aorta leaves the left ventricle. Everything a sighted classmate learns from the picture in a glance is simply missing.</p>
          <p className="ld-p" data-rv style={{ ['--d' as string]: '.1s' }}>A braille press can produce a tactile edition of a textbook, months later, for the figures somebody chose. It cannot produce one for the diagram a teacher drew this morning, the worksheet photocopied at lunch, or the slide projected after it. TouchSight is for those: the diagrams that exist for one lesson.</p>
          <div className="ld-gap-fig" data-rv style={{ ['--d' as string]: '.15s' }}>
            <img src={heartPhoto} alt="A textbook line drawing of the heart with nine printed labels" />
            <div className="ld-gap-alt mono"><span>alt</span>"diagram of the human heart"</div>
          </div>
        </div>
      </section>

      {/* c · compiled */}
      <section className="ld-sec" id="compile">
        <div className="ld-sec-head">
          <p className="ld-eyebrow mono" data-rv>⠼⠃ 02 · compiled, not described</p>
          <h2 className="ld-h2" data-rv>What the teacher drew. What the fingertip gets.</h2>
          <BrailleLine text="What the teacher drew. What the fingertip gets." />
          <p className="ld-p" data-rv>An image describer tells the student about a picture. A compiler rebuilds the picture for a different reader. TouchSight's middle stage, the solver, is a constraint solver over real geometry at print size: it re-spaces every boundary to at least 3 mm, drops what cannot be felt, assigns a texture to every region so neighbours differ, lays out a braille key and fixes a reading order.</p>
        </div>
        <div className="ld-compare">
          <figure className="ld-cmp" data-rv>
            <img src={heartPhoto} alt="" />
            <figcaption><span className="mono">before</span><b>bio-heart-02.png</b><span className="mono">9 labels read · 16 strokes · 5 regions · 0.8 s</span></figcaption>
          </figure>
          <div className="ld-cmp-mid" data-rv style={{ ['--d' as string]: '.1s' }}>
            <ol className="mono">
              <li><b>understand</b><span>regions, labels, strokes, OpenCV.js + Tesseract.js, in the browser</span></li>
              <li><b>simplify</b><span>min gap {facts.report.minGapBefore.toFixed(2)} → {facts.report.minGapAfter.toFixed(2)} mm · {facts.report.textures} textures · key laid out</span></li>
              <li><b>validate</b><span>{facts.findings.length} blocking findings → 0</span></li>
              <li><b>review</b><span>a teacher confirms relations, renames, removes</span></li>
              <li><b>publish</b><span>one Tactile Diagram Model, in millimetres</span></li>
            </ol>
          </div>
          <figure className="ld-cmp paper" data-rv style={{ ['--d' as string]: '.18s' }}>
            <div className="ld-cmp-sheet"><TdmCanvas tdm={heart} showRefs paper="transparent" ink="#10292b" highlight={sheetFocus ? [sheetFocus] : []} accent="#e2573f" /></div>
            <figcaption><span className="mono">after</span><b>the tactile sheet</b><span className="mono">{heart.regions.length} regions · {textures} textures · {heart.key.length} key cells · A4</span></figcaption>
          </figure>
        </div>
      </section>

      {/* d · validator */}
      <section className="ld-sec ld-dark" id="validator">
        <div className="ld-sec-head">
          <p className="ld-eyebrow mono" data-rv>⠼⠉ 03 · the validator</p>
          <h2 className="ld-h2" data-rv>A rule, not a vibe.</h2>
          <BrailleLine text="A rule, not a vibe." className="light" />
          <p className="ld-p" data-rv>Every finding is deterministic, located and named after the rule it breaks. A model with one blocking finding cannot be published, by anyone. The replay below is the validator's own output on the heart's first draft, then the solver's fix, live.</p>
        </div>
        <div data-rv><ValidatorReplay /></div>
        <table className="ld-rules mono" data-rv>
          <thead><tr><th>rule</th><th>checks</th><th>threshold</th><th></th></tr></thead>
          <tbody>{RULES.map(([r, c, t, k]) => <tr key={r}><td><em>{r}</em></td><td>{c}</td><td>{t}</td><td className={k}>{k}</td></tr>)}</tbody>
        </table>
      </section>

      {/* e · teacher */}
      <section className="ld-sec" id="teacher">
        <div className="ld-sec-head">
          <p className="ld-eyebrow mono" data-rv>⠼⠙ 04 · the trust beat</p>
          <h2 className="ld-h2" data-rv>The pipeline proposes. A teacher approves.</h2>
          <BrailleLine text="The pipeline proposes. A teacher approves." />
          <p className="ld-p" data-rv>Relations are detected from stroke adjacency, so a septum stroke will propose that the right ventricle connects to the left atrium. That is wrong, and the model says so: rule R3 blocks every detected relation until a teacher confirms, edits or removes it. Nothing reaches a student that a teacher has not signed.</p>
        </div>
        <div className="ld-rel">
          <div className="ld-rel-card no" data-rv><span className="mono">detected · 76%</span><b>Right Ventricle <i>connects to</i> Left Atrium</b><span className="ld-rel-act mono"><s>confirm</s><u>remove ✕</u></span></div>
          <div className="ld-rel-card yes" data-rv style={{ ['--d' as string]: '.12s' }}><span className="mono">detected · 83%</span><b>Right Atrium <i>flows into</i> Right Ventricle</b><span className="ld-rel-act mono"><u>confirm ✓</u><s>remove</s></span></div>
          <div className="ld-rel-card draw" data-rv style={{ ['--d' as string]: '.24s' }}><span className="mono">drawn by the teacher</span><b>Left Atrium <i>flows into</i> Left Ventricle</b><span className="ld-rel-act mono"><u>source · teacher</u></span></div>
          <div className="ld-rel-status" data-rv style={{ ['--d' as string]: '.4s' }}><span className="mono">before</span><s>4 blocking · R3</s><span className="mono">after</span><b>Ready to publish</b></div>
        </div>
      </section>

      {/* f · surfaces */}
      <section className="ld-sec" id="surfaces">
        <div className="ld-sec-head">
          <p className="ld-eyebrow mono" data-rv>⠼⠑ 05 · three surfaces</p>
          <h2 className="ld-h2" data-rv>One model. Three rooms it is read in.</h2>
          <BrailleLine text="One model. Three rooms it is read in." />
        </div>
        <div className="ld-surf">
          <Link to="/teacher" className="ld-surf-card" data-rv>
            <div className="ld-frame laptop"><img src={shotConsole} alt="The teacher console with detected relations awaiting confirmation" /></div>
            <div className="ld-surf-t"><span className="mono">laptop</span><b>Teacher console</b><p>Photograph or drop a figure. Regions, labels and strokes are read in the browser; the solver redesigns; the validator lists every finding by rule; the teacher confirms, renames, merges, publishes, exports.</p><span className="mono">SVG for swell paper · STL relief · BRF key · alt-text</span></div>
          </Link>
          <Link to="/student" className="ld-surf-card" data-rv style={{ ['--d' as string]: '.12s' }}>
            <div className="ld-frame phone"><img src={shotPhone} alt="The student app with a finger on the right atrium" /></div>
            <div className="ld-surf-t"><span className="mono">phone · installed · Wi-Fi off</span><b>Student app</b><p>A finger on the screen feels a tick at every boundary and a different rhythm per texture, hears the part's name at rest, takes an audio tour in reading order, is quizzed with the finger as the answer, and reads the braille key.</p><span className="mono">English · हिन्दी · ਪੰਜਾਬੀ · haptics on Android</span></div>
          </Link>
          <Link to="/stage" className="ld-surf-card" data-rv style={{ ['--d' as string]: '.24s' }}>
            <div className="ld-frame laptop"><img src={shotStage} alt="The projector view mirroring a finger trail across the heart" /></div>
            <div className="ld-surf-t"><span className="mono">projector · the room</span><b>Projector view</b><p>The sighted class watches the finger live: trail, boundary flashes, captions of what is spoken, the quiz target, and the round trip in milliseconds through a relay on the app's own origin.</p><span className="mono">first event on screen in 15–17 ms on one machine</span></div>
          </Link>
        </div>
      </section>

      {/* g · measured */}
      <section className="ld-sec ld-dark" id="measured">
        <div className="ld-sec-head">
          <p className="ld-eyebrow mono" data-rv>⠼⠋ 06 · measured</p>
          <h2 className="ld-h2" data-rv>Eight figures. No teacher. Every number from the run.</h2>
          <BrailleLine text="Eight figures. No teacher. Every number from the run." className="light" />
          <p className="ld-p" data-rv>Headless Chromium, production build, no network, every figure through understand → redesign → validate → exports with nobody correcting anything. Two tables on purpose: a figure can pass every geometric rule and still be semantically wrong.</p>
        </div>
        <div className="ld-stats" data-rv>
          <div><Count to={83} suffix="%" /><span className="mono">labels read · mean of 8</span></div>
          <div><Count to={35} suffix="%" /><span className="mono">regions named · 100% on clean line art</span></div>
          <div><span className="ld-num">8<small>/8</small></span><span className="mono">geometry clean on the first run</span></div>
          <div><span className="ld-num">8<small>/8</small></span><span className="mono">all four exports · every STL shell closed</span></div>
          <div><Count to={1.7} decimals={1} suffix=" s" /><span className="mono">median, photo to four files</span></div>
        </div>
        <table className="ld-bench mono" data-rv>
          <thead><tr><th>figure</th><th>difficulty</th><th>labels read</th><th>regions named</th><th>relations proposed · match truth</th></tr></thead>
          <tbody>{BENCH.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i} className={i === 1 ? `dif ${c}` : ''}>{c}</td>)}</tr>)}</tbody>
        </table>
        <p className="ld-foot mono" data-rv>six figures from Wikimedia Commons, two synthetic line-art schematics · min gap 0.0–1.2 mm → 3.1 mm on every figure · teacher-correction counts and the eyes-closed location test are logged by hand, separately</p>
      </section>

      {/* h · limits */}
      <section className="ld-sec" id="limits">
        <div className="ld-sec-head">
          <p className="ld-eyebrow mono" data-rv>⠼⠛ 07 · what it cannot do yet</p>
          <h2 className="ld-h2" data-rv>The limits, before you find them.</h2>
          <BrailleLine text="The limits, before you find them." />
        </div>
        <ol className="ld-limits">
          {LIMITS.map(([k, v], i) => <li key={k} data-rv style={{ ['--d' as string]: `${i * 0.06}s` }}><span className="mono">{k}</span><p>{v}</p></li>)}
        </ol>
      </section>

      <section className="ld-close">
        <div className="ld-close-l">
          <h2 className="ld-h2" data-rv>Photograph a diagram. Hand the phone to a student.</h2>
          <BrailleLine text="Photograph a diagram. Hand the phone to a student." />
          <div className="ld-dock" data-rv><Link className="ld-btn solid" to="/teacher">Open the teacher console →</Link><Link className="ld-btn" to="/student">Student app</Link><Link className="ld-btn" to="/stage">Projector</Link><Link className="ld-btn ghost" to="/device">Device check</Link></div>
        </div>
        <pre className="ld-cmd mono" data-rv>{`cd app && npm install && npm run build
node scripts/serve.mjs 4173     # /teacher · /student · /stage · relay at /relay
npm test                        # model, solver, validator, explorer, exports`}</pre>
      </section>
      <footer className="ld-foot-bar mono"><span>TouchSight · an accessibility compiler for diagrams</span><span>Tactile Diagram Model 0.1 · millimetres on A4</span><span>OpenCV.js · Tesseract.js · liblouis · React · Vite</span></footer>
    </main>
  )
}
