// The opener: one screen at laptop sizes (no vertical scroll), the real explorer driving the finger (names, ticks, feel), braille cells rendered, no page errors.
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
const sizes = [['1440', { viewport: { width: 1440, height: 900 } }], ['1280', { viewport: { width: 1280, height: 800 } }], ['phone', { ...devices['Pixel 7'] }]]
for (const [label, opts] of sizes) {
  const ctx = await browser.newContext(opts)
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`))
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
  await page.waitForFunction(() => document.querySelector('.op-voice.on .op-voice-text')?.textContent?.trim().length > 0, null, { timeout: 12_000 }).catch(() => {})
  const caption = await page.locator('.op-voice-text').innerText()
  const focusRows = await page.locator('.op-key-row.on').count()
  await page.screenshot({ path: `${OUT}/home-${label}.png`, fullPage: label === 'phone' })
  const m = await page.evaluate(() => ({ sh: Math.max(...['.op-bench', '.op-facts', '.op-doors'].map((q) => Math.ceil(document.querySelector(q).getBoundingClientRect().bottom))), ih: window.innerHeight, keyFit: document.querySelector('.op-where p').getBoundingClientRect().bottom <= document.querySelector('.op-feel').getBoundingClientRect().top + 1, railOk: [...document.querySelectorAll('.op-rail li')].every((li) => li.querySelector('.kicker').scrollWidth <= li.clientWidth), sw: document.documentElement.scrollWidth, iw: window.innerWidth, dots: document.querySelectorAll('.op-key-cells circle[data-on]').length, buzz: document.querySelectorAll('.op-bars i.buzz').length, finger: !!document.querySelector('.op-relief svg circle[stroke="#fff"]'), fonts: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family) }))
  if (label !== 'phone') { check(m.sh <= m.ih, `${label}: one screen, everything above the fold (lowest edge ${m.sh}/${m.ih})`); check(m.keyFit, `${label}: key column clear of the feel pill`); check(m.railOk, `${label}: pipeline labels do not collide`) }
  check(m.sw <= m.iw, `${label}: no horizontal overflow (${m.sw}/${m.iw})`)
  check(/[A-Za-zऀ-੿]{3,}/.test(caption) && caption !== 'finger on the sheet', `${label}: the explorer named a part: "${caption}"`)
  check(focusRows === 1, `${label}: the key row under the finger is lit (${focusRows})`)
  check(m.dots >= 20, `${label}: braille key rendered as raised dots (${m.dots} dots)`)
  check(m.buzz >= 1, `${label}: a haptic rhythm is shown (${m.buzz} buzz bars)`)
  check(m.finger, `${label}: finger drawn on the sheet`)
  check(m.fonts.some((f) => /Montserrat/.test(f)) && m.fonts.some((f) => /JetBrains/.test(f)), `${label}: self-hosted fonts loaded (${[...new Set(m.fonts)].join(', ')})`)
  await ctx.close()
}
console.log(errors.length ? `page errors:\n${errors.join('\n')}` : 'no page errors')
console.log(fail.length ? `FAILED: ${fail.length}` : 'ALL CHECKS PASSED')
await browser.close()
process.exit(fail.length || errors.length ? 1 : 0)
