import type { Lang, Texture } from '../tdm/types'

/** Everything the student app speaks or shows, in the three languages of the pilot classrooms. */

type Dict = {
  explore: string; tour: string; quiz: string; key: string; brailleOf: string; brailleOff: string; library: string; language: string; repeat: string; whereAmI: string
  play: string; pause: string; next: string; previous: string; skip: string; finish: string; again: string
  blank: string; line: string; endOfDiagram: string
  find: (name: string) => string
  correct: (name: string) => string
  wrong: (name: string) => string
  quizDone: (found: number, total: number) => string
  tourIntro: (title: string, parts: number, lines: number) => string
  parts: (n: number) => string
  flowsInto: (name: string) => string
  connectsTo: (name: string) => string
  partOf: (name: string) => string
  pointsTo: (name: string) => string
  hintMove: (dir: 'up' | 'down' | 'left' | 'right') => string
  positions: Record<Position, string>
  textures: Record<Texture, string>
  samples: string; mine: string; nothingYet: string; importFile: string; tapToOpen: string
  bestScore: (found: number, total: number) => string
}

export type Position = 'top left' | 'top' | 'top right' | 'left' | 'centre' | 'right' | 'bottom left' | 'bottom' | 'bottom right'

const en: Dict = {
  explore: 'Explore', tour: 'Tour', quiz: 'Quiz', key: 'Key', brailleOf: 'Braille key', brailleOff: 'braille unavailable here', library: 'Library', language: 'Language', repeat: 'Say it again', whereAmI: 'Where am I?',
  play: 'Play', pause: 'Pause', next: 'Next', previous: 'Previous', skip: 'Skip', finish: 'Finish', again: 'Play again',
  blank: 'Blank paper.', line: 'line', endOfDiagram: 'End of the diagram.',
  find: (n) => `Find the ${n}.`,
  correct: (n) => `Correct. That is the ${n}.`,
  wrong: (n) => `That is the ${n}. Try again.`,
  quizDone: (f, t) => `Quiz finished. ${f} of ${t} found.`,
  tourIntro: (title, p, l) => `${title}. ${p} parts and ${l} lines. Reading from the top left.`,
  parts: (n) => `${n} parts`,
  flowsInto: (n) => `Flows into the ${n}.`,
  connectsTo: (n) => `Connects to the ${n}.`,
  partOf: (n) => `Part of the ${n}.`,
  pointsTo: (n) => `Points to the ${n}.`,
  hintMove: (d) => `Move ${d}.`,
  positions: { 'top left': 'top left', top: 'top', 'top right': 'top right', left: 'left', centre: 'centre', right: 'right', 'bottom left': 'bottom left', bottom: 'bottom', 'bottom right': 'bottom right' },
  textures: { dots: 'dots', 'diagonal-lines': 'diagonal lines', 'horizontal-lines': 'horizontal lines', grid: 'grid', solid: 'solid', empty: 'outline' },
  samples: 'Sample diagrams', mine: 'From my teacher', nothingYet: 'Nothing from your teacher yet. Open a file they sent you, or start with a sample.', importFile: 'Open a diagram file', tapToOpen: 'Tap to open',
  bestScore: (f, t) => `best ${f} of ${t}`,
}

const hi: Dict = {
  explore: 'छुएँ', tour: 'सैर', quiz: 'प्रश्न', key: 'कुंजी', brailleOf: 'ब्रेल कुंजी', brailleOff: 'ब्रेल यहाँ उपलब्ध नहीं', library: 'पुस्तकालय', language: 'भाषा', repeat: 'फिर बोलो', whereAmI: 'मैं कहाँ हूँ?',
  play: 'चलाएँ', pause: 'रोकें', next: 'अगला', previous: 'पिछला', skip: 'छोड़ें', finish: 'समाप्त', again: 'फिर से',
  blank: 'खाली कागज़।', line: 'रेखा', endOfDiagram: 'आरेख समाप्त।',
  find: (n) => `${n} को ढूँढो।`,
  correct: (n) => `सही। यह ${n} है।`,
  wrong: (n) => `यह ${n} है। फिर कोशिश करो।`,
  quizDone: (f, t) => `प्रश्नोत्तरी पूरी। ${t} में से ${f} मिले।`,
  tourIntro: (title, p, l) => `${title}। ${p} भाग और ${l} रेखाएँ। ऊपर बाएँ से शुरू।`,
  parts: (n) => `${n} भाग`,
  flowsInto: (n) => `${n} में बहता है।`,
  connectsTo: (n) => `${n} से जुड़ा है।`,
  partOf: (n) => `${n} का भाग है।`,
  pointsTo: (n) => `${n} की ओर है।`,
  hintMove: (d) => ({ up: 'ऊपर जाओ।', down: 'नीचे जाओ।', left: 'बाएँ जाओ।', right: 'दाएँ जाओ।' })[d],
  positions: { 'top left': 'ऊपर बाएँ', top: 'ऊपर', 'top right': 'ऊपर दाएँ', left: 'बाएँ', centre: 'बीच में', right: 'दाएँ', 'bottom left': 'नीचे बाएँ', bottom: 'नीचे', 'bottom right': 'नीचे दाएँ' },
  textures: { dots: 'बिंदु', 'diagonal-lines': 'तिरछी रेखाएँ', 'horizontal-lines': 'आड़ी रेखाएँ', grid: 'जाली', solid: 'भरा हुआ', empty: 'रूपरेखा' },
  samples: 'नमूना आरेख', mine: 'मेरे शिक्षक से', nothingYet: 'शिक्षक से अभी कुछ नहीं आया। भेजी गई फ़ाइल खोलें, या नमूने से शुरू करें।', importFile: 'आरेख फ़ाइल खोलें', tapToOpen: 'खोलने के लिए छुएँ',
  bestScore: (f, t) => `सर्वश्रेष्ठ ${t} में से ${f}`,
}

