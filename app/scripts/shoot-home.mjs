// The landing: a scrolling page. The explorer answers the visitor's pointer, every heading carries braille, sections reveal on scroll, counters land, no overflow, no page errors.
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
  await page.waitForTimeout(900)
  const brl = await page.locator('.ld-brl svg').count()
  const fonts = await page.evaluate(() => [...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family))])
  check(fonts.some((f) => /Bricolage/.test(f)), `${label}: display face loaded (${fonts.join(', ')})`)
  check(brl >= 5, `${label}: headings carry braille from liblouis (${brl} lines)`)
  // the scripted finger names a part
  await page.waitForFunction(() => document.querySelector('.ts-say-text b.on')?.textContent?.trim().length > 2, null, { timeout: 12_000 }).catch(() => {})
  const scripted = await page.locator('.ts-say-text b').innerText()
  check(scripted.length > 2 && !/nothing under/.test(scripted), `${label}: scripted finger named "${scripted}"`)
  if (label === '1440') {
    await page.screenshot({ path: `${OUT}/home-1440.png` })
    // the visitor's pointer takes over: hover the left ventricle (bottom-right chamber) and wait for the dwell
    const box = await page.locator('.ts-sheet svg').boundingBox()
    await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.66)
    await page.waitForTimeout(80)
    await page.mouse.move(box.x + box.width * 0.64, box.y + box.height * 0.68)
    await page.waitForTimeout(700)
    const mine = await page.locator('.ts-say-text b').innerText()
    const hint = await page.locator('.ts-hint').innerText()
    check(/Ventricle|Atrium|Heart wall/i.test(mine), `${label}: the explorer answered the pointer: "${mine}"`)
    check(/your finger/i.test(hint), `${label}: hint switched to the visitor (${hint})`)
    await page.screenshot({ path: `${OUT}/home-1440-touch.png` })
    await page.mouse.move(5, 5)
  }
  // scroll every section into view so reveals and counters run
  const ids = await page.evaluate(() => [...document.querySelectorAll('section[id]')].map((s) => s.id))
  for (const id of ids) { await page.evaluate((i) => document.getElementById(i).scrollIntoView({ block: 'start' }), id); await page.waitForTimeout(650) }
  await page.evaluate(() => document.querySelector('#validator').scrollIntoView({ block: 'center' }))
  await page.waitForSelector('.vr-gap b.ok', { timeout: 15_000 }).catch(() => {})
  await page.evaluate(() => document.querySelector('#measured').scrollIntoView({ block: 'center' }))
  await page.waitForTimeout(1800)
  const m = await page.evaluate(() => ({ rv: document.querySelectorAll('[data-rv]').length, inn: document.querySelectorAll('[data-rv].in').length, stat: document.querySelector('.ld-stats .ld-num')?.textContent, ticker: document.querySelectorAll('.ld-ticker-in span').length, vr: document.querySelectorAll('.vr-log li').length, gap: document.querySelector('.vr-gap b')?.textContent, sw: document.documentElement.scrollWidth, iw: window.innerWidth, h: document.documentElement.scrollHeight }))
  check(m.inn === m.rv, `${label}: every reveal fired (${m.inn}/${m.rv})`)
  check(m.stat === '83%', `${label}: label-recall counter landed on ${m.stat}`)
  check(m.ticker >= 12, `${label}: validator ticker has ${m.ticker} real findings`)
  check(m.vr >= 5 && /^3\.1/.test(m.gap ?? ''), `${label}: validator replay ran (${m.vr} lines, gap ${m.gap})`)
  check(m.sw <= m.iw, `${label}: no horizontal overflow (${m.sw}/${m.iw})`)
  console.log(`    ${label}: page height ${m.h}px`)
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300)
  await page.screenshot({ path: `${OUT}/home-${label}-full.png`, fullPage: true })
  await ctx.close()
}
console.log(errors.length ? `page errors:\n${errors.join('\n')}` : 'no page errors')
console.log(fail.length ? `FAILED: ${fail.length}` : 'ALL CHECKS PASSED')
await browser.close()
process.exit(fail.length || errors.length ? 1 : 0)
