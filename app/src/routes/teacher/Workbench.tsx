import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { understand, draftTdm } from '../../pipeline/understand'
import { simplify, type SimplifyReport } from '../../tdm/simplify'
import { validate } from '../../tdm/validate'
import { rename, remove, merge, setTexture, moveInOrder, markReviewed, addRelation, confirmRelation, removeRelation, setRelation } from '../../tdm/edit'
import { TdmCanvas, TEXTURE_LABEL } from '../../components/TdmCanvas'
import { TEXTURES, RELATION_KINDS, type Tdm, type ValidationFinding, type TdmRelation } from '../../tdm/types'
import { getDiagram, saveDiagram, saveImage, getImage } from '../../store/db'
import { ExportPanel } from '../../components/ExportPanel'
import { area } from '../../tdm/geometry'
import { classroom, teacherRoom } from '../../class/classroom'

type Step = 'capture' | 'understand' | 'review' | 'published'

/** Capture → understand → simplify → review and fix → publish. One screen, the state machine on the left rail. */
export function Workbench() {
  const { id: routeId } = useParams()
  const nav = useNavigate()
  const [step, setStep] = useState<Step>('capture')
  const [file, setFile] = useState<File | null>(null)
  const [stage, setStage] = useState('')
  const [err, setErr] = useState('')
  const [tdm, setTdm] = useState<Tdm | null>(null)
  const [report, setReport] = useState<SimplifyReport | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [mergeWith, setMergeWith] = useState<string | null>(null)
  const [relateFrom, setRelateFrom] = useState<string | null>(null)
  const [chapter, setChapter] = useState('')
  const [title, setTitle] = useState('')
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [found, setFound] = useState<{ regions: number; labels: number; strokes: number; ms: number } | null>(null)
  const [phones, setPhones] = useState(0)
  useEffect(() => { if (step !== 'published') return; const t = setInterval(() => setPhones(classroom.phones), 600); return () => clearInterval(t) }, [step])
  const fileRef = useRef<HTMLInputElement>(null)

  // reopen a saved diagram
  useEffect(() => {
    if (!routeId) return
    getDiagram(routeId).then(async (row) => {
      if (!row) return
      setTdm(row.tdm); setChapter(row.chapter); setTitle(row.tdm.title); setStep(row.published ? 'published' : 'review')
      const im = await getImage(routeId)
      if (im) setImgUrl(URL.createObjectURL(im.blob))
    })
  }, [routeId])

  async function run() {
    if (!file) return
    setErr(''); setStep('understand')
    try {
      const u = await understand(file, setStage)
      setFound({ regions: u.regions.length, labels: u.labels.length, strokes: u.segments.length, ms: u.timings.total })
      const id = (title || file.name.replace(/\.[^.]+$/, '')).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `diagram-${Date.now()}`
      const { tdm: draft } = draftTdm(u, { id, title: title || file.name.replace(/\.[^.]+$/, ''), subject: chapter.split(' ')[0] || 'general', sourceKind: 'photo', file: file.name })
      setStage('redesigning for touch')
      const { tdm: simplified, report } = simplify(draft)
      simplified.validation = validate(simplified)
      await saveImage(id, file, u.prepared.width, u.prepared.height)
      setImgUrl(URL.createObjectURL(file))
      setTdm(simplified); setReport(report); setTitle(simplified.title); setStep('review'); setStage('')
    } catch (e) {
      setErr((e as Error).message); setStep('capture'); setStage('')
    }
  }

  const findings = tdm?.validation ?? { status: 'pending', blocking: [], advisory: [] }
  const canPublish = !!tdm && findings.status === 'pass'
  const sel = useMemo(() => (tdm && selected ? tdm.regions.find((r) => r.id === selected) ?? tdm.lines.find((l) => l.id === selected) ?? null : null), [tdm, selected])
  const highlight = useMemo(() => {
    if (!tdm) return []
    const f = [...findings.blocking, ...findings.advisory].find((x) => selected && x.ids.includes(selected))
    return f ? f.ids : []
  }, [tdm, findings, selected])

  async function saveDraft(t: Tdm) {
    setTdm(t)
    await saveDiagram(t, chapter || 'drafts', false)
  }

  async function publish() {
    if (!tdm || !canPublish) return
    const t = markReviewed({ ...tdm, title: title || tdm.title })
    await saveDiagram(t, chapter || 'General', true)
    classroom.join(teacherRoom(), 'console'); classroom.publish(t)
    setTdm(t); setStep('published')
  }

  function onPick(id: string | null) {
    if (mergeWith && id && id !== mergeWith && tdm) { saveDraft(merge(tdm, mergeWith, id)); setMergeWith(null); setSelected(mergeWith); return }
    if (relateFrom && id && id !== relateFrom && tdm) { saveDraft(addRelation(tdm, relateFrom, id, 'connects', 'forward')); setRelateFrom(null); setSelected(relateFrom); return }
    setSelected(id)
  }
  const nameOf = (id: string) => tdm?.regions.find((r) => r.id === id)?.name.en ?? tdm?.lines.find((l) => l.id === id)?.name.en ?? id
  useEffect(() => { (window as unknown as { __wb?: Tdm | null }).__wb = tdm }, [tdm])

  const STEPS: [Step, string, string][] = [['capture', 'Capture', 'photo or page'], ['understand', 'Understand', 'regions · labels · strokes'], ['review', 'Review & fix', 'validator · teacher'], ['published', 'Published', 'phone · print · projector']]
  const stepIdx = STEPS.findIndex((x) => x[0] === step)
  const blockingSel = highlight.length ? [...findings.blocking, ...findings.advisory].find((x) => selected && x.ids.includes(selected))?.at ?? null : null
  const reset = () => { setStep('capture'); setTdm(null); setFile(null); setReport(null); setSelected(null); setFound(null); setImgUrl(null) }

  return (
    <div className="wb">
      <div className="wb-steps">
        <ol>
          {STEPS.map(([s, label, note], i) => (
            <li key={s} className={`${step === s ? 'on' : ''} ${stepIdx > i ? 'done' : ''}`}>
              <span className="mono wb-step-n">{stepIdx > i ? '✓' : `0${i + 1}`}</span>
              <span className="wb-step-t"><b>{label}</b><span className="mono">{note}</span></span>
            </li>
          ))}
        </ol>
        <div className="wb-report mono">
          {report ? <>
            <span>regions <b>{report.regionsIn} → {report.regionsOut}</b></span>
            <span>lines <b>{report.linesIn} → {report.linesOut}</b></span>
            <span>min gap <b>{report.minGapBefore === Infinity ? '—' : report.minGapBefore} → {report.minGapAfter === Infinity ? '—' : report.minGapAfter} mm</b></span>
            <span>textures <b>{report.textures}</b> · passes <b>{report.separationPasses}</b>{report.dropped.length > 0 && <> · <em>{report.dropped.length} dropped</em></>}</span>
          </> : <span>{step === 'capture' ? 'one model · touch · voice · quiz · print' : stage || 'working'}</span>}
        </div>
      </div>

      <div className="wb-table">
        {/* 01 · source */}
        <section className="wb-pane wb-source">
          <header className="wb-pane-h"><span className="kicker">01 · Source</span><span className="mono">{file ? file.name : routeId ? routeId : 'photo · worksheet · slide · board'}</span></header>
          <div className="wb-pane-b">
            {step === 'capture' ? (
              <div className="wb-capture">
                <div className="wb-drop" onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) setFile(f) }}>
                  <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  {file ? <img src={URL.createObjectURL(file)} alt="" /> : (
                    <div className="wb-drop-empty">
                      <svg viewBox="0 0 48 48" width="52" height="52" aria-hidden><rect x="6" y="10" width="36" height="28" rx="4" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="24" cy="24" r="7" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M16 10l3-4h10l3 4" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
                      <b>Photograph it, or drop the page here</b>
                      <span className="mono">tap for the camera · or choose a file</span>
                    </div>
                  )}
                </div>
                <div className="wb-fields">
                  <label><span className="kicker">Title</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="The human heart" /></label>
                  <label><span className="kicker">Chapter</span><input value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="Biology · Class 10 · Life processes" /></label>
                </div>
                {err && <div className="wb-err mono">{err}</div>}
                <button className="btn primary wb-go" disabled={!file} onClick={run}>Understand this diagram →</button>
              </div>
            ) : (
              <div className={`wb-photo ${step === 'understand' ? 'scanning' : ''}`}>
                {imgUrl || file ? <img src={imgUrl ?? URL.createObjectURL(file!)} alt="" /> : <div className="wb-ghost mono">no source image stored</div>}
                {step === 'understand' && <div className="wb-scan" aria-hidden />}
              </div>
            )}
          </div>
          <footer className="wb-pane-f mono">
            {found ? <><span>{found.regions} regions</span><span>{found.labels} labels</span><span>{found.strokes} strokes</span><span>{(found.ms / 1000).toFixed(1)} s</span></> : <span>{step === 'understand' ? stage || 'reading' : 'what the pipeline read appears here'}</span>}
          </footer>
        </section>

        {/* 02 · sheet */}
        <section className="wb-pane wb-sheet">
          <header className="wb-pane-h"><span className="kicker">02 · Tactile sheet</span><span className="mono">A4 · 210 × 297 mm</span></header>
          <div className="wb-pane-b wb-canvas-body">
            {tdm && step !== 'understand' ? (
              <TdmCanvas tdm={tdm} selected={selected} highlight={highlight} onSelect={onPick} showKey showRelations paper="#fbf8f1" marker={blockingSel} />
            ) : (
              <div className="wb-ghost-sheet"><span className="mono">{step === 'understand' ? (stage || 'redesigning for a fingertip') + '…' : 'the redesigned sheet appears here'}</span></div>
            )}
          </div>
          <footer className="wb-pane-f mono">
            {tdm ? <><span>{tdm.regions.length} regions</span><span>{tdm.lines.length} lines</span><span>{tdm.key.length} key</span><span>{tdm.relations.length} relations</span></> : <span>regions re-spaced to ≥ 3 mm · textures · braille key · reading order</span>}
          </footer>
        </section>

        {/* 03 · checks and edits */}
        <section className="wb-pane wb-inspector">
          <header className="wb-pane-h"><span className="kicker">03 · Checks & edits</span><span className="mono">{tdm ? `${findings.blocking.length} blocking · ${findings.advisory.length} advisory` : 'S1 S2 S3 T1 K1 M1 R1 R2 R3 · O1 N1'}</span></header>
          <div className="wb-pane-b wb-checks">
            {!tdm || step === 'understand' ? (
              <ol className="wb-rules-ghost mono">
                {[['S1', 'separation ≥ 3 mm'], ['S2', 'area ≥ 60 mm² · length ≥ 8 mm'], ['S3', 'line width ≥ 1.2 mm'], ['T1', 'neighbours differ in texture'], ['K1', 'braille key fits the sheet'], ['M1', 'inside the 15 mm margin'], ['R1', 'relations reference parts'], ['R2', 'reading order complete'], ['R3', 'detected relations confirmed'], ['O1', 'OCR confidence ≥ 0.75'], ['N1', 'every part named']].map(([r, t]) => <li key={r}><em>{r}</em><span>{t}</span></li>)}
              </ol>
            ) : (
              <>
                <div className="wb-status" data-status={findings.status}>
                  <b>{findings.status === 'pass' ? 'Ready to publish' : `${findings.blocking.length} blocking`}</b>
                  <span className="mono">{findings.advisory.length} advisory</span>
                </div>
                <div className="wb-findings">
                  {[...findings.blocking.map((f) => ({ ...f, blocking: true })), ...findings.advisory.map((f) => ({ ...f, blocking: false }))].map((f, i) => (
                    <Finding key={i} f={f} blocking={f.blocking} onClick={() => setSelected(f.ids[0] ?? null)} active={!!selected && f.ids.includes(selected)} />
                  ))}
                </div>

                {sel && (
                  <section className="wb-sel">
                    <div className="kicker">{sel.id} · key {sel.keyRef}</div>
                    <input className="wb-name" value={sel.name.en} onChange={(e) => saveDraft(rename(tdm, sel.id, 'en', e.target.value))} />
                    {'polygon' in sel && (
                      <>
                        <div className="mono wb-sel-facts">{area(sel.polygon).toFixed(0)} mm² · {sel.polygon.length} vertices{sel.sourceLabel ? ` · read "${sel.sourceLabel.text}" at ${Math.round(sel.sourceLabel.ocrConfidence * 100)}%` : ''}</div>
                        <div className="wb-textures">
                          {TEXTURES.filter((t) => t !== 'empty').map((t) => (
                            <button key={t} className={`btn ${sel.texture === t ? 'primary' : ''}`} onClick={() => saveDraft(setTexture(tdm, sel.id, t))}>{TEXTURE_LABEL[t]}</button>
                          ))}
                        </div>
                      </>
                    )}
                    <div className="wb-sel-tools">
                      <button className="btn" onClick={() => saveDraft(moveInOrder(tdm, sel.id, -1))}>↑ earlier</button>
                      <button className="btn" onClick={() => saveDraft(moveInOrder(tdm, sel.id, 1))}>↓ later</button>
                      {'polygon' in sel && <button className={`btn ${mergeWith ? 'coral' : ''}`} onClick={() => { setRelateFrom(null); setMergeWith(mergeWith ? null : sel.id) }}>{mergeWith ? 'click the other region…' : 'merge with…'}</button>}
                      <button className={`btn ${relateFrom ? 'coral' : ''}`} onClick={() => { setMergeWith(null); setRelateFrom(relateFrom ? null : sel.id) }}>{relateFrom ? 'click the target…' : 'relate to…'}</button>
                      <button className="btn wb-remove" onClick={() => { saveDraft(remove(tdm, sel.id)); setSelected(null) }}>remove</button>
                    </div>
                  </section>
                )}

                <section>
                  <div className="kicker wb-k">Relations · {tdm.relations.length}{tdm.relations.some((r) => r.source === 'detected') ? ` · ${tdm.relations.filter((r) => r.source === 'detected').length} to confirm` : ''}</div>
                  {!tdm.relations.length && <div className="mono wb-hint">none yet — select a part, then "relate to…" and click the target</div>}
                  <ul className="wb-rels">
                    {tdm.relations.map((rel, i) => (
                      <RelationRow key={`${rel.from}-${rel.to}-${i}`} rel={rel} from={nameOf(rel.from)} to={nameOf(rel.to)} active={!!selected && (rel.from === selected || rel.to === selected)}
                        onKind={(k) => saveDraft(setRelation(tdm, i, { kind: k }))}
                        onDirection={() => saveDraft(setRelation(tdm, i, { direction: rel.direction === 'forward' ? 'backward' : rel.direction === 'backward' ? 'both' : 'forward' }))}
                        onConfirm={() => saveDraft(confirmRelation(tdm, i))}
                        onRemove={() => saveDraft(removeRelation(tdm, i))}
                        onSelect={() => setSelected(rel.from)} />
                    ))}
                  </ul>
                </section>

                <section>
                  <div className="kicker wb-k">Reading order · {tdm.readingOrder.length} elements</div>
                  <ol className="wb-order">
                    {tdm.readingOrder.map((id) => {
                      const el = tdm.regions.find((r) => r.id === id) ?? tdm.lines.find((l) => l.id === id)
                      if (!el) return null
                      return <li key={id} className={selected === id ? 'on' : ''} onClick={() => setSelected(id)}><span className="mono">{el.keyRef}</span>{el.name.en}<em>{'polygon' in el ? TEXTURE_LABEL[el.texture] : `line · ${el.style}`}</em></li>
                    })}
                  </ol>
                </section>
              </>
            )}
          </div>
          <footer className="wb-pane-f wb-publish">
            {step === 'published' && tdm ? (
              <div className="wb-published">
                <div className="wb-pub-row"><b>Published</b><span className="mono">pushed to {phones} phone{phones === 1 ? '' : 's'} in class {teacherRoom()} · they keep it offline</span><button className="btn" onClick={() => nav('/teacher/library')}>Library</button><button className="btn" onClick={reset}>New</button></div>
                <ExportPanel tdm={tdm} />
              </div>
            ) : tdm && step === 'review' ? (
              <>
                <label className="wb-chapter"><span className="kicker">Chapter</span><input value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="Biology · Class 10" /></label>
                <button className="btn primary wb-go" disabled={!canPublish} onClick={publish}>{canPublish ? 'Publish to students →' : 'Fix blocking findings to publish'}</button>
              </>
            ) : <span className="mono">publishing needs zero blocking findings</span>}
          </footer>
        </section>
      </div>
    </div>
  )
}

