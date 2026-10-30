// The opener at laptop and phone widths: the validator replay must run, the gap counter must land on the solved value, no overflow.
// usage: node scripts/shoot-home.mjs   (serve.mjs on :4173 with a fresh build)
import { chromium, devices } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const EXE = '/Users/uttampreet/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell'
const OUT = resolve('../benchmark/results/screens')
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: EXE })
const fail = []
const check = (cond, msg) => { console.log(`${cond ? 'ok ' : 'BAD'} ${msg}`); if (!cond) fail.push(msg) }
const errors = []
for (const [label, opts] of [['1440', { viewport: { width: 1440, height: 900 } }], ['phone', { ...devices['Pixel 7'] }]]) {
  const ctx = await browser.newContext(opts)
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`))
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1600)
  const early = await page.locator('.op-findings li').count()
  await page.screenshot({ path: `${OUT}/home-${label}-findings.png`, fullPage: label === 'phone' })
  await page.waitForFunction(() => document.querySelector('.op-gap b')?.classList.contains('ok'), null, { timeout: 15_000 }).catch(() => {})
  await page.waitForTimeout(300)
  const gap = await page.locator('.op-gap b').innerText()
  const findings = await page.locator('.op-findings li').allInnerTexts()
  const fixed = await page.locator('.op-findings li.fixed').count()
  const regions = await page.locator('.op-sheet svg path[fill]').count()
  await page.screenshot({ path: `${OUT}/home-${label}.png`, fullPage: label === 'phone' })
  const overflow = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, win: window.innerWidth }))
  check(early >= 1, `${label}: findings appear one by one (${early} after 1.6 s)`)
  check(findings.some((f) => /^S1/.test(f)), `${label}: real S1 findings replayed: "${findings[0]?.replace(/\n/g, ' ')}"`)
  check(+gap >= 3.0 && fixed >= 1, `${label}: counter landed on ${gap} mm and ${fixed} findings struck through`)
  check(regions >= 5, `${label}: redesigned heart drawn (${regions} filled paths)`)
  check(overflow.w <= overflow.win, `${label}: no horizontal overflow (${overflow.w}/${overflow.win})`)
  await ctx.close()
}
console.log(errors.length ? `page errors:\n${errors.join('\n')}` : 'no page errors')
console.log(fail.length ? `FAILED: ${fail.length}` : 'ALL CHECKS PASSED')
await browser.close()
process.exit(fail.length || errors.length ? 1 : 0)
