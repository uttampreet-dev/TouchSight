import { chromium } from 'playwright-core'
const EXE='/Users/uttampreet/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell'
const browser = await chromium.launch({ executablePath: EXE, headless: true })
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } })
page.on('console', (m) => console.log(`[${m.type()}]`, m.text().slice(0, 300)))
page.on('pageerror', (e) => console.log('[pageerror]', e.message))
page.on('requestfailed', (r) => console.log('[reqfail]', r.url(), r.failure()?.errorText))
page.on('response', (r) => { if (r.status() >= 400) console.log('[http', r.status() + ']', r.url()) })
await page.goto('http://localhost:4173/teacher/understand', { waitUntil: 'networkidle' })
await page.setInputFiles('input[type=file]', '/Users/uttampreet/cu_hack/touchsight/benchmark/raw/bio-heart-01.png')
await page.click('button:has-text("Understand")')
const t0 = Date.now()
let last = ''
while (Date.now() - t0 < 60_000) {
  const txt = await page.evaluate(() => document.body.innerText)
  const stage = (txt.match(/(loading image|finding regions|reading labels|tracing lines|matching labels to regions|done)/) || [])[1] || '?'
  const err = (txt.match(/TDM invalid[^\n]*|Error[^\n]*|Cannot[^\n]*|failed[^\n]*/i) || [])[0] || ''
  const line = `${Math.round((Date.now()-t0)/1000)}s stage=${stage} ${err}`
  if (line.slice(3) !== last.slice(3)) { console.log(line); if (stage==='?') console.log('   body:', txt.replace(/\s+/g,' ').slice(0,240)) }
  last = line
  if (stage === 'done' || err) break
  await page.waitForTimeout(3000)
}
await page.screenshot({ path: '/private/tmp/claude-501/-Users-uttampreet-cu-hack/7d80c7a3-d717-46c3-9de1-d3d4edadca79/scratchpad/debug.png' })
await browser.close()
