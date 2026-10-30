// Projector gate: a phone (one browser context) and the projector (another) joined only by the relay on :4173.
// usage: node scripts/shoot-stage.mjs   (serve.mjs on :4173 with a fresh build)
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

const laptop = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const stage = await laptop.newPage()
stage.on('pageerror', (e) => errors.push('stage: ' + e.message))
await stage.goto('http://localhost:4173/stage', { waitUntil: 'networkidle' })
await stage.waitForTimeout(400)
const waiting = await stage.locator('.sg-wait').count() === 1
check(waiting || (await stage.locator('.sg-canvas svg').count()) === 1, waiting ? 'projector waits with a QR code before any phone speaks' : 'projector joined late and got the last diagram replayed by the relay')
await stage.screenshot({ path: `${OUT}/stage-waiting.png` })

const phoneCtx = await browser.newContext({ ...devices['Pixel 7'] })
const phone = await phoneCtx.newPage()
phone.on('pageerror', (e) => errors.push('phone: ' + e.message))
await phone.addInitScript(() => {
  const fake = { speaking: false, speak(u) { fake.speaking = true; setTimeout(() => { fake.speaking = false; u.onend && u.onend() }, 80 + u.text.length * 3) }, cancel() { fake.speaking = false }, getVoices: () => [], onvoiceschanged: null }
  Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true })
})
await phone.goto('http://localhost:4173/student/d/sample-heart', { waitUntil: 'networkidle' })
await phone.waitForSelector('.st-canvas svg')
await stage.waitForSelector('.sg-canvas svg', { timeout: 10_000 }).catch(() => {})
check(await stage.locator('.sg-canvas svg').count() === 1, 'projector drew the diagram it received over the relay (hello)')
check((await stage.locator('.sg-badge').innerText()).includes('relay'), `source badge: ${await stage.locator('.sg-badge').innerText()}`)

const screenOf = (name) => phone.evaluate((name) => {
  const svg = document.querySelector('.st-canvas svg'); const ctm = svg.getScreenCTM(); const t = window.__tsTdm
  const r = t.regions.find((x) => x.name.en.toLowerCase() === name.toLowerCase()); const n = r.polygon.length
  const pt = new DOMPoint(r.polygon.reduce((a, p) => a + p[0], 0) / n, r.polygon.reduce((a, p) => a + p[1], 0) / n).matrixTransform(ctm)
  return { x: pt.x, y: pt.y, id: r.id }
}, name)
const ra = await screenOf('Right Atrium'), lv = await screenOf('Left Ventricle')

// latency: time from a finger event on the phone to its arrival on the projector, same machine clock
await phone.mouse.move(ra.x, ra.y); await phone.mouse.down()
const t0 = Date.now()
await phone.mouse.move(ra.x + 1, ra.y + 1)
await stage.waitForFunction(() => (window.__sg?.events ?? 0) > 1, null, { timeout: 5000 }).catch(() => {})
const arrive = Date.now() - t0
check(arrive < 300, `first finger event reached the projector in ${arrive} ms (same machine, through the relay)`)
await phone.mouse.move(lv.x, lv.y, { steps: 25 })
await phone.waitForTimeout(400)
await stage.waitForTimeout(100)
await stage.screenshot({ path: `${OUT}/stage-trail.png` })
await phone.mouse.up()
await phone.waitForTimeout(300)
const logText = await stage.locator('.sg-log').innerText()
check(/cross\s+Right Atrium/.test(logText) && /cross\s+Left Ventricle/.test(logText), 'event log shows the boundary crossings by name')
const saidOnPhone = await phone.evaluate(() => (window.__tsLog ?? []).filter((e) => e.kind === 'say').pop()?.text)
const captionOnStage = await stage.locator('.sg-caption').innerText()
check(saidOnPhone && captionOnStage === saidOnPhone, `caption matches the phone's last utterance ("${captionOnStage}")`)

// round-trip latency through the relay, measured by ping/pong
await stage.waitForFunction(() => (window.__sg?.rtts?.length ?? 0) >= 3, null, { timeout: 9000 }).catch(() => {})
const rtts = await stage.evaluate(() => window.__sg?.rtts ?? [])
const med = rtts.length ? [...rtts].sort((a, b) => a - b)[Math.floor(rtts.length / 2)] : null
check(med != null && med < 200, `median round trip ${med} ms over ${rtts.length} pings (${rtts.join(', ')})`)

// quiz: the target outline appears on the projector
await phone.click('[role=tab]:has-text("Quiz")')
await stage.waitForSelector('.sg-target', { timeout: 5000 }).catch(() => {})
check(await stage.locator('.sg-target').count() === 1, 'quiz target outlined on the projector')
check(/quiz/i.test(await stage.locator('.sg-mode').innerText()), 'mode badge says quiz')
await stage.screenshot({ path: `${OUT}/stage-quiz.png` })

const overflow = await stage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
check(!overflow, 'no horizontal overflow on the projector')
console.log(errors.length ? `page errors:\n${errors.join('\n')}` : 'no page errors')
console.log(fail.length ? `FAILED: ${fail.length}` : 'ALL CHECKS PASSED')
await browser.close()
process.exit(fail.length || errors.length ? 1 : 0)
