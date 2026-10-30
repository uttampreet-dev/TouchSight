// Drive the /teacher/understand page headlessly over a set of images and record what the pipeline found.
// usage: node scripts/run-understand.mjs <image...>   (preview server must be serving dist on :4173)
import { chromium } from 'playwright-core'
import { mkdirSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'

const EXE = process.env.CHROME || '/Users/uttampreet/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell'
const BASE = process.env.BASE || 'http://localhost:4173'
const OUT = resolve('../benchmark/results')
mkdirSync(OUT, { recursive: true })

const images = process.argv.slice(2)
if (!images.length) { console.error('give image paths'); process.exit(1) }

const browser = await chromium.launch({ executablePath: EXE, headless: true })
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } })
page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()) })
page.on('pageerror', (e) => console.error('[pageerror]', e.message))

const results = []
for (const img of images) {
  const name = basename(img).replace(/\.[^.]+$/, '')
  await page.goto(`${BASE}/teacher/understand`, { waitUntil: 'networkidle' })
  await page.setInputFiles('input[type=file]', resolve(img))
  const t0 = Date.now()
  await page.click('button:has-text("Understand")')
  await page.waitForSelector('[data-testid=summary]', { timeout: 180_000 })
  const summary = await page.locator('[data-testid=summary]').innerText()
  const rows = await page.locator('[data-testid=labels] tr').allInnerTexts()
  const m = Object.fromEntries([...summary.matchAll(/(regions|labels|linked|strokes|time)\s+(\d+)/g)].map((x) => [x[1], +x[2]]))
  const r = { name, ...m, wallMs: Date.now() - t0, mode: /colour/.test(summary) ? 'colour' : 'line-art', labels: rows.map((x) => x.split('\t')) }
  results.push(r)
  await page.locator('[data-testid=overlay]').screenshot({ path: `${OUT}/${name}.overlay.png` })
  // the draft Tactile Diagram Model, as Stage 3 will receive it
  const draft = await page.evaluate((id) => {
    const T = window.__touchsight
    const { tdm } = T.draftTdm(T.last, { id, title: id, subject: id.split('-')[0], sourceKind: 'upload', file: id })
    return JSON.stringify(tdm)
  }, name)
  writeFileSync(`${OUT}/${name}.draft.tdm.json`, draft)
  console.log(`${name}: regions ${r.regions} · labels ${r.labels.length} · linked ${r.linked} · strokes ${r.strokes} · ${r.time} ms (${r.mode})`)
}
writeFileSync(`${OUT}/understand.json`, JSON.stringify(results, null, 2))
await browser.close()
