// Drive the teacher console end to end headlessly and screenshot each screen at laptop widths.
// usage: node scripts/shoot-teacher.mjs [image]   (serve.mjs must be on :4173)
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const EXE = '/Users/uttampreet/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell'
const OUT = resolve('../benchmark/results/screens')
mkdirSync(OUT, { recursive: true })
const img = resolve(process.argv[2] || '../benchmark/raw/bio-plantcell-01.png')

const browser = await chromium.launch({ executablePath: EXE })
const errors = []
for (const width of [1440, 1280]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } })
  page.on('pageerror', (e) => errors.push(`${width}: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${width}: ${m.text().slice(0, 160)}`) })
  await page.goto('http://localhost:4173/teacher', { waitUntil: 'networkidle' })
  await page.screenshot({ path: `${OUT}/teacher-capture-${width}.png` })
  await page.setInputFiles('input[type=file]', img)
  await page.fill('input[placeholder="The human heart"]', 'Plant cell')
  await page.fill('input[placeholder^="Biology"]', 'Biology · Class 9 · The fundamental unit of life')
  await page.click('button:has-text("Understand this diagram")')
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/teacher-working-${width}.png` })
  await page.waitForSelector('.wb-inspector', { timeout: 180_000 })
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/teacher-review-${width}.png` })
  // select the first element in the reading order to open the editor
  await page.click('.wb-order li >> nth=0')
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${OUT}/teacher-review-selected-${width}.png` })
  const status = await page.locator('.wb-status b').innerText()
  const findings = await page.locator('.wb-finding').allInnerTexts()
  const overflow = await page.evaluate(() => ({ docW: document.documentElement.scrollWidth, winW: window.innerWidth, horiz: document.documentElement.scrollWidth > window.innerWidth }))
  console.log(`${width}px: status "${status}", ${findings.length} findings, overflow ${JSON.stringify(overflow)}`)
  findings.slice(0, 8).forEach((f) => console.log('   ', f.replace(/\n/g, ' ')))
  if (status === 'Ready to publish') {
    await page.click('button:has-text("Publish to students")')
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${OUT}/teacher-published-${width}.png` })
  }
  await page.goto('http://localhost:4173/teacher/library', { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/teacher-library-${width}.png` })
  await page.close()
}
console.log(errors.length ? `page errors:\n${errors.join('\n')}` : 'no page errors')
await browser.close()
