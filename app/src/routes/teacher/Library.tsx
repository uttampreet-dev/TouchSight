import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listDiagrams, deleteDiagram } from '../../store/db'
import { TdmCanvas } from '../../components/TdmCanvas'
import type { Tdm } from '../../tdm/types'
import { ExportPanel } from '../../components/ExportPanel'

type Row = { id: string; tdm: Tdm; chapter: string; published: boolean; updatedAt: number }

/** Every diagram on this device, grouped by chapter. */
export function Library() {
  const [rows, setRows] = useState<Row[]>([])
  const load = () => listDiagrams().then(setRows)
  useEffect(() => { load() }, [])
  const chapters = [...new Set(rows.map((r) => r.chapter))]
  const reviewed = rows.filter((r) => r.tdm.provenance.review)
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0 }
  /** The review log as a file: one row per reviewed diagram, what the teacher changed and how long it took. */
  function downloadLog() {
    const kinds = ['rename', 'relation', 'meaning', 'texture', 'merge', 'remove', 'order']
    const head = ['id', 'title', 'chapter', 'regions', 'lines', 'relations', 'review_seconds', 'edits', ...kinds, 'reviewed_at']
    const lines = reviewed.map((r) => { const v = r.tdm.provenance.review!; return [r.id, r.tdm.title, r.chapter, r.tdm.regions.length, r.tdm.lines.length, r.tdm.relations.length, v.seconds, v.edits, ...kinds.map((k) => v.byKind[k] ?? 0), r.tdm.provenance.reviewedAt ?? ''].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',') })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([[head.join(','), ...lines].join('\n') + '\n'], { type: 'text/csv' }))
    a.download = 'touchsight-review-log.csv'; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  return (
    <div className="lib">
      <div className="lib-head">
        <h1 className="h1">Library</h1>
        <span className="mono">{rows.filter((r) => r.published).length} published · {rows.filter((r) => !r.published).length} drafts{reviewed.length ? ` · median review ${mmss(median(reviewed.map((r) => r.tdm.provenance.review!.seconds)))} over ${reviewed.length}` : ''}</span>
        {reviewed.length > 0 && <button className="btn ghost lib-log" onClick={downloadLog}>Review log .csv</button>}
        <Link className="btn coral" to="/teacher">New diagram →</Link>
      </div>
      {!rows.length && <p className="lib-empty">Nothing yet. Capture a diagram to start a chapter.</p>}
      {chapters.map((ch) => (
        <section key={ch} className="lib-ch">
          <div className="lib-ch-h"><span className="kicker">{ch}</span>{rows.some((r) => r.chapter === ch && r.published) && <Link className="btn lib-pack" to={`/print/${encodeURIComponent(ch)}`} target="_blank">Print chapter pack · {rows.filter((r) => r.chapter === ch && r.published).length} sheet{rows.filter((r) => r.chapter === ch && r.published).length === 1 ? '' : 's'} →</Link>}</div>
          <div className="lib-grid">
            {rows.filter((r) => r.chapter === ch).map((r) => (
              <div key={r.id} className="lib-card">
                <Link to={`/teacher/d/${r.id}`}><TdmCanvas tdm={r.tdm} showRefs={false} paper="transparent" /></Link>
                <div className="lib-card-b">
                  <div className="lib-card-t"><b>{r.tdm.title}</b><span className={`mono ${r.published ? 'pub' : 'draft'}`}>{r.published ? 'PUBLISHED' : 'DRAFT'}</span></div>
                  <div className="mono lib-card-m">{r.tdm.regions.length} regions · {r.tdm.lines.length} lines · {r.tdm.key.length} key{r.tdm.provenance.review ? ` · reviewed in ${mmss(r.tdm.provenance.review.seconds)}, ${r.tdm.provenance.review.edits} edits` : ''}</div>
                  <div className="lib-card-a"><Link className="btn" to={`/teacher/d/${r.id}`}>Open</Link>{r.published && <Link className="btn" to={`/teacher/preview/${r.id}`}>Preview</Link>}<button className="btn ghost del" onClick={async () => { await deleteDiagram(r.id); load() }}>Delete</button></div>
                  {r.published && <ExportPanel tdm={r.tdm} compact />}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
