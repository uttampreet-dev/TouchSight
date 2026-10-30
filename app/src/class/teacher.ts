import { useSyncExternalStore } from 'react'
import type { Tdm } from '../tdm/types'
import { listDiagrams } from '../store/db'
import { ClassSocket, Store, newCode, type Activity, type Link } from './socket'

/**
 * The console's side of the classroom. The code lives in localStorage so it survives a reload and stays on the
 * board all lesson. Every published diagram on this laptop is offered to the room on connect, and every publish
 * or delete afterwards is pushed at once.
 */

export type TeacherClass = {
  code: string
  link: Link
  phones: number
  roster: string[]
  present: string[]       // named students currently connected
  activity: Activity[]
  pushed: Record<string, number> // diagram id -> phones in the room when it was last pushed
}

const KEY = 'touchsight.class'
const loadCode = () => { try { const v = localStorage.getItem(KEY); if (v && /^[A-Z]{4}$/.test(v)) return v } catch { /* private mode */ } const c = newCode(); try { localStorage.setItem(KEY, c) } catch { /* ignore */ } return c }

export const teacherClass = new Store<TeacherClass>({ code: typeof localStorage !== 'undefined' ? loadCode() : 'XXXX', link: 'off', phones: 0, roster: [], present: [], activity: [], pushed: {} })

let socket: ClassSocket | null = null

function open(code: string) {
  socket?.close()
  const s = new ClassSocket(code, 'teacher')
  socket = s
  s.onLink = (link) => teacherClass.set({ link })
  s.onOpen = async () => {
    // the relay keeps a room in memory only; re-offer everything published here so a restarted relay has it all
    const rows = await listDiagrams(true)
    for (const r of rows) s.send({ op: 'publish', tdm: r.tdm })
    const t = teacherClass.get()
    if (t.roster.length) s.send({ op: 'roster', names: t.roster })
  }
  s.onMessage = (m) => {
    switch (m.op) {
      case 'state': teacherClass.set((t) => ({ ...t, phones: m.phones, roster: m.roster.length ? m.roster : t.roster, activity: m.activity })); break
      case 'presence': teacherClass.set((t) => ({ ...t, phones: m.phones, present: m.student ? (m.joined ? [...new Set([...t.present, m.student])] : t.present.filter((n) => n !== m.student)) : t.present })); break
      case 'roster': teacherClass.set({ roster: m.names }); break
      case 'activity': teacherClass.set((t) => ({ ...t, activity: [...t.activity, m.event].slice(-500), present: m.event.student ? [...new Set([...t.present, m.event.student])] : t.present })); break
    }
  }
  s.connect()
}

/** Called once when the console mounts; idempotent. */
export function startTeacherClass() { if (!socket) open(teacherClass.get().code) }

export function publishToClass(tdm: Tdm) {
  startTeacherClass()
  const sent = socket!.send({ op: 'publish', tdm })
  teacherClass.set((t) => ({ ...t, pushed: { ...t.pushed, [tdm.id]: sent ? t.phones : -1 } }))
  return sent
}

export function unpublishFromClass(id: string) { startTeacherClass(); socket!.send({ op: 'unpublish', id }) }

export function setRoster(names: string[]) {
  const clean = [...new Set(names.map((n) => n.trim()).filter(Boolean))].slice(0, 60)
  teacherClass.set({ roster: clean })
  startTeacherClass(); socket!.send({ op: 'roster', names: clean })
}

export function clearActivity() { teacherClass.set({ activity: [], present: [] }); socket?.send({ op: 'reset' }) }

/** A fresh code closes the old room: phones joined to it fall silent until they join the new one. */
export function newClassCode() {
  const code = newCode()
  try { localStorage.setItem(KEY, code) } catch { /* ignore */ }
  teacherClass.set({ code, phones: 0, present: [], activity: [], pushed: {} })
  open(code)
}

export const useTeacherClass = () => useSyncExternalStore(teacherClass.subscribe, teacherClass.get, teacherClass.get)

declare global { interface Window { __tsClass?: { publish: (t: Tdm) => boolean; unpublish: (id: string) => void; roster: (n: string[]) => void; state: () => TeacherClass } } }
if (typeof window !== 'undefined') window.__tsClass = { publish: publishToClass, unpublish: unpublishFromClass, roster: setRoster, state: teacherClass.get }
