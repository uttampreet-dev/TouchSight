import { createWorker, type Worker } from 'tesseract.js'
import { loadCv } from './cv'

export interface Label {
  id: string
  text: string
  confidence: number
  bbox: { x: number; y: number; w: number; h: number }
  centre: [number, number]
  /** the printed lines of this label, top to bottom; one entry for a single-line label */
  lines?: LabelLine[]
}

export interface LabelLine { text: string; bbox: { x: number; y: number; w: number; h: number } }

interface Word { text: string; conf: number; x0: number; y0: number; x1: number; y1: number }

let workerp: Promise<Worker> | null = null

/** One OCR worker, English LSTM, every asset served from this origin so it works with the network off. */
function worker() {
  if (!workerp) {
    workerp = createWorker('eng', 1, {
      langPath: '/tessdata',
      workerPath: '/tesseract/worker.min.js',
      corePath: '/tesseract/',
      gzip: false,
      cacheMethod: 'none',
    })
  }
  return workerp
}

export async function warmOcr() {
  await worker()
}

const MIN_CONF = 45
/** A number, a degree mark or a single capital: the labels of numbered keys, angles and vertices. Accepted only when read with confidence. */
const isMark = (text: string, conf: number) => (/^\d{1,3}°?$/.test(text) && conf >= 70) || (/^[A-Z]$/.test(text) && conf >= 85)
const UPSCALE_BELOW = 1400

async function recognizeWords(w: Worker, canvas: HTMLCanvasElement): Promise<Word[]> {
  let input: HTMLCanvasElement = canvas
  let f = 1
  if (canvas.width < UPSCALE_BELOW) {
    f = UPSCALE_BELOW / canvas.width
    input = document.createElement('canvas')
    input.width = Math.round(canvas.width * f)
    input.height = Math.round(canvas.height * f)
    const ctx = input.getContext('2d')!
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(canvas, 0, 0, input.width, input.height)
  }
  const { data } = await w.recognize(input, {}, { blocks: true, text: false })
  const words: Word[] = []
  for (const b of data.blocks ?? [])
    for (const p of b.paragraphs)
      for (const line of p.lines)
        for (const x of line.words) {
          const text = x.text.replace(/[^\w\-/().'°]/g, '')
          if (x.confidence < MIN_CONF || !(/[A-Za-z]{2,}/.test(text) || isMark(text, x.confidence))) continue
          words.push({ text, conf: x.confidence, x0: x.bbox.x0 / f, y0: x.bbox.y0 / f, x1: x.bbox.x1 / f, y1: x.bbox.y1 / f })
        }
  return words
}

/** Black ink on white, so text on coloured fills reads as well as text on paper. */
function inkCanvas(ink: Uint8Array, width: number, height: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = width
  c.height = height
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(width, height)
  for (let i = 0; i < width * height; i++) {
    const v = ink[i] ? 0 : 255
    img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  return c
}

/**
 * The ink mask with everything that is not a letter taken away: outlines, leaders and fills are long or large
 * connected shapes, letters are small ones. A name written inside a part is read here, where the part's own outline
 * would otherwise make the page look like a picture.
 */
async function lettersCanvas(ink: Uint8Array, width: number, height: number): Promise<HTMLCanvasElement | null> {
  const cv = await loadCv()
  const src = cv.matFromArray(height, width, cv.CV_8UC1, ink as unknown as number[])
  const labels = new cv.Mat(), stats = new cv.Mat(), cents = new cv.Mat()
  try {
    const n = cv.connectedComponentsWithStats(src, labels, stats, cents, 8, cv.CV_32S)
    const maxH = Math.max(16, height * 0.06), maxW = width * 0.1
    const keep = new Uint8Array(n)
    let kept = 0
    for (let i = 1; i < n; i++) {
      const w = stats.intAt(i, cv.CC_STAT_WIDTH), h = stats.intAt(i, cv.CC_STAT_HEIGHT), area = stats.intAt(i, cv.CC_STAT_AREA)
      if (h <= maxH && w <= maxW && h >= 5 && area >= 8) { keep[i] = 1; kept++ }
    }
    if (kept < 3) return null
    const c = document.createElement('canvas')
    c.width = width; c.height = height
    const ctx = c.getContext('2d')!
    const img = ctx.createImageData(width, height)
    const L = labels.data32S
    for (let i = 0; i < width * height; i++) {
      const v = keep[L[i]] ? 0 : 255
      img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
    return c
  } finally { src.delete(); labels.delete(); stats.delete(); cents.delete() }
}

/** Group words into labels by where they sit, not by Tesseract's lines: a label is one or more stacked short lines. */
function clusterWords(words: Word[]): Label[] {
  const n = words.length
  const parent = Array.from({ length: n }, (_, i) => i)
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  const union = (a: number, b: number) => { parent[find(a)] = find(b) }
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = words[i], b = words[j]
      const ha = a.y1 - a.y0, hb = b.y1 - b.y0, h = (ha + hb) / 2
      if (Math.abs(ha - hb) > h * 0.8) continue // very different sizes are different labels
      const vOverlap = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0)
      const hGap = Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1)
      const sameLine = vOverlap > h * 0.5 && hGap <= h * 0.9
      const hOverlap = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)
      const vGap = Math.max(a.y0, b.y0) - Math.min(a.y1, b.y1)
      // lines of one label sit tight (≈0.2–0.4 h apart); separate stacked labels sit ≥0.8 h apart
      const wa = a.x1 - a.x0, wb = b.x1 - b.x0
      const centred = Math.abs((a.x0 + a.x1) / 2 - (b.x0 + b.x1) / 2) <= Math.max(wa, wb) * 0.2
      const stacked = hOverlap > Math.min(wa, wb) * 0.3 && (vGap <= h * 0.45 || (vGap <= h * 0.6 && centred))
      if (sameLine || stacked) union(i, j)
    }
  }
  const groups = new Map<number, Word[]>()
  words.forEach((w, i) => { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r)!.push(w) })
  const labels: Label[] = []
  for (const g of groups.values()) {
    // the printed lines are kept on the label; a column of stacked labels is split later, where the leader lines are known
    const rows = toLines(g)
    const parts = [rows]
    for (const part of parts) {
      const ws = part.flat()
      const text = part.map((r) => r.map((w) => w.text).join(' ')).join(' ').trim()
      if (text.replace(/[^A-Za-z]/g, '').length < 3 && !(ws.length === 1 && isMark(text, ws[0].conf))) continue
      const box = bboxOf(ws)
      const conf = ws.reduce((s, w) => s + w.conf, 0) / ws.length / 100
      labels.push({
        id: '', text, confidence: +conf.toFixed(2), bbox: box, centre: [box.x + box.w / 2, box.y + box.h / 2],
        lines: part.map((r) => ({ text: r.map((w) => w.text).join(' '), bbox: bboxOf(r) })),
      })
    }
  }
  return labels
}

