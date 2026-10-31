import { createRequire } from 'node:module'
import { cleanText, LIMITS } from '../tdm-runtime/tdm.mjs'

const require = createRequire(import.meta.url)
const liblouis = require('liblouis')
const TABLES = Object.freeze({ en: 'tables/unicode.dis,tables/en-ueb-g1.ctb', hi: 'tables/unicode.dis,tables/hi-in-g1.utb', pa: 'tables/unicode.dis,tables/pu-in-g1.utb' })
const BRF = ` A1B'K2L@CIF/MSP"E3H9O6R^DJG>NTQ,*5<-U8V.%[$+X!&;:4\\0Z7(_?W]#Y)=`

let mounted = false
let lastLog = ''
function initialize() {
  if (!mounted) {
    liblouis.registerLogCallback((_level, message) => { lastLog = message })
    liblouis.enableOnDemandTableLoading()
    mounted = true
  }
}

export function toBraille(text, language) {
  if (!Object.hasOwn(TABLES, language)) throw new Error(`Unsupported braille language: ${language}`)
  const input = cleanText(text).trim()
  if (!input) return ''
  if (input.length > LIMITS.textLength) throw new Error(`Braille input exceeds ${LIMITS.textLength} characters`)
  initialize()
  lastLog = ''
  const result = liblouis.translateString(TABLES[language], input)
  if (typeof result !== 'string') throw new Error(`liblouis could not translate text for ${language}${lastLog ? `: ${lastLog}` : ''}`)
  return result
}

export function backTranslateBraille(text, language) {
  if (!Object.hasOwn(TABLES, language)) throw new Error(`Unsupported braille language: ${language}`)
  initialize()
  const result = liblouis.backTranslateString(TABLES[language], text)
  if (typeof result !== 'string') throw new Error(`liblouis could not back-translate text for ${language}`)
  return result
}

export function toBrf(text) {
  let result = ''
  for (const char of text) {
    if (char === '\n' || char === '\r') throw new Error('BRF input cannot contain line breaks')
    if (char === ' ') { result += ' '; continue }
    const code = char.codePointAt(0)
    if (code < 0x2800 || code > 0x28ff) throw new Error('BRF input must contain only Unicode braille and spaces')
    result += BRF[code - 0x2800]
  }
  return result
}

export function writeBrf(tdm, language = tdm.languages.primary) {
  if (!Object.hasOwn(TABLES, language)) throw new Error(`Unsupported braille language: ${language}`)
  const byId = new Map([...tdm.regions, ...tdm.lines].map((element) => [element.id, element]))
  const lines = [toBrf(toBraille(tdm.title, language)), '']
  for (const entry of tdm.key) {
    const source = entry.text[language] ?? byId.get(entry.regionId)?.name[language] ?? entry.text.en
    const braille = entry.braille[language] || toBraille(source, language)
    entry.braille[language] = braille
    const row = `${toBrf(toBraille(entry.ref, language))} ${toBrf(braille)}`
    if (row.length > 40) throw new Error(`BRF key entry ${entry.ref} exceeds 40 cells`)
    lines.push(row)
  }
  if (lines.some((line) => line.length > 40)) throw new Error('BRF line exceeds 40 cells')
  return `${lines.join('\r\n')}\r\n`
}

export function fillBrailleFields(tdm) {
  const elements = new Map([...tdm.regions, ...tdm.lines].map((element) => [element.id, element]))
  for (const entry of tdm.key) {
    const element = elements.get(entry.regionId)
    if (!element) throw new Error(`Key entry ${entry.ref} references an unknown element`)
    entry.braille ??= {}
    for (const language of tdm.languages.available) {
      const source = entry.text[language] ?? element.name[language]
      if (!source) continue
      entry.braille[language] = toBraille(source, language)
    }
  }
  return tdm
}