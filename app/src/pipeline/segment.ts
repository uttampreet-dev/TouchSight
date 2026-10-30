import { loadCv, type CV } from './cv'

export type Px = [number, number]

export interface RegionCandidate {
  id: string
  polygon: Px[]
  area: number
  bbox: { x: number; y: number; w: number; h: number }
  centroid: Px
  meanColor: [number, number, number]
  /** how the region was found */
  method: 'colour' | 'enclosed'
}

export interface Segmentation {
  regions: RegionCandidate[]
  /** binary ink mask (255 = ink) at prepared resolution, for line detection */
  ink: Uint8Array
  width: number
  height: number
  colourful: boolean
  ms: number
}

const MIN_AREA_FRAC = 0.004
const MAX_AREA_FRAC = 0.6

/** Classical segmentation: colour clusters for coloured figures, enclosed white areas for line art. */
export async function segment(image: ImageData): Promise<Segmentation> {
  const cv = await loadCv()
  const t0 = performance.now()
  const src = cv.matFromImageData(image)
  const { width, height } = image
  const imgArea = width * height

  // ---- ink mask (dark strokes) ----
  const gray = new cv.Mat()
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
  const blur = new cv.Mat()
  cv.GaussianBlur(gray, blur, new cv.Size(3, 3), 0)
  const inkMat = new cv.Mat()
  cv.adaptiveThreshold(blur, inkMat, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 31, 12)
  const ink = new Uint8Array(inkMat.data)

  // ---- colourfulness decides the route ----
  const hsv = new cv.Mat()
  const rgb = new cv.Mat()
  cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB)
  cv.cvtColor(rgb, hsv, cv.COLOR_RGB2HSV)
  const satMean = cv.mean(hsv)[1]
  const colourful = satMean > 28

  // Outlines enclose the parts a textbook wants a reader to tell apart; colour is the fallback when
  // the drawing has no closed outlines (or the figure is a photo-like wash).
  const enclosed = enclosedRegions(cv, inkMat, imgArea, 0)
  const colour = colourful ? colourRegions(cv, rgb, imgArea) : []
  const area = (rs: RegionCandidate[]) => rs.reduce((t, r) => t + r.area, 0)
  const useEnclosed = enclosed.length >= 3 && (!colour.length || area(enclosed) >= 0.35 * area(colour))
  let regions: RegionCandidate[] = useEnclosed ? enclosed : colour
  if (regions.length < 2) regions = enclosed.length >= colour.length ? enclosed : colour
  // mean colour of each region from the image, for the teacher view
  if (useEnclosed) for (const r of regions) r.meanColor = meanColour(cv, rgb, r)
  regions = regions.map((r, i) => ({ ...r, id: `c${i}` }))

  src.delete(); gray.delete(); blur.delete(); inkMat.delete(); hsv.delete(); rgb.delete()
  return { regions, ink, width, height, colourful, ms: Math.round(performance.now() - t0) }
}

function contoursToRegions(cv: CV, contours: InstanceType<CV['MatVector']>, imgArea: number, method: RegionCandidate['method'], startIdx: number, colorOf?: (c: InstanceType<CV['Mat']>) => [number, number, number]) {
  const out: RegionCandidate[] = []
  for (let i = 0; i < contours.size(); i++) {
    const c = contours.get(i)
    const area = cv.contourArea(c)
    if (area < imgArea * MIN_AREA_FRAC || area > imgArea * MAX_AREA_FRAC) { c.delete(); continue }
    const approx = new cv.Mat()
    cv.approxPolyDP(c, approx, 0.004 * cv.arcLength(c, true), true)
    const polygon: Px[] = []
    for (let k = 0; k < approx.rows; k++) polygon.push([approx.data32S[k * 2], approx.data32S[k * 2 + 1]])
    const r = cv.boundingRect(c)
    const solidity = area / Math.max(1, r.width * r.height)
    const thin = Math.min(r.width, r.height) < Math.sqrt(imgArea) * 0.03
    if (solidity < 0.3 || thin) { approx.delete(); c.delete(); continue }
    const m = cv.moments(c)
    const centroid: Px = m.m00 ? [m.m10 / m.m00, m.m01 / m.m00] : [r.x + r.width / 2, r.y + r.height / 2]
    out.push({
      id: `c${startIdx + out.length}`,
      polygon,
      area,
      bbox: { x: r.x, y: r.y, w: r.width, h: r.height },
      centroid,
      meanColor: colorOf ? colorOf(c) : [128, 128, 128],
      method,
    })
    approx.delete(); c.delete()
  }
  return out
}

