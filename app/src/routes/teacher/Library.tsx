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

  return (
    <div className="lib">
      <div className="lib-head">
        <h1 className="h1">Library</h1>
        <span className="mono">{rows.filter((r) => r.published).length} published · {rows.filter((r) => !r.published).length} drafts</span>
        <Link className="btn coral" to="/teacher">New diagram →</Link>
      </div>
      {!rows.length && <p className="lib-empty">Nothing yet. Capture a diagram to start a chapter.</p>}
      {chapters.map((ch) => (
        <section key={ch} className="lib-ch">
          <span className="kicker">{ch}</span>
          <div className="lib-grid">
            {rows.filter((r) => r.chapter === ch).map((r) => (
              <div key={r.id} className="lib-card">
                <Link to={`/teacher/d/${r.id}`}><TdmCanvas tdm={r.tdm} showRefs={false} paper="transparent" /></Link>
                <div className="lib-card-b">
                  <div className="lib-card-t"><b>{r.tdm.title}</b><span className={`mono ${r.published ? 'pub' : 'draft'}`}>{r.published ? 'PUBLISHED' : 'DRAFT'}</span></div>
                  <div className="mono lib-card-m">{r.tdm.regions.length} regions · {r.tdm.lines.length} lines · {r.tdm.key.length} key</div>
                  <div className="lib-card-a"><Link className="btn" to={`/teacher/d/${r.id}`}>Open</Link><button className="btn ghost del" onClick={async () => { await deleteDiagram(r.id); load() }}>Delete</button></div>
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
