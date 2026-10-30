import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Tdm } from '../tdm/types'

/** Offline-first store. Diagrams, their source images, and quiz results all live on the device. */
interface TouchSightDB extends DBSchema {
  diagrams: {
    key: string
    value: { id: string; tdm: Tdm; chapter: string; published: boolean; updatedAt: number }
    indexes: { byChapter: string; byUpdated: number }
  }
  images: { key: string; value: { id: string; blob: Blob; w: number; h: number } }
  quiz: {
    key: number
    value: { id?: number; diagramId: string; target: string; found: boolean; seconds: number; at: number }
    indexes: { byDiagram: string }
  }
}

let dbp: Promise<IDBPDatabase<TouchSightDB>> | null = null

export function db() {
  if (!dbp) {
    dbp = openDB<TouchSightDB>('touchsight', 1, {
      upgrade(d) {
        const diagrams = d.createObjectStore('diagrams', { keyPath: 'id' })
        diagrams.createIndex('byChapter', 'chapter')
        diagrams.createIndex('byUpdated', 'updatedAt')
        d.createObjectStore('images', { keyPath: 'id' })
        const quiz = d.createObjectStore('quiz', { keyPath: 'id', autoIncrement: true })
        quiz.createIndex('byDiagram', 'diagramId')
      },
    })
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
