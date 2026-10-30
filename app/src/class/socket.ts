import type { Tdm } from '../tdm/types'
import { relayUrl } from '../student/mirror'

/**
 * The classroom link. One room per teacher, named by a four-letter code the teacher reads aloud. The console and
 * every phone hold a socket to the relay on the app's own origin; the relay keeps the room's published diagrams,
 * roster and activity in memory, replays them to whoever joins, and fans out every change. A phone keeps what it
 * receives in IndexedDB, so the lesson still works with Wi-Fi off.
 */

export type Role = 'teacher' | 'student'

export type ActivityEvent =
  | { kind: 'opened'; diagram: string; title: string }
  | { kind: 'mode'; diagram: string; mode: string }
  | { kind: 'quiz'; diagram: string; target: string; found: boolean; seconds: number }
  | { kind: 'quizDone'; diagram: string; found: number; total: number }
  | { kind: 'named'; name: string }
export type Activity = ActivityEvent & { student: string | null; at: number }

export type RoomState = { roster: string[]; published: Tdm[]; activity: Activity[]; phones: number }

type Incoming =
  | ({ op: 'state' } & RoomState)
  | { op: 'presence'; phones: number; student: string | null; joined: boolean }
  | { op: 'roster'; names: string[] }
  | { op: 'published'; tdm: Tdm }
  | { op: 'unpublished'; id: string }
  | { op: 'activity'; event: Activity }

export type Link = 'off' | 'connecting' | 'open'

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ' // no I, L, O: read aloud, written on a board
export const newCode = () => Array.from({ length: 4 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('')
export const cleanCode = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4)
export const isCode = (s: string) => /^[A-Z]{4}$/.test(s)

export class ClassSocket {
  private ws: WebSocket | null = null
  private backoff = 1000
  private closed = false
  private heartbeat: ReturnType<typeof setInterval> | null = null
  link: Link = 'off'
  onMessage: (m: Incoming) => void = () => {}
  onLink: (l: Link) => void = () => {}
  /** sent on every (re)connect, so a room survives a relay restart and a phone's sleep */
  onOpen: () => void = () => {}

  constructor(public readonly room: string, private role: Role, public student: string | null = null) {}

  private setLink(l: Link) { this.link = l; this.onLink(l) }

  connect() {
    if (this.closed || this.ws || typeof WebSocket === 'undefined') return
    this.setLink('connecting')
    try {
      const ws = new WebSocket(relayUrl())
      this.ws = ws
      ws.onopen = () => {
        this.backoff = 1000
        this.send({ op: 'join', role: this.role, student: this.student })
        this.setLink('open')
        this.onOpen()
        this.heartbeat = setInterval(() => this.send({ op: 'ping' }), 25_000)
      }
      ws.onmessage = (e) => { try { const m = JSON.parse(e.data); if (m && m.type === 'class' && m.room === this.room) this.onMessage(m) } catch { /* stage traffic on the same relay */ } }
      ws.onclose = () => {
        this.ws = null
        if (this.heartbeat) { clearInterval(this.heartbeat); this.heartbeat = null }
        this.setLink('off')
        if (!this.closed) { setTimeout(() => this.connect(), this.backoff); this.backoff = Math.min(10_000, this.backoff * 2) }
      }
      ws.onerror = () => ws.close()
    } catch { this.ws = null; this.setLink('off') }
  }

  send(body: Record<string, unknown>): boolean {
    if (this.ws?.readyState !== 1) return false
    this.ws.send(JSON.stringify({ type: 'class', room: this.room, ...body }))
    return true
  }

  rename(student: string | null) { this.student = student; this.send({ op: 'join', role: this.role, student }) }

  close() { this.closed = true; if (this.heartbeat) clearInterval(this.heartbeat); this.ws?.close(); this.ws = null; this.setLink('off') }
}

/** A tiny observable for the two singletons below; React reads it with useSyncExternalStore. */
export class Store<T> {
  private subs = new Set<() => void>()
  constructor(private value: T) {}
  get = () => this.value
  set(next: Partial<T> | ((v: T) => T)) { this.value = typeof next === 'function' ? next(this.value) : { ...this.value, ...next }; this.subs.forEach((f) => f()) }
  subscribe = (f: () => void) => { this.subs.add(f); return () => { this.subs.delete(f) } }
}
