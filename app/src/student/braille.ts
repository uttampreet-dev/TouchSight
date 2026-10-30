import type { Lang } from '../tdm/types'

/** Braille transcription through liblouis running in a worker (UEB grade 1, Bharati Hindi and Punjabi tables). */

const TABLES: Record<Lang, string> = {
  en: 'unicode.dis,en-ueb-g1.ctb',
  hi: 'unicode.dis,hi-in-g1.utb',
  pa: 'unicode.dis,pu-in-g1.utb',
}

export const brailleSupported = () => typeof Worker !== 'undefined'

let worker: Worker | null = null
let seq = 0
const pending = new Map<number, (out: string | null) => void>()
const cache = new Map<string, string | null>()

function get(): Worker {
  if (!worker) {
    worker = new Worker('/liblouis/worker.js')
    worker.onmessage = (e: MessageEvent<{ id: number; out: string | null; err: string | null }>) => {
      const p = pending.get(e.data.id)
      if (p) { pending.delete(e.data.id); p(e.data.err ? null : e.data.out) }
    }
    worker.onerror = () => { for (const p of pending.values()) p(null); pending.clear() }
  }
  return worker
}

export function toBraille(text: string, lang: Lang): Promise<string | null> {
  const t = text.trim()
  if (!brailleSupported() || !t) return Promise.resolve(null)
  const k = `${lang}:${t}`
  if (cache.has(k)) return Promise.resolve(cache.get(k)!)
  return new Promise((resolve) => {
    const id = ++seq
    const done = (out: string | null) => { cache.set(k, out); resolve(out) }
    pending.set(id, done)
    get().postMessage({ id, table: TABLES[lang], text: t })
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); done(null) } }, 20_000)
  })
}
