import { useEffect, useRef, useState } from 'react'
import { understand, draftTdm, type Understanding } from '../../pipeline/understand'
import { serializeTdm } from '../../tdm/io'
import { saveDiagram, saveImage } from '../../store/db'

const PALETTE = ['#0e7c7b', '#ff6f59', '#3d7dd8', '#e9a23b', '#2e9e6a', '#8e44ad', '#c0392b', '#16a085', '#d35400', '#2c3e50']

/** Stage 1 inspection: run the pipeline on an image and draw what it found. */
export function Understand() {
  const [file, setFile] = useState<File | null>(null)
  const [stage, setStage] = useState('')
  const [u, setU] = useState<Understanding | null>(null)
  const [err, setErr] = useState('')
  const [show, setShow] = useState({ regions: true, labels: true, segments: true, links: true })
  const canvasRef = useRef<HTMLCanvasElement>(null)

  async function run() {
    if (!file) return
    setErr(''); setU(null)
    try {
      const res = await understand(file, setStage)
      if (window.__touchsight) window.__touchsight.last = res
      setU(res); setStage('done')
    } catch (e) {
      setErr((e as Error).message); setStage('')
    }
  }

  useEffect(() => {
    const c = canvasRef.current
    if (!c || !u) return
    const { prepared } = u
    c.width = prepared.width; c.height = prepared.height
    const ctx = c.getContext('2d')!
    ctx.drawImage(prepared.canvas, 0, 0)
    ctx.lineWidth = 2
    if (show.regions) u.regions.forEach((r, i) => {
      ctx.beginPath(); r.polygon.forEach((p, k) => (k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath()
      ctx.fillStyle = PALETTE[i % PALETTE.length] + '55'; ctx.fill()
      ctx.strokeStyle = PALETTE[i % PALETTE.length]; ctx.stroke()
      ctx.fillStyle = '#000'; ctx.font = 'bold 13px monospace'; ctx.fillText(r.id, r.centroid[0], r.centroid[1])
    })
    if (show.segments) { ctx.strokeStyle = '#ff6f59'; ctx.lineWidth = 2; u.segments.forEach((s) => { ctx.beginPath(); ctx.moveTo(s.a[0], s.a[1]); ctx.lineTo(s.b[0], s.b[1]); ctx.stroke() }) }
    if (show.labels) { ctx.strokeStyle = '#17181a'; ctx.lineWidth = 1.5; u.labels.forEach((l) => { ctx.strokeRect(l.bbox.x, l.bbox.y, l.bbox.w, l.bbox.h); ctx.fillStyle = '#17181a'; ctx.font = '11px monospace'; ctx.fillText(`${l.text} ${Math.round(l.confidence * 100)}`, l.bbox.x, l.bbox.y - 3) }) }
    if (show.links) { ctx.strokeStyle = '#2e9e6a'; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5
      u.associations.forEach((a) => { if (!a.regionId) return; const l = u.labels.find((x) => x.id === a.labelId)!; const r = u.regions.find((x) => x.id === a.regionId)!; ctx.beginPath(); ctx.moveTo(l.centre[0], l.centre[1]); ctx.lineTo(r.centroid[0], r.centroid[1]); ctx.stroke() })
      ctx.setLineDash([]) }
  }, [u, show])

  async function saveDraft() {
    if (!u || !file) return
    const id = file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9-]+/g, '-')
    const { tdm } = draftTdm(u, { id, title: id, subject: id.split('-')[0] || 'general', sourceKind: 'upload', file: file.name })
    await saveDiagram(tdm, 'drafts', false)
    await saveImage(id, file, u.prepared.width, u.prepared.height)
    const blob = new Blob([serializeTdm(tdm)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${id}.tdm.json`; a.click()
  }

  const linked = u ? u.associations.filter((a) => a.regionId).length : 0

  return (
    <div className="insp">
      <div className="wb-pane">
        <div className="insp-bar">
          <span className="kicker" style={{ color: 'var(--teal)' }}>Pipeline inspector</span>
          <label className="btn insp-pick"><input type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />{file ? file.name : 'Choose a figure…'}</label>
          <button className="btn primary" disabled={!file || (!!stage && stage !== 'done')} onClick={run}>Understand</button>
          <span className="mono insp-stage">{stage}</span>
          <span style={{ flex: 1 }} />
          {(['regions', 'labels', 'segments', 'links'] as const).map((k) => (
            <label key={k} className="mono" style={{ fontSize: 12 }}><input type="checkbox" checked={show[k]} onChange={(e) => setShow({ ...show, [k]: e.target.checked })} /> {k}</label>
          ))}
        </div>
        {err && <div className="wb-err mono" style={{ padding: 12 }}>{err}</div>}
        <div className="insp-body">
          {!u && <div className="wb-ghost-sheet insp-ghost"><span className="mono">{stage && stage !== 'done' ? stage + '…' : 'choose a figure and press Understand · regions, labels, strokes and label links are drawn over it'}</span></div>}
          <canvas ref={canvasRef} data-testid="overlay" style={{ display: u ? 'block' : 'none' }} />
        </div>
      </div>
      <aside className="wb-pane insp-side">
        <div className="kicker" style={{ color: 'var(--teal)' }}>What was found</div>
        {!u && <ol className="wb-rules-ghost mono">{[['regions', 'enclosed areas, colour or line-art'], ['labels', 'printed text, with OCR confidence'], ['strokes', 'straight segments and leader lines'], ['links', 'which label names which region'], ['time', 'segment · ocr · lines, in ms']].map(([k, t]) => <li key={k}><em>{k}</em><span>{t}</span></li>)}</ol>}
        {u && (
          <>
            <div className="insp-facts mono" data-testid="summary">
              <div>
                regions <b>{u.regions.length}</b> ({u.colourful ? 'colour' : 'line-art'})<br />
                labels <b>{u.labels.length}</b> · linked <b>{linked}</b><br />
                strokes <b>{u.segments.length}</b><br />
                time <b>{u.timings.total} ms</b> (seg {u.timings.segment} · ocr {u.timings.ocr} · lines {u.timings.lines})
              </div>
            </div>
            <div style={{ maxHeight: 420, overflow: 'auto' }}>
              <table className="mono" data-testid="labels">
                <tbody>
                  {u.labels.map((l) => { const a = u.associations.find((x) => x.labelId === l.id)!; return (
                    <tr key={l.id}>
                      <td>{l.text}</td>
                      <td style={{ color: 'var(--muted)' }}>{Math.round(l.confidence * 100)}</td>
                      <td style={{ color: a.regionId ? 'var(--green)' : 'var(--coral)' }}>{a.regionId ?? '—'} <small>{a.how}</small></td>
                    </tr>) })}
                </tbody>
              </table>
            </div>
            <button className="btn coral" onClick={saveDraft}>Save draft TDM</button>
          </>
        )}
      </aside>
    </div>
  )
}
