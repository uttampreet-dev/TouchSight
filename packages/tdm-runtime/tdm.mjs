import { readFile, mkdir, writeFile, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const LIMITS = Object.freeze({
  fileBytes: 2_000_000,
  regions: 100,
  lines: 200,
  relations: 500,
  keyEntries: 300,
  readingOrder: 300,
  coordinatePairs: 10_000,
  polygonPoints: 512,
  pathPoints: 512,
  textLength: 2_000,
  totalTextLength: 100_000,
  coordinateAbs: 1_000,
})

const LANGS = ['en', 'hi', 'pa']
const TEXTURES = ['solid', 'dots', 'diagonal-lines', 'horizontal-lines', 'grid', 'empty']
const RELATIONS = ['flows-into', 'connects', 'contains', 'part-of', 'points-to', 'greater-than']
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key)

function invalid(message) {
  throw new Error(`TDM invalid: ${message}`)
}

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(`${label} must be an object`)
  return value
}

function string(value, label, max = LIMITS.textLength, required = true) {
  if (typeof value !== 'string' || (required && !value.trim())) invalid(`${label} must be a non-empty string`)
  if (typeof value === 'string' && value.length > max) invalid(`${label} exceeds ${max} characters`)
  return value
}

function finite(value, label, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) invalid(`${label} must be finite and between ${min} and ${max}`)
  return value
}

function localized(value, label, requiredEnglish = true) {
  object(value, label)
  if (requiredEnglish) string(value.en, `${label}.en`)
  for (const lang of LANGS) if (own(value, lang)) string(value[lang], `${label}.${lang}`, LIMITS.textLength, false)
}

function point(value, label, sheet) {
  if (!Array.isArray(value) || value.length !== 2) invalid(`${label} must be a coordinate pair`)
  const x = finite(value[0], `${label}.x`, 0, Math.min(sheet.w, LIMITS.coordinateAbs))
  const y = finite(value[1], `${label}.y`, 0, Math.min(sheet.h, LIMITS.coordinateAbs))
  return [x, y]
}

function orientation(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
}

function segmentsCross(a, b, c, d) {
  const o1 = orientation(a, b, c), o2 = orientation(a, b, d)
  const o3 = orientation(c, d, a), o4 = orientation(c, d, b)
  return ((o1 > 1e-8 && o2 < -1e-8) || (o1 < -1e-8 && o2 > 1e-8)) &&
    ((o3 > 1e-8 && o4 < -1e-8) || (o3 < -1e-8 && o4 > 1e-8))
}

function polygon(value, label, sheet, budget) {
  if (!Array.isArray(value) || value.length < 3 || value.length > LIMITS.polygonPoints) invalid(`${label} must have 3 to ${LIMITS.polygonPoints} points`)
  budget.count += value.length
  if (budget.count > LIMITS.coordinatePairs) invalid(`coordinate count exceeds ${LIMITS.coordinatePairs}`)
  const points = value.map((p, i) => point(p, `${label}[${i}]`, sheet))
  let twiceArea = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length]
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6) invalid(`${label} has a zero-length edge`)
    twiceArea += a[0] * b[1] - b[0] * a[1]
  }
  if (Math.abs(twiceArea) < 1e-4) invalid(`${label} has zero area`)
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length]
    for (let j = i + 1; j < points.length; j++) {
      if (j === i || j === (i + 1) % points.length || (j + 1) % points.length === i) continue
      if (segmentsCross(a, b, points[j], points[(j + 1) % points.length])) invalid(`${label} self-intersects`)
    }
  }
  return points
}