const KIND_WORD: Record<TdmRelation['kind'], string> = { 'flows-into': 'flows into', connects: 'connects to', contains: 'contains', 'part-of': 'is part of', 'points-to': 'points to', 'greater-than': 'is greater than' }
const DIR_GLYPH: Record<TdmRelation['direction'], string> = { forward: '→', backward: '←', both: '↔' }

function RelationRow({ rel, from, to, active, onKind, onDirection, onConfirm, onRemove, onSelect }: { rel: TdmRelation; from: string; to: string; active: boolean; onKind: (k: TdmRelation['kind']) => void; onDirection: () => void; onConfirm: () => void; onRemove: () => void; onSelect: () => void }) {
  const detected = rel.source === 'detected'
  return (
    <li className={`wb-rel ${detected ? 'detected' : ''} ${active ? 'on' : ''}`}>
      <div className="wb-rel-sentence" onClick={onSelect}>
        <b>{from}</b>
        <select className="wb-rel-kind" value={rel.kind} onChange={(e) => onKind(e.target.value as TdmRelation['kind'])} onClick={(e) => e.stopPropagation()}>
          {RELATION_KINDS.map((k) => <option key={k} value={k}>{KIND_WORD[k]}</option>)}
        </select>
        <b>{to}</b>
      </div>
      <div className="wb-rel-tools">
        <span className="mono">{detected ? `detected${rel.confidence != null ? ` · ${Math.round(rel.confidence * 100)}%` : ''}` : 'teacher'}</span>
        <button className="btn" title="direction" onClick={onDirection}>{DIR_GLYPH[rel.direction]}</button>
        {detected && <button className="btn primary ok" onClick={onConfirm}>✓ confirm</button>}
        <button className="btn no" style={{ color: 'var(--coral)' }} onClick={onRemove}>✕</button>
      </div>
    </li>
  )
}

function Finding({ f, blocking, onClick, active }: { f: ValidationFinding; blocking: boolean; onClick: () => void; active: boolean }) {
  return (
    <button className={`wb-finding ${blocking ? 'block' : 'adv'} ${active ? 'on' : ''}`} onClick={onClick}>
      <span className="mono">{f.rule}</span>
      <span>{f.msg}</span>
    </button>
  )
}
