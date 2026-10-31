import type { Lang } from '../tdm/types'

/** Web Speech wrapper: one utterance at a time, language-aware voice choice, safe when unsupported. */

const LANG_TAG: Record<Lang, string> = { en: 'en-IN', hi: 'hi-IN', pa: 'pa-IN' }

export const speechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

let current: SpeechSynthesisUtterance | null = null

function pickVoice(lang: Lang): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices()
  const tag = LANG_TAG[lang]
  return (
    voices.find((v) => v.lang === tag && v.localService) ||
    voices.find((v) => v.lang === tag) ||
    voices.find((v) => v.lang.startsWith(tag.slice(0, 2)) && v.localService) ||
    voices.find((v) => v.lang.startsWith(tag.slice(0, 2)))
  )
}

export function speak(text: string, lang: Lang = 'en', opts: { rate?: number; interrupt?: boolean } = {}) {
  if (!speechSupported() || !text) return
  if (opts.interrupt !== false && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = LANG_TAG[lang]
  const v = pickVoice(lang)
  if (v) u.voice = v
  u.rate = opts.rate ?? 0.95
  current = u
  window.speechSynthesis.speak(u)
  return new Promise<void>((resolve) => {
    let done = false, started = false
    const finish = () => { if (!done) { done = true; clearTimeout(guard); clearTimeout(retry); resolve() } }
    u.onstart = () => { started = true }
    u.onend = finish
    u.onerror = finish
    // Android Chrome sometimes drops the first utterance after a cancel; one quiet retry
    const retry = setTimeout(() => { if (!started && !done && current === u) { try { window.speechSynthesis.speak(u) } catch { /* ignore */ } } }, 700)
    // some engines never report the end of an utterance; a listener-paced guard keeps a tour moving
    const guard = setTimeout(finish, Math.min(12_000, 600 + text.length * 70))
  })
}

export function stopSpeech() {
  if (speechSupported()) window.speechSynthesis.cancel()
  current = null
}

export function isSpeaking() {
  return speechSupported() && window.speechSynthesis.speaking
}

/** Voices load asynchronously on Android; call once at startup. */
export function warmVoices() {
  if (!speechSupported()) return
  window.speechSynthesis.getVoices()
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices()
}

export { current as currentUtterance }
