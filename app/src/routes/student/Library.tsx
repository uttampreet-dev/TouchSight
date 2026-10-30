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
import { vibrate, CORRECT_PULSE } from '../../device/haptics'
import { useSearchParams } from 'react-router-dom'
import { classroom, studentProfile, setStudentProfile, type Incoming } from '../../class/classroom'

type Score = { found: number; asked: number }

export function StudentLibrary() {
  const { lang, setLang } = useLang()
  const s = t(lang)
  const [mine, setMine] = useState<Tdm[]>([])
  const [scores, setScores] = useState<Record<string, Score>>({})
  const file = useRef<HTMLInputElement>(null)
  const [params, setParams] = useSearchParams()
  const [profile, setProfile] = useState(studentProfile)
  const [roster, setRoster] = useState<string[]>([])
  const [armed, setArmed] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const armedAt = useRef(0)

  // a QR link carries the room; the teacher scanned it once on this phone
  useEffect(() => {
    const r = params.get('room')?.toUpperCase()
    if (r && /^[A-Z]{4}$/.test(r) && r !== profile?.room) { const p = { room: r, name: null }; setStudentProfile(p); setProfile(p); speak(s.joinedRoom(r), lang) }
    if (r) { params.delete('room'); setParams(params, { replace: true }) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!profile?.room) return
    classroom.join(profile.room, 'student', profile.name)
    const off = classroom.on(async (m: Incoming) => {
      if (m.op === 'state') { setRoster(m.roster); for (const t of m.published) await saveDiagram(t, t.subject || s.mine, true); load() }
      if (m.op === 'roster') setRoster(m.names)
      if (m.op === 'published') { await saveDiagram(m.tdm, m.tdm.subject || s.mine, true); load(); speak(nameIn({ en: m.tdm.title }, lang), lang) }
    })
    return off
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.room, profile?.name])

  function touchName(n: string) {
    const now = Date.now()
    if (armed === n && now - armedAt.current < 4000) { choose(n); return }
    setArmed(n); armedAt.current = now
    vibrate(30); speak(n, lang)
  }
  function choose(n: string) {
    const p = { room: profile!.room, name: n }
    setStudentProfile(p); setProfile(p); setArmed(null)
    vibrate(CORRECT_PULSE); speak(s.youAre(n), lang)
    classroom.join(p.room, 'student', n)
  }
  function joinCode(e: React.FormEvent) {
    e.preventDefault()
    const r = code.trim().toUpperCase()
    if (!/^[A-Z]{4}$/.test(r)) return
    const p = { room: r, name: null }; setStudentProfile(p); setProfile(p); setCode(''); speak(s.joinedRoom(r), lang)
  }

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

      {profile?.room && !profile.name && (
        <section className="st-section st-pick" aria-live="polite">
          <div className="st-section-head"><span className="kicker">{s.classRoom} · {profile.room}</span><span className="mono">{roster.length}</span></div>
          <p className="st-pick-q">{s.whoAreYou}</p>
          {roster.length ? (
            <div className="st-pick-grid">
              {roster.map((n) => <button key={n} className={`st-pick-card ${armed === n ? 'armed' : ''}`} onPointerDown={() => touchName(n)} aria-label={n}><b>{n}</b><span className="mono">{armed === n ? s.thisIsMe : ''}</span></button>)}
            </div>
          ) : <p className="st-empty">{s.waitingRoster}</p>}
        </section>
      )}

      {profile?.room && profile.name && (
        <div className="st-me"><span className="kicker">{s.classRoom} · {profile.room}</span><b>{profile.name}</b><button className="mono" onClick={() => { const p = { room: profile.room, name: null }; setStudentProfile(p); setProfile(p) }}>{s.notMe}</button></div>
      )}

      {!profile?.room && (
        <form className="st-join" onSubmit={joinCode}>
          <span className="kicker">{s.joinClass}</span>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={4} placeholder={s.roomCode} aria-label={s.roomCode} className="mono" />
          <button type="submit" className="mono">→</button>
        </form>
      )}

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
