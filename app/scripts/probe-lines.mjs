import { chromium } from 'playwright-core'
const EXE='/Users/uttampreet/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell'
const browser = await chromium.launch({ executablePath: EXE })
const page = await browser.newPage()
page.on('pageerror', (e) => console.log('[pageerror]', e.message))
await page.goto('http://localhost:4173/teacher/understand', { waitUntil: 'networkidle' })
const out = await page.evaluate(async () => {
  const T = window.__touchsight
  const img = await T.loadImage('/benchmark-dev/bio-plantcell-01.png').catch(e => ({ err: String(e) }))
  if (img.err) return img
  const prep = T.prepare(img)
  const seg = await T.segment(prep.image)
  const cv = await T.loadCv()
  const { ink, width, height } = seg
  let nz = 0; for (let i = 0; i < ink.length; i++) if (ink[i]) nz++
  const mat = cv.matFromArray(height, width, cv.CV_8UC1, Array.from(ink))
  const countNZ = (m) => { let n = 0; for (let i = 0; i < m.data.length; i++) if (m.data[i]) n++; return n }
  const res = { width, height, inkLen: ink.length, inkNonZero: nz, matNonZero: countNZ(mat), matType: mat.type(), CV_8UC1: cv.CV_8UC1 }
  const lines = new cv.Mat()
  cv.HoughLinesP(mat, lines, 1, Math.PI / 180, 28, 30, 14)
  res.houghRawRows = lines.rows; res.houghCols = lines.cols; res.houghType = lines.type(); res.dataLen = lines.data32S.length
  const k = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(5, 5))
  const d = new cv.Mat(); cv.dilate(mat, d, k)
  const l2 = new cv.Mat(); cv.HoughLinesP(d, l2, 1, Math.PI / 180, 28, 30, 14)
  res.houghAfterDilate = l2.rows
  const segs = await T.detectSegments(ink, width, height, [])
  res.detectSegmentsNoMask = segs.length
  return res
})
console.log(JSON.stringify(out, null, 1))
await browser.close()
