import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { TdmCanvas } from '../../components/TdmCanvas'
import { listDiagrams, recordProgress, listProgress, clearProgress } from '../../store/db'
import type { Tdm } from '../../tdm/types'
import { classroom, teacherRoom, setTeacherRoom, newRoomCode, type Activity, type Incoming } from '../../class/classroom'

/**
 * The class: a room code the phones join, the roster the teacher types, what has been pushed to the phones, and
 * every student's activity as it happens: diagrams opened, time under the finger per part, quiz targets found.
 */

const ROSTER_KEY = 'touchsight-roster'
const PUBLIC_KEY = 'touchsight-public-url'
const loadRoster = (): string[] => { try { return JSON.parse(localStorage.getItem(ROSTER_KEY) || '[]') } catch { return [] } }

type Row = { id: string; tdm: Tdm; chapter: string; published: boolean }

export function ClassView() {
  const [room, setRoom] = useState(teacherRoom)
  const [pub, setPub] = useState(() => { try { return localStorage.getItem(PUBLIC_KEY) || '' } catch { return '' } })
  const savePub = (v: string) => { setPub(v); try { localStorage.setItem(PUBLIC_KEY, v) } catch { /* ignore */ } }
  const [qr, setQr] = useState<string | null>(null)
  const [roster, setRoster] = useState<string[]>(loadRoster)
  const [draft, setDraft] = useState('')
  const [phones, setPhones] = useState(0)
  const [online, setOnline] = useState<Set<string>>(new Set())
  const [pushed, setPushed] = useState<Set<string>>(new Set())
  const [rows, setRows] = useState<Row[]>([])
  const [fromRoom, setFromRoom] = useState<Tdm[]>([])
  const [acts, setActs] = useState<Activity[]>([])
  const [link, setLink] = useState(classroom.state)
  const seen = useRef(new Set<string>())

  const base = (pub.trim() ? pub.trim().replace(/\/+$/, '').replace(/^(?!https?:\/\/)/, 'https://') : location.origin)
  const joinUrl = `${base}/student?room=${room}`
  useEffect(() => { QRCode.toDataURL(joinUrl, { margin: 1, width: 240, color: { dark: '#0c2b2d', light: '#ffffff' } }).then(setQr).catch(() => {}) }, [joinUrl])
  useEffect(() => { listDiagrams(true).then((r) => setRows(r as Row[])) }, [])
  useEffect(() => { listProgress(room).then((p) => { for (const r of p) seen.current.add(`${r.student}|${r.at}`); setActs(p.map((r) => ({ ...(r.event as Activity), student: r.student, at: r.at }))) }) }, [room])

  const rosterRef = useRef(roster); rosterRef.current = roster
  const pushedRef = useRef<Tdm[]>([])
  useEffect(() => {
    classroom.join(room, 'console')
    classroom.roster(roster)
    classroom.onOpen = () => { classroom.roster(rosterRef.current); for (const t of pushedRef.current) classroom.publish(t) }
    const off = classroom.on((m: Incoming) => {
      if (m.op === 'state') { setPhones(m.phones); const known = new Map([...pushedRef.current, ...m.published].map((t) => [t.id, t])); pushedRef.current = [...known.values()]; setPushed(new Set(known.keys())); setFromRoom([...known.values()]); for (const a of m.activity) remember(a) }
      if (m.op === 'presence') { setPhones(m.phones); if (m.student) setOnline((s) => { const n = new Set(s); if (m.joined) n.add(m.student!); else n.delete(m.student!); return n }) }
      if (m.op === 'activity') remember(m.event)
      if (m.op === 'published') { setPushed((s) => new Set(s).add(m.tdm.id)); setFromRoom((xs) => xs.some((t) => t.id === m.tdm.id) ? xs : [...xs, m.tdm]) }
    })
    const t = setInterval(() => setLink(classroom.state), 800)
    return () => { off(); clearInterval(t); classroom.onOpen = () => {} }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room])

  function remember(a: Activity) {
    const k = `${a.student}|${a.at}`
    if (seen.current.has(k)) return
    seen.current.add(k)
    setActs((xs) => [...xs, a])
    recordProgress(room, a.student, a.at, a as unknown as Record<string, unknown>).catch(() => {})
  }
  function saveRoster(names: string[]) { setRoster(names); try { localStorage.setItem(ROSTER_KEY, JSON.stringify(names)) } catch { /* ignore */ } classroom.roster(names) }
  function add() { const n = draft.trim(); if (!n || roster.includes(n)) return; saveRoster([...roster, n]); setDraft('') }
  function push(t: Tdm) { classroom.publish(t); setPushed((s) => new Set(s).add(t.id)); setFromRoom((xs) => xs.some((x) => x.id === t.id) ? xs : [...xs, t]); if (!pushedRef.current.some((x) => x.id === t.id)) pushedRef.current.push(t) }
  const shelf: Row[] = useMemo(() => [...rows, ...fromRoom.filter((t) => !rows.some((r) => r.id === t.id)).map((t) => ({ id: t.id, tdm: t, chapter: t.subject || 'From the room', published: true }))], [rows, fromRoom])
  function newCode() { const c = newRoomCode(); setTeacherRoom(c); setRoom(c); setPushed(new Set()); setActs([]); seen.current.clear() }
  async function forget() { await clearProgress(room); setActs([]); seen.current.clear(); classroom.reset() }
  useEffect(() => { (window as unknown as { __class?: unknown }).__class = { push, room, roster: saveRoster } }) // harness

  const byStudent = useMemo(() => {
    const names = [...new Set([...roster, ...acts.map((a) => a.student)])]
    return names.map((name) => {
      const mine = acts.filter((a) => a.student === name)
      const opened = new Map<string, string>()
      const explore = new Map<string, { name: string; ms: number }>()
      const quiz = { asked: 0, found: 0, attempts: 0 }
      let last = 0
      for (const a of mine) {
        last = Math.max(last, a.at)
        if (a.kind === 'open') opened.set(a.diagramId, a.title)
        if (a.kind === 'explore') { const e = explore.get(a.partId) ?? { name: a.partName, ms: 0 }; e.ms += a.ms; explore.set(a.partId, e) }
        if (a.kind === 'quiz') { quiz.asked++; if (a.found) quiz.found++; quiz.attempts += a.attempts }
      }
      const parts = [...explore.values()].sort((x, y) => y.ms - x.ms).slice(0, 6)
      const maxMs = parts[0]?.ms ?? 1
      return { name, opened: [...opened.values()], parts, maxMs, quiz, last, online: online.has(name), count: mine.length }
    })
  }, [roster, acts, online])

  const ago = (t: number) => { if (!t) return 'no activity yet'; const s = Math.round((Date.now() - t) / 1000); return s < 60 ? `${s} s ago` : s < 3600 ? `${Math.round(s / 60)} min ago` : `${Math.round(s / 3600)} h ago` }

  return (
    <div className="cl">
      <div className="wb-table cl-table">
        {/* 01 · room */}
        <section className="wb-pane">
          <header className="wb-pane-h"><span className="kicker">01 · Room</span><span className="mono">{link === 'open' ? `relay open · ${phones} phone${phones === 1 ? '' : 's'}` : link === 'connecting' ? 'connecting…' : 'relay off'}</span></header>
          <div className="wb-pane-b cl-room">
            <div className="cl-code-wrap">
              <span className="kicker">Room code</span>
              <b className="cl-code">{room}</b>
              <span className="mono cl-join">phones join at <em>{joinUrl.replace(/^https?:\/\//, '')}</em></span>
              <input className="cl-pub-url mono" value={pub} onChange={(e) => savePub(e.target.value)} placeholder="public address for phones, e.g. https://xxxx.trycloudflare.com" aria-label="public address for phones" />
              {qr && <img className="cl-qr" src={qr} alt={`QR code to join room ${room}`} />}
              <button className="btn cl-newcode" onClick={newCode}>new code</button>
            </div>
            <div className="cl-roster">
              <div className="kicker wb-k">Roster · {roster.length}</div>
              <ul>
                {roster.map((n) => <li key={n} className={online.has(n) ? 'on' : ''}><i /> <span>{n}</span><button aria-label={`remove ${n}`} onClick={() => saveRoster(roster.filter((x) => x !== n))}>✕</button></li>)}
                {!roster.length && <li className="cl-empty mono">type the students' names; a phone picks one by voice</li>}
              </ul>
              <form className="cl-add" onSubmit={(e) => { e.preventDefault(); add() }}>
                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Student's name" aria-label="student name" />
                <button className="btn primary" type="submit">Add</button>
              </form>
            </div>
          </div>
          <footer className="wb-pane-f mono"><span>no accounts</span><span>the teacher sets up, the student operates</span></footer>
        </section>

        {/* 02 · published */}
        <section className="wb-pane">
          <header className="wb-pane-h"><span className="kicker">02 · On the phones</span><span className="mono">{shelf.filter((r) => pushed.has(r.id)).length} of {shelf.length} pushed</span></header>
          <div className="wb-pane-b cl-pub">
            {!shelf.length && <div className="cl-empty mono">nothing published yet — publish from the console and it lands here</div>}
            {shelf.map((r) => (
              <div key={r.id} className={`cl-pub-row ${pushed.has(r.id) ? 'sent' : ''}`}>
                <div className="cl-thumb"><TdmCanvas tdm={r.tdm} showRefs={false} paper="transparent" /></div>
                <div className="cl-pub-t"><b>{r.tdm.title}</b><span className="mono">{r.chapter}</span><span className="mono">{r.tdm.regions.length} regions · {r.tdm.key.length} key</span></div>
                <button className={`btn ${pushed.has(r.id) ? '' : 'primary'}`} onClick={() => push(r.tdm)}>{pushed.has(r.id) ? 'pushed ✓ · again' : 'push →'}</button>
              </div>
            ))}
          </div>
          <footer className="wb-pane-f mono"><span>phones keep every pushed diagram offline</span>{shelf.length > 0 && <span><button className="cl-linkbtn" onClick={() => shelf.forEach((r) => push(r.tdm))}>push all</button></span>}</footer>
        </section>

        {/* 03 · progress */}
        <section className="wb-pane">
          <header className="wb-pane-h"><span className="kicker">03 · Progress</span><span className="mono">{acts.length} events · live</span></header>
          <div className="wb-pane-b cl-prog">
            {!byStudent.length && <div className="cl-empty mono">add names to the roster; activity appears here as students touch</div>}
            {byStudent.map((s) => (
              <article key={s.name} className={`cl-student ${s.online ? 'on' : ''}`}>
                <header><i /><b>{s.name}</b><span className="mono">{ago(s.last)}</span></header>
                <div className="cl-stats mono">
                  <span><b>{s.opened.length}</b> opened</span>
                  <span><b>{s.quiz.found}</b>/{s.quiz.asked} found</span>
                  <span><b>{s.quiz.asked ? (s.quiz.attempts / s.quiz.asked).toFixed(1) : '–'}</b> tries each</span>
                  <span><b>{Math.round(s.parts.reduce((a, p) => a + p.ms, 0) / 1000)}</b> s touching</span>
                </div>
                {s.opened.length > 0 && <div className="cl-opened mono">{s.opened.join(' · ')}</div>}
                {s.parts.length > 0 && (
                  <ul className="cl-bars">
                    {s.parts.map((p) => <li key={p.name}><span>{p.name}</span><i style={{ width: `${Math.max(4, (p.ms / s.maxMs) * 100)}%` }} /><em className="mono">{(p.ms / 1000).toFixed(1)} s</em></li>)}
                  </ul>
                )}
              </article>
            ))}
          </div>
          <footer className="wb-pane-f mono"><span>kept on this laptop</span><span><button className="cl-linkbtn" onClick={forget}>forget this lesson</button></span></footer>
        </section>
      </div>
    </div>
  )
}
