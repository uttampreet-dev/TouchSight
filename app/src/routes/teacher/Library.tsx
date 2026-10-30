import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listDiagrams, deleteDiagram } from '../../store/db'
import { TdmCanvas } from '../../components/TdmCanvas'
import type { Tdm } from '../../tdm/types'

type Row = { id: string; tdm: Tdm; chapter: string; published: boolean; updatedAt: number }

/** Every diagram on this device, grouped by chapter. */
export function Library() {
  const [rows, setRows] = useState<Row[]>([])
  const load = () => listDiagrams().then(setRows)
  useEffect(() => { load() }, [])
  const chapters = [...new Set(rows.map((r) => r.chapter))]

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1200 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
        <h1 className="h1">Library</h1>
        <span className="mono" style={{ color: 'var(--muted)' }}>{rows.filter((r) => r.published).length} published · {rows.filter((r) => !r.published).length} drafts</span>
        <span style={{ flex: 1 }} />
        <Link className="btn primary" to="/teacher">New diagram</Link>
      </div>
      {!rows.length && <p style={{ color: 'var(--slate)', marginTop: 24 }}>Nothing yet. Capture a diagram to start a chapter.</p>}
      {chapters.map((ch) => (
        <section key={ch} style={{ marginTop: 28 }}>
          <div className="kicker" style={{ marginBottom: 10 }}>{ch}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {rows.filter((r) => r.chapter === ch).map((r) => (
              <div key={r.id} className="card" style={{ overflow: 'hidden' }}>
                <Link to={`/teacher/d/${r.id}`} style={{ display: 'block', aspectRatio: '1 / 1', background: 'var(--panel)' }}>
                  <TdmCanvas tdm={r.tdm} showRefs={false} />
                </Link>
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <b style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.tdm.title}</b>
                    <span className="mono" style={{ fontSize: 11, color: r.published ? 'var(--green)' : 'var(--amber)' }}>{r.published ? 'PUBLISHED' : 'DRAFT'}</span>
                  </div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{r.tdm.regions.length} regions · {r.tdm.lines.length} lines · {r.tdm.key.length} key</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <Link className="btn" to={`/teacher/d/${r.id}`}>Open</Link>
                    <button className="btn ghost" style={{ color: 'var(--coral)' }} onClick={async () => { await deleteDiagram(r.id); load() }}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
