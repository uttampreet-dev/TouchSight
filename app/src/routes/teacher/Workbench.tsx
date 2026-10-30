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
  const [showSource, setShowSource] = useState(false)
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
    setTdm(t); setStep('published')
  }

  function onPick(id: string | null) {
    if (mergeWith && id && id !== mergeWith && tdm) { saveDraft(merge(tdm, mergeWith, id)); setMergeWith(null); setSelected(mergeWith); return }
    if (relateFrom && id && id !== relateFrom && tdm) { saveDraft(addRelation(tdm, relateFrom, id, 'connects', 'forward')); setRelateFrom(null); setSelected(relateFrom); return }
    setSelected(id)
  }
  const nameOf = (id: string) => tdm?.regions.find((r) => r.id === id)?.name.en ?? tdm?.lines.find((l) => l.id === id)?.name.en ?? id
  useEffect(() => { (window as unknown as { __wb?: Tdm | null }).__wb = tdm }, [tdm])

  return (
    <div className="wb">
      <aside className="wb-rail">
        {(['capture', 'understand', 'review', 'published'] as Step[]).map((s, i) => (
          <div key={s} className={`wb-step ${step === s ? 'on' : ''} ${['capture', 'understand', 'review', 'published'].indexOf(step) > i ? 'done' : ''}`}>
            <span className="mono">0{i + 1}</span>
            <b>{s === 'capture' ? 'Capture' : s === 'understand' ? 'Understand' : s === 'review' ? 'Review & fix' : 'Published'}</b>
          </div>
        ))}
        {report && (
          <div className="wb-report mono">
            <div className="kicker" style={{ marginBottom: 6 }}>Redesign report</div>
            <div>regions {report.regionsIn} → {report.regionsOut}</div>
            <div>lines {report.linesIn} → {report.linesOut}</div>
            <div>min gap {report.minGapBefore === Infinity ? '—' : report.minGapBefore + ' mm'} → {report.minGapAfter === Infinity ? '—' : report.minGapAfter + ' mm'}</div>
            <div>textures {report.textures} · passes {report.separationPasses}</div>
            {report.scaledBy !== 1 && <div>scaled ×{report.scaledBy}</div>}
            {report.dropped.length > 0 && <div style={{ color: 'var(--coral)' }}>{report.dropped.length} dropped</div>}
          </div>
        )}
      </aside>

      <main className="wb-main">
        {step === 'capture' && (
          <div className="wb-capture">
            <div className="kicker">New diagram</div>
            <h1 className="h1" style={{ margin: '6px 0 18px' }}>Photograph it, or drop the page here.</h1>
            <div className="wb-drop" onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) setFile(f) }}>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              {file ? <img src={URL.createObjectURL(file)} alt="" style={{ maxHeight: 360, maxWidth: '100%', borderRadius: 10 }} /> : (
                <div style={{ textAlign: 'center', color: 'var(--slate)' }}>
                  <div style={{ fontSize: 44, marginBottom: 8 }}>▣</div>
                  <div style={{ fontWeight: 600 }}>Tap to use the camera or choose a file</div>
                  <div className="mono" style={{ fontSize: 12, marginTop: 6 }}>textbook page · worksheet · slide · board photo</div>
                </div>
              )}
            </div>
            <div className="wb-fields">
              <label><span className="kicker">Title</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="The human heart" /></label>
              <label><span className="kicker">Chapter</span><input value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="Biology · Class 10 · Life processes" /></label>
            </div>
            {err && <div className="card tint-coral" style={{ padding: 12, marginTop: 12 }}>{err}</div>}
            <button className="btn primary" style={{ marginTop: 16, padding: '14px 22px', fontSize: 16 }} disabled={!file} onClick={run}>Understand this diagram</button>
          </div>
        )}

        {step === 'understand' && (
          <div className="wb-capture" style={{ alignItems: 'center', textAlign: 'center' }}>
            <div className="wb-pulse" />
            <div className="kicker" style={{ marginTop: 18 }}>Working</div>
            <div className="h2" style={{ marginTop: 6 }}>{stage || 'starting'}</div>
            <div className="mono" style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>regions · labels · strokes · redesign for a fingertip · validate</div>
          </div>
        )}

        {(step === 'review' || step === 'published') && tdm && (
          <div className="wb-review">
            <div className="wb-canvas">
              <div className="wb-canvas-bar">
                <span className="kicker">{showSource ? 'Source' : 'Tactile layout'} · {tdm.sheet.w}×{tdm.sheet.h} mm</span>
                <span style={{ flex: 1 }} />
                <button className="btn ghost" onClick={() => setShowSource((v) => !v)}>{showSource ? 'show layout' : 'show source'}</button>
              </div>
              <div className="wb-canvas-body">
                {showSource && imgUrl ? <img src={imgUrl} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : (
                  <TdmCanvas tdm={tdm} selected={selected} highlight={highlight} onSelect={onPick} showKey showRelations marker={highlight.length ? [...findings.blocking, ...findings.advisory].find((x) => selected && x.ids.includes(selected))?.at ?? null : null} />
                )}
              </div>
            </div>

            <aside className="wb-inspector">
              <section>
                <div className="wb-status" data-status={findings.status}>
                  <b>{findings.status === 'pass' ? 'Ready to publish' : `${findings.blocking.length} blocking`}</b>
                  <span className="mono">{findings.advisory.length} advisory</span>
                </div>
                {[...findings.blocking.map((f) => ({ ...f, blocking: true })), ...findings.advisory.map((f) => ({ ...f, blocking: false }))].map((f, i) => (
                  <Finding key={i} f={f} blocking={f.blocking} onClick={() => setSelected(f.ids[0] ?? null)} active={!!selected && f.ids.includes(selected)} />
                ))}
              </section>

              {sel && (
                <section className="card" style={{ padding: 12 }}>
                  <div className="kicker">{sel.id} · key {sel.keyRef}</div>
                  <input className="wb-name" value={sel.name.en} onChange={(e) => saveDraft(rename(tdm, sel.id, 'en', e.target.value))} />
                  {'polygon' in sel && (
                    <>
                      <div className="mono" style={{ fontSize: 12, color: 'var(--muted)', margin: '6px 0' }}>{area(sel.polygon).toFixed(0)} mm² · {sel.polygon.length} vertices{sel.sourceLabel ? ` · read "${sel.sourceLabel.text}" at ${Math.round(sel.sourceLabel.ocrConfidence * 100)}%` : ''}</div>
                      <div className="wb-textures">
                        {TEXTURES.filter((t) => t !== 'empty').map((t) => (
                          <button key={t} className={`btn ${sel.texture === t ? 'primary' : ''}`} onClick={() => saveDraft(setTexture(tdm, sel.id, t))}>{TEXTURE_LABEL[t]}</button>
                        ))}
                      </div>
                    </>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    <button className="btn" onClick={() => saveDraft(moveInOrder(tdm, sel.id, -1))}>↑ earlier</button>
                    <button className="btn" onClick={() => saveDraft(moveInOrder(tdm, sel.id, 1))}>↓ later</button>
                    {'polygon' in sel && <button className={`btn ${mergeWith ? 'coral' : ''}`} onClick={() => { setRelateFrom(null); setMergeWith(mergeWith ? null : sel.id) }}>{mergeWith ? 'click the other region…' : 'merge with…'}</button>}
                    <button className={`btn ${relateFrom ? 'coral' : ''}`} onClick={() => { setMergeWith(null); setRelateFrom(relateFrom ? null : sel.id) }}>{relateFrom ? 'click the target…' : 'relate to…'}</button>
                    <button className="btn" style={{ color: 'var(--coral)' }} onClick={() => { saveDraft(remove(tdm, sel.id)); setSelected(null) }}>remove</button>
                  </div>
                </section>
              )}

              <section>
                <div className="kicker" style={{ marginBottom: 6 }}>Relations · {tdm.relations.length}{tdm.relations.some((r) => r.source === 'detected') ? ` · ${tdm.relations.filter((r) => r.source === 'detected').length} to confirm` : ''}</div>
                {!tdm.relations.length && <div className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>none yet — select a part, then "relate to…" and click the target</div>}
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
                <div className="kicker" style={{ marginBottom: 6 }}>Reading order · {tdm.readingOrder.length} elements</div>
                <ol className="wb-order">
                  {tdm.readingOrder.map((id) => {
                    const el = tdm.regions.find((r) => r.id === id) ?? tdm.lines.find((l) => l.id === id)
                    if (!el) return null
                    return <li key={id} className={selected === id ? 'on' : ''} onClick={() => setSelected(id)}><span className="mono">{el.keyRef}</span>{el.name.en}<em>{'polygon' in el ? TEXTURE_LABEL[el.texture] : `line · ${el.style}`}</em></li>
                  })}
                </ol>
              </section>

              <section className="wb-publish">
                <label><span className="kicker">Chapter</span><input value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="Biology · Class 10" /></label>
                {step === 'published' ? (
                  <div className="card tint-teal" style={{ padding: 12 }}>
                    <b>Published.</b> Students can open it now, offline. The same model prints, embosses and reads aloud:
                    <ExportPanel tdm={tdm} />
                    <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}><button className="btn" onClick={() => nav('/teacher/library')}>Library</button><button className="btn" onClick={() => { setStep('capture'); setTdm(null); setFile(null); setReport(null); setSelected(null) }}>New diagram</button></div>
                  </div>
                ) : (
                  <button className="btn primary" style={{ width: '100%', padding: 14, fontSize: 16 }} disabled={!canPublish} onClick={publish}>{canPublish ? 'Publish to students' : 'Fix blocking findings to publish'}</button>
                )}
              </section>
            </aside>
          </div>
        )}
      </main>
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