function meanColour(cv: CV, rgb: InstanceType<CV['Mat']>, r: RegionCandidate): [number, number, number] {
  const mask = cv.Mat.zeros(rgb.rows, rgb.cols, cv.CV_8U)
  const pts = cv.matFromArray(r.polygon.length, 1, cv.CV_32SC2, r.polygon.flat())
  const mv = new cv.MatVector(); mv.push_back(pts)
  cv.fillPoly(mask, mv, new cv.Scalar(255))
  const m = cv.mean(rgb, mask)
  mask.delete(); pts.delete(); mv.delete()
  return [Math.round(m[0]), Math.round(m[1]), Math.round(m[2])]
}

/** k-means on RGB; each non-background, non-ink cluster becomes region(s) via connected contours. */
function colourRegions(cv: CV, rgb: InstanceType<CV['Mat']>, imgArea: number): RegionCandidate[] {
  const K = 6
  const small = new cv.Mat()
  const f = Math.min(1, 480 / Math.max(rgb.cols, rgb.rows))
  cv.resize(rgb, small, new cv.Size(0, 0), f, f, cv.INTER_AREA)
  // flatten shading so a gradient-filled part stays one cluster
  const smooth = new cv.Mat()
  cv.bilateralFilter(small, smooth, 9, 60, 7)
  smooth.copyTo(small)
  smooth.delete()
  const samples = new cv.Mat(small.rows * small.cols, 3, cv.CV_32F)
  for (let i = 0; i < small.rows * small.cols; i++) {
    samples.data32F[i * 3] = small.data[i * 3]
    samples.data32F[i * 3 + 1] = small.data[i * 3 + 1]
    samples.data32F[i * 3 + 2] = small.data[i * 3 + 2]
  }
  const labels = new cv.Mat()
  const centers = new cv.Mat()
  const crit = new cv.TermCriteria(cv.TermCriteria_EPS + cv.TermCriteria_MAX_ITER, 12, 1.0)
  const KMEANS_PP_CENTERS = 2
  cv.kmeans(samples, K, labels, crit, 2, KMEANS_PP_CENTERS, centers)

  const cents: [number, number, number][] = []
  for (let k = 0; k < K; k++) cents.push([centers.data32F[k * 3], centers.data32F[k * 3 + 1], centers.data32F[k * 3 + 2]])
  const lum = (c: number[]) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
  const sat = (c: number[]) => Math.max(...c) - Math.min(...c)

  const out: RegionCandidate[] = []
  for (let k = 0; k < K; k++) {
    const c = cents[k]
    if (lum(c) > 225 && sat(c) < 30) continue // paper
    if (lum(c) < 70) continue // ink / outlines
    const mask = cv.Mat.zeros(small.rows, small.cols, cv.CV_8U)
    for (let i = 0; i < labels.rows; i++) if (labels.data32S[i] === k) mask.data[i] = 255
    const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(7, 7))
    cv.morphologyEx(mask, mask, cv.MORPH_OPEN, kernel)
    cv.morphologyEx(mask, mask, cv.MORPH_CLOSE, kernel)
    const full = new cv.Mat()
    cv.resize(mask, full, new cv.Size(rgb.cols, rgb.rows), 0, 0, cv.INTER_NEAREST)
    const contours = new cv.MatVector()
    const hier = new cv.Mat()
    cv.findContours(full, contours, hier, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
    out.push(...contoursToRegions(cv, contours, imgArea, 'colour', out.length, () => [Math.round(c[0]), Math.round(c[1]), Math.round(c[2])]))
    mask.delete(); kernel.delete(); full.delete(); contours.delete(); hier.delete()
  }
  small.delete(); samples.delete(); labels.delete(); centers.delete()
  return out
}

/** Line-art route: areas enclosed by ink become regions. */
function enclosedRegions(cv: CV, inkMat: InstanceType<CV['Mat']>, imgArea: number, startIdx: number): RegionCandidate[] {
  const closed = new cv.Mat()
  const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3))
  cv.dilate(inkMat, closed, kernel)
  const paper = new cv.Mat()
  cv.bitwise_not(closed, paper)
  const contours = new cv.MatVector()
  const hier = new cv.Mat()
  cv.findContours(paper, contours, hier, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE)
  const regions = contoursToRegions(cv, contours, imgArea, 'enclosed', startIdx)
  closed.delete(); kernel.delete(); paper.delete(); contours.delete(); hier.delete()
  // drop anything touching the image border: that is the page, not a part
  return regions.filter((r) => r.bbox.x > 2 && r.bbox.y > 2 && r.bbox.x + r.bbox.w < inkMat.cols - 2 && r.bbox.y + r.bbox.h < inkMat.rows - 2)
}
