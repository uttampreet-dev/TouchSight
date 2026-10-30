import { useSyncExternalStore } from 'react'
import type { Tdm } from '../tdm/types'
import { saveDiagram, deleteDiagram, getDiagram } from '../store/db'
import { ClassSocket, Store, isCode, type ActivityEvent, type Link } from './socket'

/**
 * The phone's side of the classroom. Joining is remembered, so the app reconnects by itself every time it opens.
 * Everything the teacher publishes is written to IndexedDB the moment it arrives; the library then works offline.
 */

export type StudentClass = {
  code: string | null
  student: string | null
  link: Link
  roster: string[]
  arrived: { id: string; title: string; at: number } | null // the last diagram pushed, for the library to announce
  removed: number // bumps when the teacher withdraws one, so the library reloads
}

const KEY = 'touchsight.joined'
const load = (): { code: string | null; student: string | null } => { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && isCode(v.code)) return { code: v.code, student: v.student ?? null } } catch { /* private mode */ } return { code: null, student: null } }
const persist = (code: string | null, student: string | null) => { try { code ? localStorage.setItem(KEY, JSON.stringify({ code, student })) : localStorage.removeItem(KEY) } catch { /* ignore */ } }

export const studentClass = new Store<StudentClass>({ ...load(), link: 'off', roster: [], arrived: null, removed: 0 })

let socket: ClassSocket | null = null

async function receive(tdm: Tdm) {
  const existing = await getDiagram(tdm.id)
  await saveDiagram(tdm, tdm.subject || 'From my teacher', true, 'class')
  if (!existing || JSON.stringify(existing.tdm) !== JSON.stringify(tdm)) studentClass.set({ arrived: { id: tdm.id, title: tdm.title, at: Date.now() } })
}

function open(code: string, student: string | null) {
  socket?.close()
  const s = new ClassSocket(code, 'student', student)
  socket = s
  s.onLink = (link) => studentClass.set({ link })
  s.onMessage = async (m) => {
    switch (m.op) {
      case 'state': studentClass.set({ roster: m.roster }); for (const t of m.published) await receive(t); break
      case 'roster': studentClass.set({ roster: m.names }); break
      case 'published': await receive(m.tdm); break
      case 'unpublished': { const row = await getDiagram(m.id); if (row && row.via === 'class') { await deleteDiagram(m.id); studentClass.set((v) => ({ ...v, removed: v.removed + 1 })) } break }
    }
  }
  s.connect()
}

/** Called once when the student app mounts; reconnects to the remembered class. */
export function startStudentClass() { const { code, student } = studentClass.get(); if (code && !socket) open(code, student) }

export function joinClass(raw: string) {
  const code = raw.toUpperCase()
  if (!isCode(code)) return false
  persist(code, null)
  studentClass.set({ code, student: null, roster: [], arrived: null })
  open(code, null)
  return true
}

export function leaveClass() { socket?.close(); socket = null; persist(null, null); studentClass.set({ code: null, student: null, link: 'off', roster: [] }) }

export function iAm(name: string | null) {
  const { code } = studentClass.get()
  persist(code, name)
  studentClass.set({ student: name })
  socket?.rename(name)
  if (name) report({ kind: 'named', name })
}

export function report(event: ActivityEvent) {
  const { student } = studentClass.get()
  socket?.send({ op: 'activity', event, student, at: Date.now() })
}

export const useStudentClass = () => useSyncExternalStore(studentClass.subscribe, studentClass.get, studentClass.get)
