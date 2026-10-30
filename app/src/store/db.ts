import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Tdm } from '../tdm/types'

/** Offline-first store. Diagrams, their source images, and quiz results all live on the device. */
interface TouchSightDB extends DBSchema {
  diagrams: {
    key: string
    value: { id: string; tdm: Tdm; chapter: string; published: boolean; updatedAt: number}
    indexes: { byChapter: string; byUpdated: number }
  }
  images: { key: string; value: { id: string; blob: Blob; w: number; h: number } }
  quiz: {
    key: number
    value: { id?: number; diagramId: string; target: string; found: boolean; seconds: number; at: number }
    indexes: { byDiagram: string }
  }
  progress: {
    key: number
    value: { id?: number; room: string; student: string; at: number; event: Record<string, unknown> }
    indexes: { byRoom: string }
  }
}

/** teacher = made on this device, class = pushed by the teacher over the classroom link, file = opened from a .tdm.json */

let dbp: Promise<IDBPDatabase<TouchSightDB>> | null = null

/** Opening never hangs: an older tab holding the previous schema is asked to close, and a 4 s wait fails loudly instead of freezing a screen. */
export function db() {
  if (!dbp) {
    const open = openDB<TouchSightDB>('touchsight', 2, {
      blocked() { console.warn('touchsight db: upgrade blocked by another open tab') },
      blocking() { dbp?.then((d) => d.close()).catch(() => {}); dbp = null },
      terminated() { dbp = null },
      upgrade(d, oldVersion) {
        if (oldVersion < 1) {
          const diagrams = d.createObjectStore('diagrams', { keyPath: 'id' })
          diagrams.createIndex('byChapter', 'chapter')
          diagrams.createIndex('byUpdated', 'updatedAt')
          d.createObjectStore('images', { keyPath: 'id' })
          const quiz = d.createObjectStore('quiz', { keyPath: 'id', autoIncrement: true })
          quiz.createIndex('byDiagram', 'diagramId')
        }
        if (oldVersion < 2) {
          const progress = d.createObjectStore('progress', { keyPath: 'id', autoIncrement: true })
          progress.createIndex('byRoom', 'room')
        }
      },
    })
    dbp = Promise.race([
      open,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Local storage is blocked by another TouchSight tab. Close the other tabs and try again.')), 4000)),
    ]).catch((e) => { dbp = null; throw e })
  }
  return dbp
}

export async function saveDiagram(tdm: Tdm, chapter: string, published: boolean) {
  const d = await db()
  await d.put('diagrams', { id: tdm.id, tdm, chapter, published, updatedAt: Date.now() })
}

export async function getDiagram(id: string) {
  return (await db()).get('diagrams', id)
}

export async function listDiagrams(onlyPublished = false) {
  const all = await (await db()).getAllFromIndex('diagrams', 'byUpdated')
  const rows = onlyPublished ? all.filter((r) => r.published) : all
  return rows.reverse()
}

export async function deleteDiagram(id: string) {
  const d = await db()
  await d.delete('diagrams', id)
  await d.delete('images', id)
}

export async function saveImage(id: string, blob: Blob, w: number, h: number) {
  await (await db()).put('images', { id, blob, w, h })
}

export async function getImage(id: string) {
  return (await db()).get('images', id)
}

export async function recordQuiz(diagramId: string, target: string, found: boolean, seconds: number) {
  await (await db()).add('quiz', { diagramId, target, found, seconds, at: Date.now() })
}

export async function quizResults(diagramId: string) {
  return (await db()).getAllFromIndex('quiz', 'byDiagram', diagramId)
}

/** Classroom activity the console has received, kept on the laptop so a lesson survives a reload. */
export async function recordProgress(room: string, student: string, at: number, event: Record<string, unknown>) {
  const d = await db()
  await d.add('progress', { room, student, at, event })
}
export async function listProgress(room: string) {
  const d = await db()
  return d.getAllFromIndex('progress', 'byRoom', room)
}
export async function clearProgress(room: string) {
  const d = await db()
  const tx = d.transaction('progress', 'readwrite')
  for (const row of await tx.store.index('byRoom').getAll(room)) await tx.store.delete(row.id!)
  await tx.done
}
