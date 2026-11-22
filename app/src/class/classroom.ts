import type { Tdm, Lang } from '../tdm/types'
import { relayUrl } from '../student/mirror'

/**
 * The classroom link. A room code joins a teacher's console and the students' phones through the relay on the
 * app's own origin. Publishes go console → phones; activity goes phones → console. Nothing needs an account:
 * the teacher types the roster, a phone picks a name from it. The phone queues activity while offline and
 * flushes it when the link is back, so a lesson with Wi-Fi off still reaches the console afterwards.
 */

export type ClassEvent =
  | { kind: 'open'; diagramId: string; title: string }
  | { kind: 'explore'; diagramId: string; partId: string; partName: string; ms: number }
  | { kind: 'quiz'; diagramId: string; target: string; targetName: string; found: boolean; attempts: number; seconds: number }
  | { kind: 'tour'; diagramId: string }
  | { kind: 'found'; diagramId: string; partId: string; partName: string; seconds: number; attempts: number }
  | { kind: 'lang'; lang: Lang }
export type Activity = ClassEvent & { student: string; at: number }

export type Incoming =
  | { op: 'state'; roster: string[]; published: Tdm[]; activity: Activity[]; phones: number; pointing?: Pointing | null; students?: string[] }
  | { op: 'roster'; names: string[] }
  | { op: 'published'; tdm: Tdm }
  | { op: 'unpublished'; id: string }
  | { op: 'activity'; event: Activity }
  | { op: 'presence'; phones: number; student: string | null; joined: boolean }
  | { op: 'point'; diagramId: string; id: string | null; name: string; at: number }

/** What the teacher is pointing at for the whole room: one part of one diagram, or nothing. */
export type Pointing = { diagramId: string; id: string; name: string; at: number }

type Handler = (m: Incoming) => void
const QUEUE_KEY = 'touchsight-class-queue'
const ROOM_KEY = 'touchsight-room'
const STUDENT_KEY = 'touchsight-student'
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'

export const newRoomCode = () => Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('')
export function teacherRoom(): string {
  try { const c = localStorage.getItem(ROOM_KEY); if (c) return c } catch { /* private mode */ }
  const c = newRoomCode()
  try { localStorage.setItem(ROOM_KEY, c) } catch { /* ignore */ }
  return c
}
export function setTeacherRoom(code: string) { try { localStorage.setItem(ROOM_KEY, code) } catch { /* ignore */ } }

export type StudentProfile = { room: string; name: string | null }
export function studentProfile(): StudentProfile | null { try { const s = localStorage.getItem(STUDENT_KEY); return s ? JSON.parse(s) : null } catch { return null } }
export function setStudentProfile(p: StudentProfile | null) { try { p ? localStorage.setItem(STUDENT_KEY, JSON.stringify(p)) : localStorage.removeItem(STUDENT_KEY) } catch { /* ignore */ } }

class ClassLink {
  private ws: WebSocket | null = null
  private handlers = new Set<Handler>()
  private backoff = 1000
  room: string | null = null
  role: 'console' | 'student' = 'student'
  student: string | null = null
  state: 'off' | 'connecting' | 'open' = 'off'
  phones = 0
  /** the part the teacher is pointing at right now; a phone that opens the diagram late still gets it */
  pointing: Pointing | null = null
  /** runs after every (re)connect, once the join is sent: the console re-announces its roster and pushed diagrams so a relay restart loses nothing */
  onOpen: () => void = () => {}

  on(h: Handler) { this.handlers.add(h); return () => { this.handlers.delete(h) } }

  join(room: string, role: 'console' | 'student', student: string | null = null) {
    const changed = this.room !== room || this.role !== role || this.student !== student
    this.room = room; this.role = role; this.student = student
    if (this.ws?.readyState === 1) { if (changed) this.ws.send(JSON.stringify({ type: 'class', op: 'join', room, role, student })) }
    else this.connect()
  }

  /** Ask the relay for the room's state again; a view opened after the first join has missed it. */
  sync() { if (this.room && this.ws?.readyState === 1) this.ws.send(JSON.stringify({ type: 'class', op: 'join', room: this.room, role: this.role, student: this.student })) }

  private connect() {
    if (this.ws || typeof WebSocket === 'undefined') return
    this.state = 'connecting'
    try {
      const ws = new WebSocket(relayUrl())
      this.ws = ws
      ws.onopen = () => {
        this.state = 'open'; this.backoff = 1000
        if (this.room) ws.send(JSON.stringify({ type: 'class', op: 'join', room: this.room, role: this.role, student: this.student }))
        for (const t of this.outbox.splice(0)) ws.send(t)
        this.flush()
        this.onOpen()
      }
      ws.onmessage = (e) => { try { const m = JSON.parse(e.data); if (m.type === 'class' && m.room === this.room) { if (m.op === 'presence' || m.op === 'state') this.phones = m.phones; if (m.op === 'point') this.pointing = m.id ? { diagramId: m.diagramId, id: m.id, name: m.name, at: m.at } : null; if (m.op === 'state') this.pointing = m.pointing ?? null; this.handlers.forEach((h) => h(m)) } } catch { /* not ours */ } }
      ws.onclose = () => { this.ws = null; this.state = 'off'; setTimeout(() => this.connect(), this.backoff); this.backoff = Math.min(10_000, this.backoff * 2) }
      ws.onerror = () => ws.close()
    } catch { this.ws = null; this.state = 'off' }
  }

  private outbox: string[] = []
  /** Sends now, or holds the message until the socket opens (roster, publish, reset must never be dropped). */
  private send(obj: Record<string, unknown>) {
    const text = JSON.stringify({ type: 'class', room: this.room, ...obj })
    if (this.ws?.readyState === 1) { this.ws.send(text); return true }
    this.outbox.push(text); if (this.outbox.length > 50) this.outbox.shift()
    this.connect()
    return false
  }

  roster(names: string[]) { this.send({ op: 'roster', names }) }
  publish(tdm: Tdm) { this.send({ op: 'publish', tdm }) }
  unpublish(id: string) { this.send({ op: 'unpublish', id }) }
  reset() { this.send({ op: 'reset' }) }
  /** The teacher points at a part: every phone in the room is asked to find it. A null id stops pointing. */
  point(diagramId: string, id: string | null, name = '') { const at = Date.now(); this.pointing = id ? { diagramId, id, name, at } : null; this.send({ op: 'point', diagramId, id, name, at }) }

  /** A student event: sent now, or queued on the device until the link is back. */
  activity(event: ClassEvent) {
    if (!this.room || !this.student) return
    const item = { op: 'activity', student: this.student, event, at: Date.now() }
    if (this.ws?.readyState === 1) { this.send(item); return }
    const q = this.queue(); q.push(item); try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-500))) } catch { /* ignore */ }
    this.connect()
  }
  private queue(): Record<string, unknown>[] { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]') } catch { return [] } }
  private flush() { const q = this.queue(); if (!q.length) return; for (const item of q) this.send(item); try { localStorage.removeItem(QUEUE_KEY) } catch { /* ignore */ } }
}

export const classroom = new ClassLink()