const pa: Dict = {
  explore: 'ਛੂਹੋ', tour: 'ਸੈਰ', quiz: 'ਸਵਾਲ', key: 'ਕੁੰਜੀ', brailleOf: 'ਬ੍ਰੇਲ ਕੁੰਜੀ', brailleOff: 'ਬ੍ਰੇਲ ਇੱਥੇ ਉਪਲਬਧ ਨਹੀਂ', library: 'ਲਾਇਬ੍ਰੇਰੀ', language: 'ਭਾਸ਼ਾ', repeat: 'ਫਿਰ ਬੋਲੋ', whereAmI: 'ਮੈਂ ਕਿੱਥੇ ਹਾਂ?',
  play: 'ਚਲਾਓ', pause: 'ਰੋਕੋ', next: 'ਅਗਲਾ', previous: 'ਪਿਛਲਾ', skip: 'ਛੱਡੋ', finish: 'ਖ਼ਤਮ', again: 'ਫਿਰ ਤੋਂ',
  blank: 'ਖਾਲੀ ਕਾਗਜ਼।', line: 'ਲਕੀਰ', endOfDiagram: 'ਚਿੱਤਰ ਖ਼ਤਮ।',
  find: (n) => `${n} ਲੱਭੋ।`,
  correct: (n) => `ਸਹੀ। ਇਹ ${n} ਹੈ।`,
  wrong: (n) => `ਇਹ ${n} ਹੈ। ਫਿਰ ਕੋਸ਼ਿਸ਼ ਕਰੋ।`,
  quizDone: (f, t) => `ਕੁਇਜ਼ ਪੂਰੀ। ${t} ਵਿੱਚੋਂ ${f} ਲੱਭੇ।`,
  tourIntro: (title, p, l) => `${title}। ${p} ਭਾਗ ਅਤੇ ${l} ਲਕੀਰਾਂ। ਉੱਪਰ ਖੱਬੇ ਤੋਂ ਸ਼ੁਰੂ।`,
  parts: (n) => `${n} ਭਾਗ`,
  flowsInto: (n) => `${n} ਵਿੱਚ ਵਗਦਾ ਹੈ।`,
  connectsTo: (n) => `${n} ਨਾਲ ਜੁੜਿਆ ਹੈ।`,
  partOf: (n) => `${n} ਦਾ ਭਾਗ ਹੈ।`,
  pointsTo: (n) => `${n} ਵੱਲ ਹੈ।`,
  hintMove: (d) => ({ up: 'ਉੱਪਰ ਜਾਓ।', down: 'ਹੇਠਾਂ ਜਾਓ।', left: 'ਖੱਬੇ ਜਾਓ।', right: 'ਸੱਜੇ ਜਾਓ।' })[d],
  positions: { 'top left': 'ਉੱਪਰ ਖੱਬੇ', top: 'ਉੱਪਰ', 'top right': 'ਉੱਪਰ ਸੱਜੇ', left: 'ਖੱਬੇ', centre: 'ਵਿਚਕਾਰ', right: 'ਸੱਜੇ', 'bottom left': 'ਹੇਠਾਂ ਖੱਬੇ', bottom: 'ਹੇਠਾਂ', 'bottom right': 'ਹੇਠਾਂ ਸੱਜੇ' },
  textures: { dots: 'ਬਿੰਦੀਆਂ', 'diagonal-lines': 'ਤਿਰਛੀਆਂ ਲਕੀਰਾਂ', 'horizontal-lines': 'ਲੇਟਵੀਆਂ ਲਕੀਰਾਂ', grid: 'ਜਾਲੀ', solid: 'ਭਰਿਆ ਹੋਇਆ', empty: 'ਰੂਪ-ਰੇਖਾ' },
  samples: 'ਨਮੂਨਾ ਚਿੱਤਰ', mine: 'ਮੇਰੇ ਅਧਿਆਪਕ ਤੋਂ', nothingYet: 'ਅਧਿਆਪਕ ਤੋਂ ਹਾਲੇ ਕੁਝ ਨਹੀਂ ਆਇਆ। ਭੇਜੀ ਫ਼ਾਈਲ ਖੋਲ੍ਹੋ, ਜਾਂ ਨਮੂਨੇ ਤੋਂ ਸ਼ੁਰੂ ਕਰੋ।', importFile: 'ਚਿੱਤਰ ਫ਼ਾਈਲ ਖੋਲ੍ਹੋ', tapToOpen: 'ਖੋਲ੍ਹਣ ਲਈ ਛੂਹੋ',
  bestScore: (f, t) => `ਵਧੀਆ ${t} ਵਿੱਚੋਂ ${f}`,
}

export const STRINGS: Record<Lang, Dict> = { en, hi, pa }
export const LANG_NAME: Record<Lang, string> = { en: 'English', hi: 'हिन्दी', pa: 'ਪੰਜਾਬੀ' }
