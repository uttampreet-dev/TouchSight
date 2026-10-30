// Measure the review canvas: the sheet must sit fully inside the canvas body at laptop heights.
import { chromium } from 'playwright-core'
import { resolve } from 'node:path'
const EXE = '/Users/uttampreet/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell'
const img = resolve(process.argv[2] || '../benchmark/raw/bio-heart-02.png')
const browser = await chromium.launch({ executablePath: EXE })
for (const [width, height] of [[1440, 900], [1280, 720], [1366, 768]]) {
  const page = await browser.newPage({ viewport: { width, height } })
  await page.goto('http://localhost:4173/teacher', { waitUntil: 'networkidle' })
  await page.setInputFiles('input[type=file]', img)
  await page.click('button:has-text("Understand this diagram")')
  await page.waitForSelector('.wb-inspector', { timeout: 180_000 })
  await page.waitForTimeout(300)
  const m = await page.evaluate(() => {
    const body = document.querySelector('.wb-canvas-body').getBoundingClientRect()
    const svg = document.querySelector('.wb-canvas-body svg')
    const s = svg.getBoundingClientRect()
    const paper = svg.querySelector(':scope > rect').getBoundingClientRect()
    return { body: [body.top, body.bottom, body.height].map(Math.round), svg: [s.top, s.bottom, s.height].map(Math.round), paper: [paper.top, paper.bottom, paper.left, paper.right].map(Math.round), docH: document.documentElement.scrollHeight, win: window.innerHeight }
  })
  const ok = m.paper[0] >= m.body[0] - 1 && m.paper[1] <= m.body[1] + 1 && m.docH <= m.win
  console.log(`${width}x${height}: ${ok ? 'OK ' : 'BAD'} body ${m.body} svg ${m.svg} paper t/b/l/r ${m.paper} docH ${m.docH}/${m.win}`)
  await page.screenshot({ path: resolve(`../benchmark/results/screens/teacher-review-${width}x${height}.png`) })
  await page.close()
}
await browser.close()
