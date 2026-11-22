// The classroom on one screen, the chapter print pack, the review log and the class heat map, checked against a
// running build. usage: node scripts/shoot-preview.mjs   (serve.mjs on :4173 with a fresh build)
import { chromium } from 'playwright-core'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const EXE = process.env.CHROME || '/Users/uttampreet/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell'
const BASE = process.env.BASE || 'http://localhost:4173'
const OUT = resolve('../benchmark/results/screens')
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: EXE })
const fail = [], errors = []
const check = (cond, msg) => { console.log(`${cond ? 'ok ' : 'BAD'} ${msg}`); if (!cond) fail.push(msg) }
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
await ctx.addInitScript(() => { window.__said = []; if (window.speechSynthesis) window.speechSynthesis.speak = (u) => { window.__said.push(u.text); setTimeout(() => u.onstart?.(new Event('start')), 5); setTimeout(() => u.onend?.(new Event('end')), 80) } })
const page = await ctx.newPage()
page.on('pageerror', (e) => errors.push(e.message))

// compile and publish the heart, with two edits, so the library has a reviewed diagram
await page.goto(`${BASE}/teacher?sample=bio-heart-02`, { waitUntil: 'networkidle' })
await page.waitForSelector('.wb-status', { timeout: 120_000 })
while (await page.locator('.wb-rel.detected .btn.primary.ok').count()) await page.locator('.wb-rel.detected .btn.primary.ok').first().click()
await page.waitForTimeout(1200)
const live = await page.locator('.wb-status .mono').innerText()
check(/review \d:\d\d · \d+ edits?/.test(live), `the review clock and edit count run while the teacher works: "${live}"`)
check((await page.locator('.wb-status').getAttribute('data-status')) === 'pass', 'confirming the detected relations clears every blocking finding')
await page.screenshot({ path: `${OUT}/console-review-clock.png` })
await page.locator('.wb-publish .wb-go').click()
await page.waitForSelector('.wb-next', { timeout: 10_000 })
const review = await page.evaluate(() => window.__wb?.provenance.review)
check(review && review.edits >= 1 && review.seconds >= 1, `publishing stores the review: ${JSON.stringify(review)}`)
await page.screenshot({ path: `${OUT}/console-published-next.png` })

// the classroom on one screen
await page.locator('.wb-next .btn.coral').click()
await page.waitForSelector('.pv-bezel iframe', { timeout: 10_000 })
const phone = page.frameLocator('.pv-bezel iframe'), stage = page.frameLocator('.pv-screen iframe')
await phone.locator('.st-canvas svg').waitFor({ timeout: 15_000 })
await stage.locator('.sg-canvas svg').waitFor({ timeout: 15_000 })
check(true, 'the phone and the projector load side by side and the projector already shows the diagram')
const box = await phone.locator('.st-canvas svg').boundingBox()
const at = (fx, fy) => [box.x + box.width * fx, box.y + box.height * fy]
await page.mouse.move(...at(0.3, 0.3)); await page.mouse.down()
for (const [fx, fy] of [[0.35, 0.35], [0.6, 0.35], [0.65, 0.38], [0.65, 0.65], [0.62, 0.68]]) { await page.mouse.move(...at(fx, fy), { steps: 8 }); await page.waitForTimeout(450) }
const under = await stage.locator('.sg-now').innerText()
const caption = await stage.locator('.sg-caption').innerText()
check(/under the finger: /.test(under) && caption.length > 2, `the projector follows the pointer: "${under}" · caption "${caption}"`)
await page.screenshot({ path: `${OUT}/preview-phone-projector.png` })
await page.mouse.up()
await page.locator('.pv-bar .btn', { hasText: 'guided tour' }).click()
await phone.locator('.st-guide').waitFor({ timeout: 10_000 })
check(true, 'the guided tour starts inside the preview')
await page.waitForTimeout(900)
await page.screenshot({ path: `${OUT}/preview-guided.png` })

// the library: review time on the card, the review log, the chapter pack
await page.goto(`${BASE}/teacher/library`, { waitUntil: 'networkidle' })
await page.waitForSelector('.lib-card')
const meta = await page.locator('.lib-card-m').first().innerText()
check(/reviewed in \d:\d\d, \d+ edits/.test(meta), `the library card carries the review cost: "${meta}"`)
const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('.lib-log').click()])
const csv = (await (await dl.createReadStream()).toArray()).join('')
check(csv.split('\n')[0].includes('review_seconds') && csv.split('\n').length >= 3, `the review log downloads as CSV: ${csv.split('\n')[1]?.slice(0, 90)}`)
await page.screenshot({ path: `${OUT}/library-review.png` })
const href = await page.locator('.lib-pack').first().getAttribute('href')
await page.goto(`${BASE}${href}`, { waitUntil: 'networkidle' })
await page.waitForSelector('.pp-sheet svg', { timeout: 20_000 })
const pages = await page.locator('.pp-page').count()
const size = await page.locator('.pp-sheet svg').first().evaluate((s) => ({ w: s.getAttribute('width'), h: s.getAttribute('height'), dots: s.querySelectorAll('circle').length }))
check(pages >= 2 && size.w === '210mm' && size.h === '297mm', `the chapter pack lays out ${pages} A4 pages (sheet ${size.w} × ${size.h}, ${size.dots} circles incl. braille dots)`)
await page.screenshot({ path: `${OUT}/print-pack.png` })
const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true })
writeFileSync(`${OUT}/chapter-pack.pdf`, pdf)
check(pdf.length > 20_000, `the pack prints to a PDF of ${(pdf.length / 1024).toFixed(0)} kB`)

await browser.close()
if (errors.length) console.log('page errors:', errors)
console.log(fail.length ? `\n${fail.length} FAILED` : '\nall checks passed')
process.exit(fail.length || errors.length ? 1 : 0)