export function assertTdm(input) {
  const d = object(input, 'document')
  if (d.tdm !== '0.1') invalid(`unsupported schema version ${String(d.tdm)}`)
  string(d.id, 'id', 64)
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(d.id)) invalid('id may contain only letters, digits, dot, underscore, and hyphen')
  string(d.title, 'title', 240)
  string(d.subject, 'subject', 120)
  const sheet = object(d.sheet, 'sheet')
  finite(sheet.w, 'sheet.w', 1, 1_000)
  finite(sheet.h, 'sheet.h', 1, 1_000)
  finite(sheet.margin, 'sheet.margin', 0, Math.min(sheet.w, sheet.h) / 2)

  const source = object(d.source, 'source')
  if (!['photo', 'upload', 'pdf', 'authored'].includes(source.kind)) invalid('source.kind is unsupported')
  if (own(source, 'file')) string(source.file, 'source.file', 512, false)
  string(source.captured, 'source.captured', 64)

  for (const [name, max] of [['regions', LIMITS.regions], ['lines', LIMITS.lines], ['relations', LIMITS.relations], ['key', LIMITS.keyEntries], ['readingOrder', LIMITS.readingOrder]]) {
    if (!Array.isArray(d[name])) invalid(`${name} must be an array`)
    if (d[name].length > max) invalid(`${name} count exceeds ${max}`)
  }

  const ids = new Set()
  const budget = { count: 0 }
  let totalText = d.title.length + d.subject.length
  const addId = (id, label) => {
    string(id, `${label}.id`, 64)
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id) || ids.has(id)) invalid(`${label} has invalid or duplicate id ${id}`)
    ids.add(id)
  }
  for (const [i, region] of d.regions.entries()) {
    const label = `regions[${i}]`; object(region, label); addId(region.id, label)
    localized(region.name, `${label}.name`)
    if (own(region, 'meaning')) string(region.meaning, `${label}.meaning`, LIMITS.textLength, false)
    region.polygon = polygon(region.polygon, `${label}.polygon`, sheet, budget)
    if (!TEXTURES.includes(region.texture)) invalid(`${label}.texture is unsupported`)
    string(region.keyRef, `${label}.keyRef`, 8)
    finite(region.confidence, `${label}.confidence`, 0, 1)
    if (own(region, 'sourceLabel')) {
      object(region.sourceLabel, `${label}.sourceLabel`)
      string(region.sourceLabel.text, `${label}.sourceLabel.text`)
      finite(region.sourceLabel.ocrConfidence, `${label}.sourceLabel.ocrConfidence`, 0, 1)
    }
    totalText += JSON.stringify(region.name).length + (region.meaning?.length ?? 0)
  }
  for (const [i, line] of d.lines.entries()) {
    const label = `lines[${i}]`; object(line, label); addId(line.id, label)
    localized(line.name, `${label}.name`)
    if (!Array.isArray(line.path) || line.path.length < 2 || line.path.length > LIMITS.pathPoints) invalid(`${label}.path must have 2 to ${LIMITS.pathPoints} points`)
    budget.count += line.path.length
    if (budget.count > LIMITS.coordinatePairs) invalid(`coordinate count exceeds ${LIMITS.coordinatePairs}`)
    line.path = line.path.map((p, j) => point(p, `${label}.path[${j}]`, sheet))
    if (line.path.some((p, j) => j > 0 && Math.hypot(p[0] - line.path[j - 1][0], p[1] - line.path[j - 1][1]) < 1e-6)) invalid(`${label}.path has a zero-length segment`)
    finite(line.width, `${label}.width`, 1.2, 20)
    if (!['single', 'double', 'dashed'].includes(line.style)) invalid(`${label}.style is unsupported`)
    if (!['none', 'start', 'end', 'both'].includes(line.arrow)) invalid(`${label}.arrow is unsupported`)
    string(line.keyRef, `${label}.keyRef`, 8)
    totalText += JSON.stringify(line.name).length
  }
  for (const [i, relation] of d.relations.entries()) {
    const label = `relations[${i}]`; object(relation, label)
    if (!ids.has(relation.from) || !ids.has(relation.to)) invalid(`${label} references an unknown element`)
    if (!RELATIONS.includes(relation.kind)) invalid(`${label}.kind is unsupported`)
    if (!['forward', 'backward', 'both'].includes(relation.direction)) invalid(`${label}.direction is unsupported`)
    if (own(relation, 'confidence')) finite(relation.confidence, `${label}.confidence`, 0, 1)
    if (own(relation, 'source') && !['detected', 'teacher'].includes(relation.source)) invalid(`${label}.source is unsupported`)
    if (own(relation, 'via')) string(relation.via, `${label}.via`, 64)
  }
  const refs = new Set()
  for (const [i, entry] of d.key.entries()) {
    const label = `key[${i}]`; object(entry, label)
    string(entry.ref, `${label}.ref`, 8)
    if (refs.has(entry.ref) || !ids.has(entry.regionId)) invalid(`${label} has duplicate ref or unknown regionId`)
    refs.add(entry.ref)
    localized(entry.text, `${label}.text`)
    object(entry.braille, `${label}.braille`)
    for (const lang of LANGS) if (own(entry.braille, lang)) string(entry.braille[lang], `${label}.braille.${lang}`, LIMITS.textLength, false)
    totalText += JSON.stringify(entry.text).length + JSON.stringify(entry.braille).length
  }
  const order = new Set()
  for (const [i, id] of d.readingOrder.entries()) {
    string(id, `readingOrder[${i}]`, 64)
    if (!ids.has(id) || order.has(id)) invalid(`readingOrder has an unknown or duplicate id ${id}`)
    order.add(id)
  }
  if (order.size !== ids.size) invalid('readingOrder must include every region and line exactly once')

  const languages = object(d.languages, 'languages')
  if (!LANGS.includes(languages.primary) || !Array.isArray(languages.available) || languages.available.length < 1 || languages.available.length > LANGS.length || languages.available.some((lang) => !LANGS.includes(lang)) || !languages.available.includes(languages.primary) || new Set(languages.available).size !== languages.available.length) invalid('languages.primary/available are invalid')
  const validation = object(d.validation, 'validation')
  if (!['pending', 'pass', 'fail'].includes(validation.status) || !Array.isArray(validation.blocking) || !Array.isArray(validation.advisory)) invalid('validation structure is invalid')
  if (validation.blocking.length > 1_000 || validation.advisory.length > 1_000) invalid('validation finding count exceeds 1000')
  for (const [kind, findings] of [['blocking', validation.blocking], ['advisory', validation.advisory]]) for (const [i, finding] of findings.entries()) {
    const label = `validation.${kind}[${i}]`; object(finding, label)
    string(finding.rule, `${label}.rule`, 32); string(finding.msg, `${label}.msg`)
    if (!Array.isArray(finding.ids) || finding.ids.length > 100) invalid(`${label}.ids is invalid`)
    finding.ids.forEach((id, j) => string(id, `${label}.ids[${j}]`, 64))
    if (own(finding, 'at')) point(finding.at, `${label}.at`, sheet)
  }
  const provenance = object(d.provenance, 'provenance')
  string(provenance.pipeline, 'provenance.pipeline', 64)
  if (typeof provenance.teacherReviewed !== 'boolean') invalid('provenance.teacherReviewed must be boolean')
  if (provenance.reviewedAt !== null) string(provenance.reviewedAt, 'provenance.reviewedAt', 64)
  if (totalText > LIMITS.totalTextLength) invalid(`total text exceeds ${LIMITS.totalTextLength} characters`)
  return d
}

export async function readTdm(filePath) {
  const fileStat = await stat(filePath)
  if (fileStat.size > LIMITS.fileBytes) throw new Error(`TDM file exceeds ${LIMITS.fileBytes} bytes`)
  const source = await readFile(filePath, 'utf8')
  let input
  try { input = JSON.parse(source) } catch (error) { throw new Error(`TDM is not valid JSON: ${error.message}`) }
  return assertTdm(input)
}

export function safeFileStem(id) {
  return id.replace(/[^A-Za-z0-9._-]/g, '_')
}

export async function writePackageOutput(cliUrl, fileName, contents) {
  if (!/^[A-Za-z0-9._-]+$/.test(fileName) || fileName.startsWith('.')) throw new Error('Unsafe output filename')
  const outputDir = join(dirname(fileURLToPath(cliUrl)), 'out')
  await mkdir(outputDir, { recursive: true })
  await writeFile(join(outputDir, fileName), contents)
  return join(outputDir, fileName)
}

export function cleanText(value) {
  return value.normalize('NFC').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, LIMITS.textLength)
}