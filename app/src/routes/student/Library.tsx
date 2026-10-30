import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Brand } from '../../components/Brand'
import { TdmCanvas } from '../../components/TdmCanvas'
import { listDiagrams, saveDiagram, quizResults } from '../../store/db'
import { parseTdm } from '../../tdm/io'
import type { Tdm, Lang } from '../../tdm/types'
import { SAMPLES } from '../../samples'
import { nameIn, t, LANG_NAME } from '../../i18n'
import { useLang } from '../Student'
import { speak } from '../../device/speech'

type Score = { found: number; asked: number }

export function StudentLibrary() {
  const { lang, setLang } = useLang()
  const s = t(lang)
  const [mine, setMine] = useState<Tdm[]>([])
  const [scores, setScores] = useState<Record<string, Score>>({})
  const file = useRef<HTMLInputElement>(null)

  const load = async () => {
    const rows = await listDiagrams(true)
    setMine(rows.map((r) => r.tdm))
    const sc: Record<string, Score> = {}
    for (const d of [...rows.map((r) => r.tdm), ...SAMPLES]) {
      const q = await quizResults(d.id)
      if (q.length) sc[d.id] = { found: q.filter((x) => x.found).length, asked: q.length }
    }
    setScores(sc)
  }
  useEffect(() => { load() }, [])

  async function importFile(f: File | undefined) {
    if (!f) return
    const tdm = parseTdm(await f.text())
    await saveDiagram(tdm, tdm.subject || 'From my teacher', true)
    load()
  }

  const Card = ({ d, sample }: { d: Tdm; sample?: boolean }) => (
    <Link to={`/student/d/${d.id}`} className="st-card" aria-label={`${d.title}. ${s.tapToOpen}`}>
      <div className="st-thumb"><TdmCanvas tdm={d} showRefs={false} /></div>
      <div className="st-card-body">
        <b>{nameIn({ en: d.title }, lang)}</b>
        <span className="mono">{s.parts(d.regions.length)} · {d.lines.length} {s.line}{sample ? ' · sample' : ''}</span>
        {scores[d.id] && <span className="mono st-score">{s.bestScore(scores[d.id].found, scores[d.id].asked)}</span>}
      </div>
    </Link>
  )

  return (
    <main className="st">
      <header className="st-head">
        <Brand />
        <span className="kicker">{s.library}</span>
        <span style={{ flex: 1 }} />
        <div className="st-langs" role="group" aria-label={s.language}>
          {(['en', 'hi', 'pa'] as Lang[]).map((l) => (
            <button key={l} className={l === lang ? 'on' : ''} onClick={() => { setLang(l); speak(LANG_NAME[l], l) }} aria-pressed={l === lang}>{LANG_NAME[l]}</button>
          ))}
        </div>
      </header>

      <section className="st-section">
        <div className="st-section-head"><span className="kicker">{s.mine}</span><span className="mono">{mine.length}</span></div>
        {mine.length ? <div className="st-grid">{mine.map((d) => <Card key={d.id} d={d} />)}</div> : <p className="st-empty">{s.nothingYet}</p>}
        <button className="st-import" onClick={() => file.current?.click()}>{s.importFile}</button>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => importFile(e.target.files?.[0])} />
      </section>

      <section className="st-section">
        <div className="st-section-head"><span className="kicker">{s.samples}</span><span className="mono">{SAMPLES.length}</span></div>
        <div className="st-grid">{SAMPLES.map((d) => <Card key={d.id} d={d} sample />)}</div>
      </section>
    </main>
  )
}
