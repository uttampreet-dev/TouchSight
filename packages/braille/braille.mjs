import { createRequire } from 'node:module'
import { assertTdm, cleanText, LIMITS } from '../tdm-runtime/tdm.mjs'

const require = createRequire(import.meta.url)
const liblouis = require('liblouis')
const TABLES = Object.freeze({ en: 'tables/unicode.dis,tables/en-ueb-g1.ctb', hi: 'tables/unicode.dis,tables/hi-in-g1.utb', pa: 'tables/unicode.dis,tables/pu-in-g1.utb' })
const INPUT_TEXT = {
  en: /^[A-Za-z0-9\s.,;:'!?()-]+$/,
  hi: /^[\p{Script=Devanagari}\p{M}\p{N}\sA-Za-z.,;:'!?()-]+$/u,
  pa: /^[\p{Script=Gurmukhi}\p{M}\p{N}\sA-Za-z.,;:'!?()-]+$/u,
}
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
  if (typeof text !== 'string' || text.length > LIMITS.textLength) throw new Error(`Braille input must be a string of at most ${LIMITS.textLength} characters`)
  const input = cleanText(text).trim()
  if (!input) return ''
  if (!INPUT_TEXT[language].test(input)) throw new Error(`Braille input contains unsupported characters for ${language}`)
  initialize()
  lastLog = ''
  const capacityText = `${input}${' '.repeat(input.length * 4 + 8)}`
  const result = liblouis.translateString(TABLES[language], capacityText)
  if (typeof result !== 'string') throw new Error(`liblouis could not translate text for ${language}${lastLog ? `: ${lastLog}` : ''}`)
  const output = result.trimEnd()
  if ([...output].some((char) => char !== ' ' && (char.codePointAt(0) < 0x2800 || char.codePointAt(0) > 0x283f))) throw new Error(`liblouis returned non six-dot braille for ${language}`)
  return output
}

export function backTranslateBraille(text, language) {
  if (!Object.hasOwn(TABLES, language)) throw new Error(`Unsupported braille language: ${language}`)
  if (typeof text !== 'string' || text.length > LIMITS.textLength || [...text].some((char) => char !== ' ' && (char.codePointAt(0) < 0x2800 || char.codePointAt(0) > 0x283f))) throw new Error('Back-translation input must be at most 2000 six-dot braille characters')
  initialize()
  const result = liblouis.backTranslateString(TABLES[language], text)
  if (typeof result !== 'string') throw new Error(`liblouis could not back-translate text for ${language}`)
  return result
}

export function toBrf(text) {
  if (typeof text !== 'string' || text.length > LIMITS.totalTextLength) throw new Error('BRF input must be a string of at most 100000 characters')
  let result = ''
  for (const char of text) {
    if (char === '\n' || char === '\r') throw new Error('BRF input cannot contain line breaks')
    if (char === ' ') { result += ' '; continue }
    const code = char.codePointAt(0)
    if (code < 0x2800 || code > 0x283f) throw new Error('BRF input must contain six-dot Unicode braille and spaces')
    result += BRF[code - 0x2800]
  }
  return result
}

export function writeBrf(tdm, language = tdm.languages.primary) {
  assertTdm(tdm)
  if (!Object.hasOwn(TABLES, language)) throw new Error(`Unsupported braille language: ${language}`)
  const byId = new Map([...tdm.regions, ...tdm.lines].map((element) => [element.id, element]))
  const wrap = (text, indent = '') => {
    const output = []
    let remaining = text
    while (remaining.length > 40 - indent.length) {
      output.push(`${indent}${remaining.slice(0, 40 - indent.length)}`)
      remaining = remaining.slice(40 - indent.length)
      indent = ' '
    }
    output.push(`${indent}${remaining}`)
    return output
  }
  const lines = [...wrap(toBrf(toBraille(tdm.title, language))), '']
  for (const entry of tdm.key) {
    const source = entry.text[language] ?? byId.get(entry.regionId)?.name[language] ?? entry.text.en
    const braille = entry.braille[language] || toBraille(source, language)
    entry.braille[language] = braille
    const leader = `${toBrf(toBraille(entry.ref, language))} `
    const cells = toBrf(braille)
    lines.push(...wrap(leader + cells, ''))
  }
  if (lines.some((line) => line.length > 40)) throw new Error('BRF line exceeds 40 cells')
  const pages = []
  for (let start = 0; start < lines.length; start += 25) pages.push(lines.slice(start, start + 25).join('\r\n'))
  return `${pages.join('\r\n\f')}\r\n`
}

export function fillBrailleFields(tdm) {
  assertTdm(tdm)
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