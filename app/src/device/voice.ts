import type { Lang } from '../tdm/types'

/**
 * Spoken commands. Web Speech recognition on Android runs on Google's servers, so this needs a network; the touch
 * gestures do the same jobs offline. One phrase per listen, matched against short command lists in three languages.
 */
export type Command = 'where' | 'explain' | 'explore' | 'tour' | 'quiz' | 'key' | 'repeat' | 'library' | 'help' | 'next' | 'previous' | 'play' | 'pause' | 'skip' | 'lang-en' | 'lang-hi' | 'lang-pa'

type Rec = { lang: string; interimResults: boolean; maxAlternatives: number; continuous: boolean; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null; start(): void; stop(): void; abort(): void }
const Ctor = (): (new () => Rec) | null => { const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec }; return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null }
export const voiceSupported = () => typeof window !== 'undefined' && !!Ctor()
const TAG: Record<Lang, string> = { en: 'en-IN', hi: 'hi-IN', pa: 'pa-IN' }

const WORDS: Record<Command, string[]> = {
  where: ['where am i', 'where', 'kahan hoon', 'kahan hun', 'main kahan', 'मैं कहाँ', 'कहाँ हूँ', 'ਮੈਂ ਕਿੱਥੇ', 'ਕਿੱਥੇ ਹਾਂ', 'kithe'],
  explain: ['what does it do', 'what is this', 'explain', 'function', 'yeh kya hai', 'kya karta', 'यह क्या', 'क्या करता', 'समझाओ', 'ਇਹ ਕੀ', 'ਕੀ ਕਰਦਾ', 'ਸਮਝਾਓ'],
  explore: ['explore', 'touch', 'छुएँ', 'ਛੂਹੋ', 'chhuo', 'explore mode'],
  tour: ['tour', 'सैर', 'ਸੈਰ', 'sair', 'take me around'],
  quiz: ['quiz', 'test me', 'question', 'प्रश्न', 'ਕੁਇਜ਼', 'prashn', 'sawal'],
  key: ['key', 'braille', 'कुंजी', 'ਕੁੰਜੀ', 'kunji', 'legend'],
  repeat: ['repeat', 'again', 'say it again', 'फिर', 'दोबारा', 'ਫਿਰ', 'dobara', 'phir'],
  library: ['library', 'back', 'go back', 'home', 'पुस्तकालय', 'वापस', 'ਲਾਇਬ੍ਰੇਰੀ', 'ਵਾਪਸ', 'wapas'],
  help: ['help', 'मदद', 'ਮਦਦ', 'madad', 'what can i say'],
  next: ['next', 'अगला', 'ਅਗਲਾ', 'agla'],
  previous: ['previous', 'पिछला', 'ਪਿਛਲਾ', 'pichla'],
  play: ['play', 'start', 'चलाओ', 'ਚਲਾਓ', 'chalao'],
  pause: ['pause', 'stop', 'रोको', 'ਰੋਕੋ', 'roko'],
  skip: ['skip', 'छोड़ो', 'ਛੱਡੋ', 'chhodo'],
  'lang-en': ['english', 'अंग्रेज़ी', 'ਅੰਗਰੇਜ਼ੀ', 'angrezi'],
  'lang-hi': ['hindi', 'हिंदी', 'हिन्दी', 'ਹਿੰਦੀ'],
  'lang-pa': ['punjabi', 'पंजाबी', 'ਪੰਜਾਬੀ'],
}
export function matchCommand(said: string): Command | null {
  const t = said.toLowerCase().trim()
  let best: { c: Command; len: number } | null = null
  for (const [c, words] of Object.entries(WORDS) as [Command, string[]][]) for (const w of words) if (t.includes(w) && (!best || w.length > best.len)) best = { c, len: w.length }
  return best?.c ?? null
}

/** Listen once; resolves with the phrase heard, or null on silence, denial or no network. */
export function listenOnce(lang: Lang, onState?: (s: 'listening' | 'done') => void): Promise<string | null> {
  const C = Ctor()
  if (!C) return Promise.resolve(null)
  return new Promise((resolve) => {
    const r = new C()
    r.lang = TAG[lang]; r.interimResults = false; r.maxAlternatives = 3; r.continuous = false
    let done = false
    const finish = (v: string | null) => { if (!done) { done = true; onState?.('done'); resolve(v) } }
    r.onresult = (e) => { const alts = Array.from(e.results[0] ?? [], (a) => a.transcript); finish(alts.join(' | ')) }
    r.onerror = () => finish(null)
    r.onend = () => finish(null)
    try { r.start(); onState?.('listening') } catch { finish(null) }
    setTimeout(() => { try { r.stop() } catch { /* ignore */ } finish(null) }, 6000)
  })
}
