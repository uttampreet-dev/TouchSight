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
  await page.waitForSelector('.wb-canvas-body svg', { timeout: 180_000 })
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/teacher-review-${width}.png` })
  // select the first element in the reading order to open the editor
  await page.click('.wb-order li >> nth=0')
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${OUT}/teacher-review-selected-${width}.png` })
  // the relation beat: the pipeline proposes, the teacher confirms one, draws one, and the block clears
  const proposed = await page.locator('.wb-rel.detected').count()
  const r3 = (await page.locator('.wb-finding').allInnerTexts()).filter((f) => f.startsWith('R3'))
  console.log(`${width}px: ${proposed} relations proposed, ${r3.length} R3 findings${r3[0] ? ` — "${r3[0].replace(/\n/g, ' ')}"` : ''}`)
  if (proposed) {
    await page.screenshot({ path: `${OUT}/teacher-relations-${width}.png` })
    await page.locator('.wb-rel.detected .ok').first().click()
    await page.waitForTimeout(200)
    while (await page.locator('.wb-rel.detected').count()) { await page.locator('.wb-rel.detected .no').first().click(); await page.waitForTimeout(150) }
  }
  const draw = await page.evaluate(() => {
    const t = window.__wb; if (!t) return null
    const byName = (n) => t.regions.find((r) => r.name.en.toLowerCase() === n)
    const from = byName('left atrium'), to = byName('left ventricle'); if (!from || !to) return null
    const svg = document.querySelector('.wb-canvas-body svg'); const ctm = svg.getScreenCTM()
    const c = to.polygon.reduce((a, p) => [a[0] + p[0] / to.polygon.length, a[1] + p[1] / to.polygon.length], [0, 0])
    const pt = new DOMPoint(c[0], c[1]).matrixTransform(ctm)
    return { fromId: from.id, x: pt.x, y: pt.y }
  })
  if (draw) {
    await page.click(`.wb-order li:has-text("Left Atrium")`)
    await page.click('button:has-text("relate to…")')
    await page.mouse.click(draw.x, draw.y)
    await page.waitForTimeout(200)
    const rows = page.locator('.wb-rel')
    const last = rows.nth((await rows.count()) - 1)
    await last.locator('select').selectOption('flows-into')
    await page.waitForTimeout(200)
    const sentence = (await last.innerText()).replace(/\n/g, ' ')
    console.log(`${width}px: drew "${sentence}"`)
    await page.screenshot({ path: `${OUT}/teacher-relations-drawn-${width}.png` })
  }
  const status = await page.locator('.wb-status b').innerText()
  const findings = await page.locator('.wb-finding').allInnerTexts()
  const overflow = await page.evaluate(() => ({ docW: document.documentElement.scrollWidth, winW: window.innerWidth, horiz: document.documentElement.scrollWidth > window.innerWidth }))
  console.log(`${width}px: status "${status}", ${findings.length} findings, overflow ${JSON.stringify(overflow)}`)
  findings.slice(0, 8).forEach((f) => console.log('   ', f.replace(/\n/g, ' ')))
  if (status === 'Ready to publish') {
    await page.click('button:has-text("Publish to students")')
    await page.waitForTimeout(400)
    await page.waitForFunction(() => /liblouis|built-in/.test(document.querySelector('.xp-braille')?.textContent ?? ''), null, { timeout: 30_000 }).catch(() => {})
    for (const label of ['Tactile SVG', '3-D relief STL', 'Braille key BRF', 'Alt-text']) { await page.click(`.xp button:has-text("${label}")`); await page.waitForTimeout(300) }
    const facts = await page.locator('.xp-facts').allInnerTexts()
    console.log(`${width}px: export facts — ${facts.filter(Boolean).join(' | ')}`)
    await page.screenshot({ path: `${OUT}/teacher-published-${width}.png` })
  }
  await page.goto('http://localhost:4173/teacher/library', { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/teacher-library-${width}.png` })
  await page.close()
}
console.log(errors.length ? `page errors:\n${errors.join('\n')}` : 'no page errors')
await browser.close()