const bboxOf = (ws: Word[]) => {
  const x0 = Math.min(...ws.map((w) => w.x0)), y0 = Math.min(...ws.map((w) => w.y0))
  const x1 = Math.max(...ws.map((w) => w.x1)), y1 = Math.max(...ws.map((w) => w.y1))
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

/** Words of one cluster grouped into printed lines (top to bottom, left to right within a line). */
function toLines(g: Word[]): Word[][] {
  const sorted = [...g].sort((a, b) => a.y0 - b.y0)
  const rows: Word[][] = []
  for (const w of sorted) {
    const row = rows.find((r) => { const y0 = Math.min(...r.map((x) => x.y0)), y1 = Math.max(...r.map((x) => x.y1)); return Math.min(y1, w.y1) - Math.max(y0, w.y0) > (w.y1 - w.y0) * 0.5 })
    if (row) row.push(w); else rows.push([w])
  }
  for (const r of rows) r.sort((a, b) => a.x0 - b.x0)
  return rows
}

const iou = (a: Label['bbox'], b: Label['bbox']) => {
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x))
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
  const inter = ix * iy
  return inter / (a.w * a.h + b.w * b.h - inter)
}

/** Contrast-equalised grayscale: in-figure text on coloured fills reads better than on the raw image. */
async function claheCanvas(canvas: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  const cv = await loadCv()
  const src = cv.imread(canvas)
  const gray = new cv.Mat()
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
  const clahe = new cv.CLAHE(3.0, new cv.Size(8, 8))
  const eq = new cv.Mat()
  clahe.apply(gray, eq)
  const out = document.createElement('canvas')
  out.width = canvas.width
  out.height = canvas.height
  cv.imshow(out, eq)
  src.delete(); gray.delete(); eq.delete(); clahe.delete()
  return out
}

/** Four passes (colour image, ink mask, equalised grayscale, letters alone), clustered, de-duplicated by overlap keeping the better read. */
export async function readLabels(canvas: HTMLCanvasElement, ink?: Uint8Array): Promise<{ labels: Label[]; ms: number }> {
  const t0 = performance.now()
  const w = await worker()
  const passes = [await recognizeWords(w, canvas)]
  if (ink) passes.push(await recognizeWords(w, inkCanvas(ink, canvas.width, canvas.height)))
  passes.push(await recognizeWords(w, await claheCanvas(canvas)))
  if (ink) { const letters = await lettersCanvas(ink, canvas.width, canvas.height).catch(() => null); if (letters) passes.push(await recognizeWords(w, letters)) }
  const merged: Label[] = []
  for (const pass of passes) {
    for (const lb of clusterWords(pass)) {
      const k = merged.findIndex((m) => iou(m.bbox, lb.bbox) > 0.35)
      if (k < 0) { merged.push(lb); continue }
      const cur = merged[k]
      const better = lb.confidence > cur.confidence + 0.08 || (Math.abs(lb.confidence - cur.confidence) <= 0.08 && lb.text.length > cur.text.length)
      if (better) merged[k] = lb
    }
  }
  merged.sort((a, b) => a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x)
  merged.forEach((l, i) => (l.id = `t${i}`))
  return { labels: merged, ms: Math.round(performance.now() - t0) }
}
