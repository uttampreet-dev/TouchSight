import { loadImage, prepare, fitToSheet, toMm, type Prepared, type SheetFit } from './image'
import { segment, type RegionCandidate } from './segment'
import { readLabels, type Label } from './ocr'
import { detectSegments, type Segment } from './lines'
import { associate, pointInPolygon, distToPolygon, type Association } from './associate'
import type { Tdm, TdmRegion, TdmLine, Texture } from '../tdm/types'
import { TEXTURES } from '../tdm/types'

export interface Understanding {
  prepared: Prepared
  regions: RegionCandidate[]
  labels: Label[]
  segments: Segment[]
  associations: Association[]
  colourful: boolean
  timings: { segment: number; ocr: number; lines: number; total: number }
}

/** Stage 1: image → regions, labels, strokes, and which label belongs to which region. */
export async function understand(src: Blob | string, onStage?: (s: string) => void): Promise<Understanding> {
  const t0 = performance.now()
  onStage?.('loading image')
  const img = await loadImage(src)
  const prepared = prepare(img)
  onStage?.('finding regions')
  const seg = await segment(prepared.image)
  onStage?.('reading labels')
  const ocr = await readLabels(prepared.canvas, seg.ink)
  onStage?.('tracing lines')
  const tl = performance.now()
  const segments = await detectSegments(seg.ink, seg.width, seg.height, ocr.labels.map((l) => l.bbox))
  const linesMs = Math.round(performance.now() - tl)
  onStage?.('matching labels to regions')
  const associations = associate(ocr.labels, seg.regions, segments, Math.max(prepared.width, prepared.height) / 1000)
  return {
    prepared,
    regions: seg.regions,
    labels: ocr.labels,
    segments,
    associations,
    colourful: seg.colourful,
    timings: { segment: seg.ms, ocr: ocr.ms, lines: linesMs, total: Math.round(performance.now() - t0) },
  }
}

const titleCase = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase())
const refLetter = (i: number) => String.fromCharCode(97 + (i % 26)) + (i >= 26 ? String(Math.floor(i / 26)) : '')

/** Draft TDM from an understanding: millimetres on the sheet, provisional names, textures assigned in Stage 3. */
export function draftTdm(u: Understanding, meta: { id: string; title: string; subject: string; sourceKind: Tdm['source']['kind']; file?: string }): { tdm: Tdm; fit: SheetFit } {
  const sheet = { w: 210, h: 297, margin: 15 }
  const fit = fitToSheet(u.prepared.width, u.prepared.height, sheet)
  const labelOf = (regionId: string) => {
    const a = u.associations.filter((x) => x.regionId === regionId).sort((x, y) => x.distance - y.distance)[0]
    return a ? u.labels.find((l) => l.id === a.labelId) : undefined
  }
  const leaderIds = new Set(u.associations.map((a) => a.leaderId).filter(Boolean))

  const regions: TdmRegion[] = u.regions.map((r, i) => {
    const lb = labelOf(r.id)
    return {
      id: `r-${String(i + 1).padStart(2, '0')}`,
      name: { en: lb ? titleCase(lb.text) : `Region ${i + 1}` },
      polygon: r.polygon.map((p) => toMm(fit, p)),
      texture: TEXTURES[i % 4] as Texture,
      keyRef: refLetter(i),
      confidence: lb ? +Math.min(1, 0.6 + 0.4 * lb.confidence).toFixed(2) : 0.5,
      sourceLabel: lb ? { text: lb.text, ocrConfidence: lb.confidence } : undefined,
    }
  })
  // A stroke is content (a vessel, wire, axis or connector) when it joins two parts or is long; a short stroke
  // with a free end is a label leader, and leaders are not drawn on a tactile graphic — the key replaces them.
  const px = Math.max(u.prepared.width, u.prepared.height)
  const longStroke = 0.25 * px
  const near = 6 * (px / 1000)
  const touchesRegion = (p: [number, number]) => u.regions.some((r) => pointInPolygon(p, r.polygon) || distToPolygon(p, r.polygon) <= near)
  const lines: TdmLine[] = u.segments
    .filter((s) => !leaderIds.has(s.id) && s.length >= 30 * (px / 1000))
    .filter((s) => s.length >= longStroke || (touchesRegion(s.a) && touchesRegion(s.b)))
    .slice(0, 16)
    .map((s, i) => ({
      id: `l-${String(i + 1).padStart(2, '0')}`,
      name: { en: `Line ${i + 1}` },
      path: [toMm(fit, s.a), toMm(fit, s.b)],
      width: 1.2,
      style: 'single',
      arrow: 'none',
      keyRef: refLetter(regions.length + i),
    }))
  const order = [...regions.map((r) => ({ id: r.id, c: centroidMm(r.polygon) })), ...lines.map((l) => ({ id: l.id, c: l.path[0] }))]
    .sort((a, b) => a.c[1] - b.c[1] || a.c[0] - b.c[0])
    .map((x) => x.id)
  const tdm: Tdm = {
    tdm: '0.1',
    id: meta.id,
    title: meta.title,
    subject: meta.subject,
    sheet,
    source: { kind: meta.sourceKind, file: meta.file, captured: new Date().toISOString() },
    regions,
    lines,
    relations: [],
    key: [...regions.map((r) => ({ ref: r.keyRef, regionId: r.id, text: r.name, braille: {} })), ...lines.map((l) => ({ ref: l.keyRef, regionId: l.id, text: l.name, braille: {} }))],
    readingOrder: order,
    languages: { primary: 'en', available: ['en'] },
    validation: { status: 'pending', blocking: [], advisory: [] },
    provenance: { pipeline: '0.1', teacherReviewed: false, reviewedAt: null },
  }
  return { tdm, fit }
}

function centroidMm(poly: [number, number][]): [number, number] {
  const n = poly.length
  return [poly.reduce((s, p) => s + p[0], 0) / n, poly.reduce((s, p) => s + p[1], 0) / n]
}

// Exposed for the headless harness and for poking at stages from the console.
declare global {
  interface Window { __touchsight?: Record<string, unknown> }
}
import { segment as _segment } from './segment'
import { detectSegments as _detectSegments } from './lines'
import { readLabels as _readLabels } from './ocr'
import { loadCv as _loadCv } from './cv'
if (typeof window !== 'undefined') {
  window.__touchsight = { understand, draftTdm, segment: _segment, detectSegments: _detectSegments, readLabels: _readLabels, loadCv: _loadCv, loadImage, prepare }
}
