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
  receivesFrom: (name: string) => string
  containsPart: (name: string) => string
  hintMove: (dir: 'up' | 'down' | 'left' | 'right') => string
  positions: Record<Position, string>
  textures: Record<Texture, string>
  samples: string; mine: string; nothingYet: string; importFile: string; tapToOpen: string
  bestScore: (found: number, total: number) => string
  touchToStart: string; touchAgain: string; tagline: string; g1: string; g2: string; g3: string; g4: string; intro: string; help: string; gestures: string; modeIs: (m: string) => string; speakFirst: string; speakFirstOn: string; speakFirstOff: string; soundOn: string; soundOff: string; sound: string; contrast: string; contrastOn: string; contrastOff: string
  classRoom: string; joinClass: string; roomCode: string; whoAreYou: string; thisIsMe: string; notMe: string; waitingRoster: string; joinedRoom: (room: string) => string; youAre: (name: string) => string
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
  receivesFrom: (n) => `Receives from the ${n}.`,
  containsPart: (n) => `Contains the ${n}.`,
  hintMove: (d) => `Move ${d}.`,
  positions: { 'top left': 'top left', top: 'top', 'top right': 'top right', left: 'left', centre: 'centre', right: 'right', 'bottom left': 'bottom left', bottom: 'bottom', 'bottom right': 'bottom right' },
  textures: { dots: 'dots', 'diagonal-lines': 'diagonal lines', 'horizontal-lines': 'horizontal lines', grid: 'grid', solid: 'solid', empty: 'outline' },
  samples: 'Sample diagrams', mine: 'From my teacher', nothingYet: 'Nothing from your teacher yet. Join the class with the code on the board, or start with a sample.', importFile: 'Open a diagram file', tapToOpen: 'Tap to open',
  bestScore: (f, t) => `best ${f} of ${t}`,
  touchToStart: 'Touch anywhere to start', touchAgain: 'Touch again to begin', tagline: 'Diagrams you can touch, hear and be quizzed on.', g1: 'One finger: feel the parts. Rest to hear.', g2: 'Two fingers, swipe: change mode.', g3: 'Two fingers, double-tap: where am I.', g4: 'Three fingers, tap: change language.',
  intro: 'TouchSight. Touch anything once to hear what it is, touch it again to use it. On a diagram, move one finger to feel the parts; rest it to hear the name. Swipe with two fingers to change between explore, tour, quiz and key. Double-tap with two fingers to hear where you are. Tap with three fingers to change the language.',
  help: 'Help', gestures: 'Two fingers swipe: change mode. Two fingers double-tap: where am I. Three fingers tap: change language.',
  modeIs: (m) => `${m}.`, speakFirst: 'Touch to hear first', speakFirstOn: 'Touch to hear first is on. Touch once to hear, twice to use.', speakFirstOff: 'Touch to hear first is off. Controls act on the first touch.',
  sound: 'Sound', soundOn: 'Sound on. A tone follows your finger: higher up the sheet, higher the note. Each texture has its own voice.', soundOff: 'Sound off.',
  contrast: 'High contrast', contrastOn: 'High contrast on.', contrastOff: 'High contrast off.',
  classRoom: 'Class', joinClass: 'Join my class', roomCode: 'Room code', whoAreYou: 'Who is holding this phone? Touch a name to hear it. Touch it again to choose.', thisIsMe: 'This is me', notMe: 'Not me', waitingRoster: 'Waiting for the teacher to add names.', joinedRoom: (r) => `Joined class ${r.split('').join(' ')}.`, youAre: (n) => `${n}. Welcome.`,
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
  receivesFrom: (n) => `${n} से प्राप्त करता है।`,
  containsPart: (n) => `इसमें ${n} है।`,
  hintMove: (d) => ({ up: 'ऊपर जाओ।', down: 'नीचे जाओ।', left: 'बाएँ जाओ।', right: 'दाएँ जाओ।' })[d],
  positions: { 'top left': 'ऊपर बाएँ', top: 'ऊपर', 'top right': 'ऊपर दाएँ', left: 'बाएँ', centre: 'बीच में', right: 'दाएँ', 'bottom left': 'नीचे बाएँ', bottom: 'नीचे', 'bottom right': 'नीचे दाएँ' },
  textures: { dots: 'बिंदु', 'diagonal-lines': 'तिरछी रेखाएँ', 'horizontal-lines': 'आड़ी रेखाएँ', grid: 'जाली', solid: 'भरा हुआ', empty: 'रूपरेखा' },
  samples: 'नमूना आरेख', mine: 'मेरे शिक्षक से', nothingYet: 'शिक्षक से अभी कुछ नहीं आया। बोर्ड पर लिखे कोड से कक्षा से जुड़ें, या नमूने से शुरू करें।', importFile: 'आरेख फ़ाइल खोलें', tapToOpen: 'खोलने के लिए छुएँ',
  bestScore: (f, t) => `सर्वश्रेष्ठ ${t} में से ${f}`,
  touchToStart: 'शुरू करने के लिए कहीं भी छुएँ', touchAgain: 'शुरू करने के लिए फिर छुएँ', tagline: 'आरेख जिन्हें आप छू सकें, सुन सकें और जिन पर प्रश्न हल कर सकें।', g1: 'एक उँगली: हिस्से महसूस करें। रुकें, सुनें।', g2: 'दो उँगलियाँ, स्वाइप: मोड बदलें।', g3: 'दो उँगलियाँ, दो बार: मैं कहाँ हूँ।', g4: 'तीन उँगलियाँ, छुएँ: भाषा बदलें।',
  intro: 'टचसाइट। किसी भी चीज़ को एक बार छुएँ और सुनें कि वह क्या है, फिर से छुएँ और उसे इस्तेमाल करें। आरेख पर एक उँगली घुमाएँ और हिस्सों को महसूस करें; रुकें तो नाम सुनाई देगा। दो उँगलियों से स्वाइप करें: छुएँ, सैर, प्रश्न और कुंजी के बीच बदलें। दो उँगलियों से दो बार छुएँ: मैं कहाँ हूँ। तीन उँगलियों से छुएँ: भाषा बदलें।',
  help: 'मदद', gestures: 'दो उँगली स्वाइप: मोड बदलें। दो उँगली दो बार: मैं कहाँ हूँ। तीन उँगली: भाषा बदलें।',
  modeIs: (m) => `${m}।`, speakFirst: 'पहले सुनें', speakFirstOn: 'पहले सुनें चालू। एक बार छुएँ सुनें, दो बार छुएँ इस्तेमाल करें।', speakFirstOff: 'पहले सुनें बंद। पहली छुअन पर ही काम होगा।',
  sound: 'ध्वनि', soundOn: 'ध्वनि चालू। एक सुर आपकी उँगली के साथ चलेगा: ऊपर जाएँ तो सुर ऊँचा। हर बनावट की अपनी आवाज़।', soundOff: 'ध्वनि बंद।',
  contrast: 'अधिक कंट्रास्ट', contrastOn: 'अधिक कंट्रास्ट चालू।', contrastOff: 'अधिक कंट्रास्ट बंद।',
  classRoom: 'कक्षा', joinClass: 'कक्षा से जुड़ें', roomCode: 'कक्षा कोड', whoAreYou: 'यह फ़ोन किसके पास है? नाम सुनने के लिए छुएँ। चुनने के लिए फिर छुएँ।', thisIsMe: 'यह मैं हूँ', notMe: 'मैं नहीं', waitingRoster: 'शिक्षक के नाम जोड़ने की प्रतीक्षा है।', joinedRoom: (r) => `कक्षा ${r.split('').join(' ')} से जुड़ गए।`, youAre: (n) => `${n}। स्वागत है।`,
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
  receivesFrom: (n) => `${n} ਤੋਂ ਪ੍ਰਾਪਤ ਕਰਦਾ ਹੈ।`,
  containsPart: (n) => `ਇਸ ਵਿੱਚ ${n} ਹੈ।`,
  hintMove: (d) => ({ up: 'ਉੱਪਰ ਜਾਓ।', down: 'ਹੇਠਾਂ ਜਾਓ।', left: 'ਖੱਬੇ ਜਾਓ।', right: 'ਸੱਜੇ ਜਾਓ।' })[d],
  positions: { 'top left': 'ਉੱਪਰ ਖੱਬੇ', top: 'ਉੱਪਰ', 'top right': 'ਉੱਪਰ ਸੱਜੇ', left: 'ਖੱਬੇ', centre: 'ਵਿਚਕਾਰ', right: 'ਸੱਜੇ', 'bottom left': 'ਹੇਠਾਂ ਖੱਬੇ', bottom: 'ਹੇਠਾਂ', 'bottom right': 'ਹੇਠਾਂ ਸੱਜੇ' },
  textures: { dots: 'ਬਿੰਦੀਆਂ', 'diagonal-lines': 'ਤਿਰਛੀਆਂ ਲਕੀਰਾਂ', 'horizontal-lines': 'ਲੇਟਵੀਆਂ ਲਕੀਰਾਂ', grid: 'ਜਾਲੀ', solid: 'ਭਰਿਆ ਹੋਇਆ', empty: 'ਰੂਪ-ਰੇਖਾ' },
  samples: 'ਨਮੂਨਾ ਚਿੱਤਰ', mine: 'ਮੇਰੇ ਅਧਿਆਪਕ ਤੋਂ', nothingYet: 'ਅਧਿਆਪਕ ਤੋਂ ਹਾਲੇ ਕੁਝ ਨਹੀਂ ਆਇਆ। ਬੋਰਡ ਉੱਤੇ ਲਿਖੇ ਕੋਡ ਨਾਲ ਜਮਾਤ ਨਾਲ ਜੁੜੋ, ਜਾਂ ਨਮੂਨੇ ਤੋਂ ਸ਼ੁਰੂ ਕਰੋ।', importFile: 'ਚਿੱਤਰ ਫ਼ਾਈਲ ਖੋਲ੍ਹੋ', tapToOpen: 'ਖੋਲ੍ਹਣ ਲਈ ਛੂਹੋ',
  bestScore: (f, t) => `ਵਧੀਆ ${t} ਵਿੱਚੋਂ ${f}`,
  touchToStart: 'ਸ਼ੁਰੂ ਕਰਨ ਲਈ ਕਿਤੇ ਵੀ ਛੂਹੋ', touchAgain: 'ਸ਼ੁਰੂ ਕਰਨ ਲਈ ਫਿਰ ਛੂਹੋ', tagline: 'ਚਿੱਤਰ ਜੋ ਤੁਸੀਂ ਛੂਹ, ਸੁਣ ਅਤੇ ਕੁਇਜ਼ ਕਰ ਸਕੋ।', g1: 'ਇੱਕ ਉਂਗਲ: ਹਿੱਸੇ ਮਹਿਸੂਸ ਕਰੋ। ਰੁਕੋ, ਸੁਣੋ।', g2: 'ਦੋ ਉਂਗਲਾਂ, ਸਵਾਈਪ: ਮੋਡ ਬਦਲੋ।', g3: 'ਦੋ ਉਂਗਲਾਂ, ਦੋ ਵਾਰ: ਮੈਂ ਕਿੱਥੇ ਹਾਂ।', g4: 'ਤਿੰਨ ਉਂਗਲਾਂ, ਛੂਹੋ: ਭਾਸ਼ਾ ਬਦਲੋ।',
  intro: 'ਟੱਚਸਾਈਟ। ਕਿਸੇ ਵੀ ਚੀਜ਼ ਨੂੰ ਇੱਕ ਵਾਰ ਛੂਹੋ ਤੇ ਸੁਣੋ ਕਿ ਉਹ ਕੀ ਹੈ, ਫਿਰ ਛੂਹੋ ਤੇ ਵਰਤੋ। ਚਿੱਤਰ ਉੱਤੇ ਇੱਕ ਉਂਗਲ ਘੁਮਾਓ ਤੇ ਹਿੱਸੇ ਮਹਿਸੂਸ ਕਰੋ; ਰੁਕੋ ਤਾਂ ਨਾਮ ਸੁਣੋਗੇ। ਦੋ ਉਂਗਲਾਂ ਨਾਲ ਸਵਾਈਪ ਕਰੋ: ਛੂਹੋ, ਸੈਰ, ਕੁਇਜ਼ ਤੇ ਕੁੰਜੀ ਵਿਚਕਾਰ ਬਦਲੋ। ਦੋ ਉਂਗਲਾਂ ਨਾਲ ਦੋ ਵਾਰ ਛੂਹੋ: ਮੈਂ ਕਿੱਥੇ ਹਾਂ। ਤਿੰਨ ਉਂਗਲਾਂ ਨਾਲ ਛੂਹੋ: ਭਾਸ਼ਾ ਬਦਲੋ।',
  help: 'ਮਦਦ', gestures: 'ਦੋ ਉਂਗਲਾਂ ਸਵਾਈਪ: ਮੋਡ ਬਦਲੋ। ਦੋ ਉਂਗਲਾਂ ਦੋ ਵਾਰ: ਮੈਂ ਕਿੱਥੇ ਹਾਂ। ਤਿੰਨ ਉਂਗਲਾਂ: ਭਾਸ਼ਾ ਬਦਲੋ।',
  modeIs: (m) => `${m}।`, speakFirst: 'ਪਹਿਲਾਂ ਸੁਣੋ', speakFirstOn: 'ਪਹਿਲਾਂ ਸੁਣੋ ਚਾਲੂ। ਇੱਕ ਵਾਰ ਛੂਹੋ ਸੁਣੋ, ਦੋ ਵਾਰ ਛੂਹੋ ਵਰਤੋ।', speakFirstOff: 'ਪਹਿਲਾਂ ਸੁਣੋ ਬੰਦ। ਪਹਿਲੀ ਛੋਹ ਤੇ ਹੀ ਕੰਮ ਹੋਵੇਗਾ।',
  sound: 'ਆਵਾਜ਼', soundOn: 'ਆਵਾਜ਼ ਚਾਲੂ। ਇੱਕ ਸੁਰ ਤੁਹਾਡੀ ਉਂਗਲ ਨਾਲ ਚੱਲੇਗਾ: ਉੱਪਰ ਜਾਓ ਤਾਂ ਸੁਰ ਉੱਚਾ। ਹਰ ਬਣਤਰ ਦੀ ਆਪਣੀ ਆਵਾਜ਼।', soundOff: 'ਆਵਾਜ਼ ਬੰਦ।',
  contrast: 'ਵੱਧ ਕੰਟ੍ਰਾਸਟ', contrastOn: 'ਵੱਧ ਕੰਟ੍ਰਾਸਟ ਚਾਲੂ।', contrastOff: 'ਵੱਧ ਕੰਟ੍ਰਾਸਟ ਬੰਦ।',
  classRoom: 'ਜਮਾਤ', joinClass: 'ਜਮਾਤ ਨਾਲ ਜੁੜੋ', roomCode: 'ਜਮਾਤ ਕੋਡ', whoAreYou: 'ਇਹ ਫ਼ੋਨ ਕਿਸ ਕੋਲ ਹੈ? ਨਾਮ ਸੁਣਨ ਲਈ ਛੂਹੋ। ਚੁਣਨ ਲਈ ਫਿਰ ਛੂਹੋ।', thisIsMe: 'ਇਹ ਮੈਂ ਹਾਂ', notMe: 'ਮੈਂ ਨਹੀਂ', waitingRoster: 'ਅਧਿਆਪਕ ਦੇ ਨਾਮ ਜੋੜਨ ਦੀ ਉਡੀਕ ਹੈ।', joinedRoom: (r) => `ਜਮਾਤ ${r.split('').join(' ')} ਨਾਲ ਜੁੜ ਗਏ।`, youAre: (n) => `${n}। ਜੀ ਆਇਆਂ ਨੂੰ।`,
}

export const STRINGS: Record<Lang, Dict> = { en, hi, pa }
export const LANG_NAME: Record<Lang, string> = { en: 'English', hi: 'हिन्दी', pa: 'ਪੰਜਾਬੀ' }
