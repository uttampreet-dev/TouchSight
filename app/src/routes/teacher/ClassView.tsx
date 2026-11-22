import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { TdmCanvas } from '../../components/TdmCanvas'
import { listDiagrams, recordProgress, listProgress, clearProgress } from '../../store/db'
import type { Tdm } from '../../tdm/types'
import { classroom, teacherRoom, setTeacherRoom, newRoomCode, type Activity, type Incoming } from '../../class/classroom'
import { isNamed } from '../../student/hit'

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
  const [pub, setPub] = useState(() => { try { return localStorage.getItem(PUBLIC_KEY) || (/^(localhost|127\.|0\.0\.0\.0|\d+\.\d+\.\d+\.\d+)/.test(location.hostname) ? '' : location.origin) } catch { return '' } })
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
  // leading the class: one diagram on the table, the part the teacher is pointing at
  const [leading, setLeading] = useState<Tdm | null>(null)
  const [target, setTarget] = useState<{ id: string; name: string; at: number } | null>(null)

  const base = (pub.trim() ? pub.trim().replace(/\/+$/, '').replace(/^(?!https?:\/\/)/, 'https://') : location.origin)
  const joinUrl = `${base}/student?room=${room}`
  useEffect(() => { QRCode.toDataURL(joinUrl, { margin: 1, width: 240, color: { dark: '#0c2b2d', light: '#ffffff' } }).then(setQr).catch(() => {}) }, [joinUrl])
  useEffect(() => { listDiagrams(true).then((r) => setRows(r as Row[])) }, [])
  useEffect(() => { listProgress(room).then((p) => { for (const r of p) seen.current.add(`${r.student}|${r.at}`); setActs(p.map((r) => ({ ...(r.event as Activity), student: r.student, at: r.at }))) }) }, [room])

  const rosterRef = useRef(roster); rosterRef.current = roster
  const pushedRef = useRef<Tdm[]>([])
  useEffect(() => {
    classroom.join(room, 'console')
    if (roster.length) classroom.roster(roster)
    classroom.onOpen = () => { if (rosterRef.current.length) classroom.roster(rosterRef.current); for (const t of pushedRef.current) classroom.publish(t) }
    const off = classroom.on((m: Incoming) => {
      if (m.op === 'state') { setPhones(m.phones); if (m.students) setOnline(new Set(m.students)); if (!rosterRef.current.length && m.roster.length) { rosterRef.current = m.roster; setRoster(m.roster); try { localStorage.setItem(ROSTER_KEY, JSON.stringify(m.roster)) } catch { /* ignore */ } } const known = new Map([...pushedRef.current, ...m.published].map((t) => [t.id, t])); pushedRef.current = [...known.values()]; setPushed(new Set(known.keys())); setFromRoom([...known.values()]); for (const a of m.activity) remember(a) }
      if (m.op === 'presence') { setPhones(m.phones); if (m.student) setOnline((s) => { const n = new Set(s); if (m.joined) n.add(m.student!); else n.delete(m.student!); return n }) }
      if (m.op === 'activity') remember(m.event)
      if (m.op === 'published') { setPushed((s) => new Set(s).add(m.tdm.id)); setFromRoom((xs) => xs.some((t) => t.id === m.tdm.id) ? xs : [...xs, m.tdm]) }
    })
    classroom.sync()
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
  function lead(t: Tdm) { push(t); setLeading(t); setTarget(null) }
  function pointAt(id: string | null) {
    if (!leading) return
    const el = id ? leading.regions.find((r) => r.id === id) ?? leading.lines.find((l) => l.id === id) : null
    if (!el) { setTarget(null); classroom.point(leading.id, null); return }
    setTarget({ id: el.id, name: el.name.en, at: Date.now() })
    classroom.point(leading.id, el.id, el.name.en)
  }
  function stopLeading() { if (leading) classroom.point(leading.id, null); setLeading(null); setTarget(null) }
  const finders = useMemo(() => {
    if (!target) return []
    const found = new Map<string, { seconds: number; attempts: number }>()
    for (const a of acts) if (a.kind === 'found' && a.partId === target.id && a.at >= target.at - 1500 && !found.has(a.student)) found.set(a.student, { seconds: a.seconds, attempts: a.attempts })
    const names = [...new Set([...roster, ...online, ...found.keys()])]
    return names.map((name) => ({ name, hit: found.get(name) ?? null, here: online.has(name) }))
  }, [target, acts, roster, online])
  function newCode() { const c = newRoomCode(); setTeacherRoom(c); setRoom(c); setPushed(new Set()); setActs([]); seen.current.clear() }
  async function forget() { await clearProgress(room); setActs([]); seen.current.clear(); classroom.reset() }
  useEffect(() => { (window as unknown as { __class?: unknown }).__class = { push, room, roster: saveRoster, lead, pointAt } }) // harness

  const byStudent = useMemo(() => {
    const names = [...new Set([...roster, ...acts.map((a) => a.student)])]
    return names.map((name) => {
      const mine = acts.filter((a) => a.student === name)
      const opened = new Map<string, string>()
      const explore = new Map<string, { name: string; ms: number }>()
      const quiz = { asked: 0, found: 0, attempts: 0 }
      let last = 0, pointed = 0
      for (const a of mine) {
        last = Math.max(last, a.at)
        if (a.kind === 'open') opened.set(a.diagramId, a.title)
        if (a.kind === 'explore') { const e = explore.get(a.partId) ?? { name: a.partName, ms: 0 }; e.ms += a.ms; explore.set(a.partId, e) }
        if (a.kind === 'quiz') { quiz.asked++; if (a.found) quiz.found++; quiz.attempts += a.attempts }
        if (a.kind === 'found') pointed++
      }
      const parts = [...explore.values()].sort((x, y) => y.ms - x.ms).slice(0, 6)
      const maxMs = parts[0]?.ms ?? 1
      return { name, opened: [...opened.values()], parts, maxMs, quiz, last, pointed, online: online.has(name), count: mine.length }
    })
  }, [roster, acts, online])

  // the whole class on one sheet: seconds under every finger per part, for the diagram touched most
  const heat = useMemo(() => {
    const per = new Map<string, Map<string, number>>()
    const who = new Map<string, Set<string>>()
    for (const a of acts) if (a.kind === 'explore') {
      const m = per.get(a.diagramId) ?? new Map<string, number>(); m.set(a.partId, (m.get(a.partId) ?? 0) + a.ms); per.set(a.diagramId, m)
      const w = who.get(a.diagramId) ?? new Set<string>(); w.add(a.student); who.set(a.diagramId, w)
    }
    let best: { id: string; m: Map<string, number>; total: number } | null = null
    for (const [id, m] of per) { const total = [...m.values()].reduce((x, y) => x + y, 0); if (!best || total > best.total) best = { id, m, total } }
    if (!best) return null
    const tdm = shelf.find((r) => r.id === best!.id)?.tdm
    if (!tdm) return null
    const max = Math.max(...best.m.values())
    const named = tdm.regions.filter(isNamed)
    const never = named.filter((r) => !best!.m.has(r.id)).map((r) => r.name.en)
    const top = named.filter((r) => best!.m.has(r.id)).sort((a, b) => best!.m.get(b.id)! - best!.m.get(a.id)!)[0]
    return { tdm, m: best.m, max, never, top: top?.name.en ?? null, total: best.total, students: who.get(best.id)?.size ?? 0 }
  }, [acts, shelf])
  function downloadProgress() {
    const head = ['student', 'time', 'kind', 'diagram', 'part', 'seconds', 'found', 'attempts']
    const lines = acts.map((a) => [a.student, new Date(a.at).toISOString(), a.kind, 'diagramId' in a ? a.diagramId : '', a.kind === 'explore' ? a.partName : a.kind === 'quiz' ? a.targetName : a.kind === 'found' ? a.partName : '', a.kind === 'explore' ? (a.ms / 1000).toFixed(1) : a.kind === 'quiz' || a.kind === 'found' ? a.seconds : '', a.kind === 'quiz' ? a.found : a.kind === 'found' ? true : '', a.kind === 'quiz' || a.kind === 'found' ? a.attempts : ''].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(','))
    const el = document.createElement('a')
    el.href = URL.createObjectURL(new Blob([[head.join(','), ...lines].join('\n') + '\n'], { type: 'text/csv' }))
    el.download = `touchsight-class-${room}.csv`; el.click()
    setTimeout(() => URL.revokeObjectURL(el.href), 1000)
  }

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
              <span className="cl-room-a"><button className="btn cl-newcode" onClick={newCode}>new code</button><a className="btn cl-newcode" href={`/stage?room=${room}`} target="_blank" rel="noreferrer">projector for this room →</a></span>
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
          <header className="wb-pane-h"><span className="kicker">02 · {leading ? 'Leading the class' : 'On the phones'}</span><span className="mono">{leading ? `${finders.filter((f) => f.hit).length} of ${finders.length} found it` : `${shelf.filter((r) => pushed.has(r.id)).length} of ${shelf.length} pushed`}</span></header>
          {leading ? (
            <div className="wb-pane-b cl-lead">
              <div className="cl-lead-bar"><button className="btn" onClick={stopLeading}>← all diagrams</button><b>{leading.title}</b><span className="mono">click a part: every phone is asked to find it</span></div>
              <div className="cl-lead-sheet"><TdmCanvas tdm={leading} selected={target?.id ?? null} onSelect={pointAt} showRefs paper="#fbf8f1" /></div>
              <div className={`cl-lead-target ${target ? 'on' : ''}`}>
                <span className="kicker">{target ? 'Pointing at' : 'Nothing pointed at'}</span>
                <b>{target ? target.name : 'Click a part on the sheet'}</b>
                {target && <button className="btn" onClick={() => pointAt(null)}>stop</button>}
              </div>
              {target && (
                <ul className="cl-finders">
                  {finders.map((f) => <li key={f.name} className={f.hit ? 'hit' : f.here ? 'here' : ''}><i /><span>{f.name}</span><em className="mono">{f.hit ? `found in ${f.hit.seconds.toFixed(1)} s${f.hit.attempts > 1 ? ` · ${f.hit.attempts} tries` : ''}` : f.here ? 'searching…' : 'not connected'}</em></li>)}
                  {!finders.length && <li className="cl-empty mono">no phones in the room yet</li>}
                </ul>
              )}
            </div>
          ) : (
          <div className="wb-pane-b cl-pub">
            {!shelf.length && <div className="cl-empty mono">nothing published yet — publish from the console and it lands here</div>}
            {shelf.map((r) => (
              <div key={r.id} className={`cl-pub-row ${pushed.has(r.id) ? 'sent' : ''}`}>
                <div className="cl-thumb"><TdmCanvas tdm={r.tdm} showRefs={false} paper="transparent" /></div>
                <div className="cl-pub-t"><b>{r.tdm.title}</b><span className="mono">{r.chapter}</span><span className="mono">{r.tdm.regions.length} regions · {r.tdm.key.length} key</span></div>
                <span className="cl-pub-a"><button className={`btn ${pushed.has(r.id) ? '' : 'primary'}`} onClick={() => push(r.tdm)}>{pushed.has(r.id) ? 'pushed ✓' : 'push →'}</button><button className="btn coral" onClick={() => lead(r.tdm)}>lead →</button></span>
              </div>
            ))}
          </div>
          )}
          <footer className="wb-pane-f mono"><span>{leading ? 'the projector shows the target; each phone guides its own finger' : 'phones keep every pushed diagram offline'}</span>{shelf.length > 0 && <span><button className="cl-linkbtn" onClick={() => shelf.forEach((r) => push(r.tdm))}>push all</button></span>}</footer>
        </section>

        {/* 03 · progress */}
        <section className="wb-pane">
          <header className="wb-pane-h"><span className="kicker">03 · Progress</span><span className="mono">{acts.length} events · live</span></header>
          <div className="wb-pane-b cl-prog">
            {!byStudent.length && <div className="cl-empty mono">add names to the roster; activity appears here as students touch</div>}
            {heat && (
              <article className="cl-heat">
                <div className="cl-heat-sheet">
                  <TdmCanvas tdm={heat.tdm} showRefs={false} paper="#fbf8f1">
                    {heat.tdm.regions.map((r) => { const ms = heat.m.get(r.id); if (!ms) return null; return <path key={r.id} d={r.polygon.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ') + ' Z'} fill="#ff6f59" fillOpacity={0.18 + 0.62 * (ms / heat.max)} stroke="none" pointerEvents="none" /> })}
                  </TdmCanvas>
                </div>
                <div className="cl-heat-t">
                  <span className="kicker">Where the class touched</span>
                  <b>{heat.tdm.title}</b>
                  <span className="mono">{heat.students} student{heat.students === 1 ? '' : 's'} · {Math.round(heat.total / 1000)} s under the fingers{heat.top ? ` · most: ${heat.top}` : ''}</span>
                  {heat.never.length ? <span className="cl-heat-never"><em>never touched</em> {heat.never.slice(0, 5).join(' · ')}{heat.never.length > 5 ? ` · +${heat.never.length - 5}` : ''}</span> : <span className="cl-heat-all">every named part was touched</span>}
                </div>
              </article>
            )}
            {byStudent.map((s) => (
              <article key={s.name} className={`cl-student ${s.online ? 'on' : ''}`}>
                <header><i /><b>{s.name}</b><span className="mono">{ago(s.last)}</span></header>
                <div className="cl-stats mono">
                  <span><b>{s.opened.length}</b> opened</span>
                  <span><b>{s.quiz.found}</b>/{s.quiz.asked} found</span>
                  <span><b>{s.pointed}</b> pointed finds</span>
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
          <footer className="wb-pane-f mono"><span>kept on this laptop</span>{acts.length > 0 && <span><button className="cl-linkbtn" onClick={downloadProgress}>download .csv</button></span>}<span><button className="cl-linkbtn" onClick={forget}>forget this lesson</button></span></footer>
        </section>
      </div>
    </div>
  )
}
