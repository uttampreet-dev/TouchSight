import { createWorker, type Worker } from 'tesseract.js'
import { loadCv } from './cv'

export interface Label {
  id: string
  text: string
  confidence: number
  bbox: { x: number; y: number; w: number; h: number }
  centre: [number, number]
}

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
          const text = x.text.replace(/[^\w\-/().']/g, '')
          if (x.confidence < MIN_CONF || !/[A-Za-z]{2,}/.test(text)) continue
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
    g.sort((a, b) => (Math.abs(a.y0 - b.y0) > (a.y1 - a.y0) * 0.5 ? a.y0 - b.y0 : a.x0 - b.x0))
    const text = g.map((w) => w.text).join(' ').trim()
    if (text.replace(/[^A-Za-z]/g, '').length < 3) continue
    const x0 = Math.min(...g.map((w) => w.x0)), y0 = Math.min(...g.map((w) => w.y0))
    const x1 = Math.max(...g.map((w) => w.x1)), y1 = Math.max(...g.map((w) => w.y1))
    const conf = g.reduce((s, w) => s + w.conf, 0) / g.length / 100
    labels.push({ id: '', text, confidence: +conf.toFixed(2), bbox: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, centre: [(x0 + x1) / 2, (y0 + y1) / 2] })
  }
  return labels
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

/** Three passes (colour image, ink mask, equalised grayscale), clustered, de-duplicated by overlap keeping the better read. */
export async function readLabels(canvas: HTMLCanvasElement, ink?: Uint8Array): Promise<{ labels: Label[]; ms: number }> {
  const t0 = performance.now()
  const w = await worker()
  const passes = [await recognizeWords(w, canvas)]
  if (ink) passes.push(await recognizeWords(w, inkCanvas(ink, canvas.width, canvas.height)))
  passes.push(await recognizeWords(w, await claheCanvas(canvas)))
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
