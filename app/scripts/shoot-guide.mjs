// Three paths a first visitor takes, checked end to end against a running build:
//   1. the console compiles a shipped textbook figure from one click;
//   2. the phone's guided first diagram waits for each real gesture;
//   3. the teacher points at a part and a phone in the room finds it.
// usage: node scripts/shoot-guide.mjs   (serve.mjs on :4173 with a fresh build)
import { chromium, devices } from 'playwright-core'
import { mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const EXE = process.env.CHROME || '/Users/uttampreet/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell'
const BASE = process.env.BASE || 'http://localhost:4173'
const OUT = resolve('../benchmark/results/screens')
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: EXE })
const fail = [], errors = []
const check = (cond, msg) => { console.log(`${cond ? 'ok ' : 'BAD'} ${msg}`); if (!cond) fail.push(msg) }
const quietSpeech = () => { window.__said = []; if (window.speechSynthesis) window.speechSynthesis.speak = (u) => { window.__said.push(u.text); setTimeout(() => u.onstart?.(new Event('start')), 5); setTimeout(() => u.onend?.(new Event('end')), 80) } }

// ---- 1. console: one click on a shipped figure
const laptop = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const con = await laptop.newPage()
con.on('pageerror', (e) => errors.push(`console: ${e.message}`))
await con.goto(`${BASE}/teacher`, { waitUntil: 'networkidle' })
const samples = await con.locator('.wb-sample').count()
check(samples >= 3, `console offers ${samples} textbook figures under the dropzone`)
await con.screenshot({ path: `${OUT}/console-figures.png` })
await con.locator('.wb-sample').first().click()
await con.waitForSelector('.wb-status', { timeout: 120_000 })
const status = await con.locator('.wb-status b').innerText()
const regions = await con.evaluate(() => window.__wb?.regions.map((r) => r.name.en))
check(regions?.length >= 4, `the heart compiled from one click: ${regions?.join(', ')} (${status})`)
await con.waitForTimeout(600)
await con.screenshot({ path: `${OUT}/console-figure-compiled.png` })
// the landing's deep link does the same without a click
await con.goto(`${BASE}/teacher?sample=bio-plantcell-02`, { waitUntil: 'networkidle' })
await con.waitForSelector('.wb-status', { timeout: 120_000 })
check((await con.evaluate(() => window.__wb?.title)) === 'A plant cell', 'the ?sample= link opens the console already compiled')

// ---- 2. phone: the guided first diagram
const phoneCtx = await browser.newContext({ ...devices['Pixel 7'] })
const phone = await phoneCtx.newPage()
phone.on('pageerror', (e) => errors.push(`phone: ${e.message}`))
await phone.addInitScript(() => { try { localStorage.setItem('touchsight-intro-seen', '1'); localStorage.setItem('touchsight-speak-first', 'off') } catch {} })
await phone.addInitScript(quietSpeech)
await phone.goto(`${BASE}/student`, { waitUntil: 'networkidle' })
check(await phone.locator('.st-try').isVisible(), 'the library opens with the Try it now card')
await phone.screenshot({ path: `${OUT}/student-try-card.png` })
await phone.locator('.st-try').click()
await phone.waitForSelector('.st-guide', { timeout: 10_000 })
const stepNo = async () => (await phone.locator('.st-guide-dots i.on').count()) ? await phone.evaluate(() => [...document.querySelectorAll('.st-guide-dots i')].findIndex((i) => i.classList.contains('on')) + 1) : 0
await phone.waitForTimeout(1200)
check((await stepNo()) === 1, 'guide starts at step 1 and speaks it: ' + JSON.stringify((await phone.evaluate(() => window.__said.at(-1)))?.slice(0, 50)))
await phone.screenshot({ path: `${OUT}/student-guide-1.png` })
const box = await phone.locator('.st-canvas svg').boundingBox()
const at = (fx, fy) => ({ x: box.x + box.width * fx, y: box.y + box.height * fy })
// one finger moving: the first boundary advances the guide
await phone.mouse.move(at(0.1, 0.1).x, at(0.1, 0.1).y); await phone.mouse.down()
for (const [fx, fy] of [[0.2, 0.25], [0.3, 0.35], [0.35, 0.4], [0.4, 0.45]]) { const p = at(fx, fy); await phone.mouse.move(p.x, p.y, { steps: 5 }); await phone.waitForTimeout(120) }
await phone.waitForFunction(() => [...document.querySelectorAll('.st-guide-dots i')].findIndex((i) => i.classList.contains('on')) === 1, null, { timeout: 5000 }).catch(() => {})
check((await stepNo()) === 2, 'crossing the first edge moves the guide to step 2')
// resting: the name, then what the part does, then step 3
await phone.waitForFunction(() => [...document.querySelectorAll('.st-guide-dots i')].findIndex((i) => i.classList.contains('on')) === 2, null, { timeout: 9000 }).catch(() => {})
const heard = await phone.evaluate(() => window.__said.slice(-4))
check((await stepNo()) === 3, `resting speaks the part and what it does, then step 3 (heard: ${heard.map((x) => x.slice(0, 28)).join(' | ')})`)
await phone.mouse.up()
await phone.screenshot({ path: `${OUT}/student-guide-3.png` })
// the three gestures, through the same entry point the touch recogniser calls
await phone.evaluate(() => window.__tsGesture('swipe-left'))
await phone.waitForFunction(() => [...document.querySelectorAll('.st-guide-dots i')].findIndex((i) => i.classList.contains('on')) === 3, null, { timeout: 5000 }).catch(() => {})
check((await stepNo()) === 4 && (await phone.locator('.st-modes button.on').innerText()) === 'Tour', 'two-finger swipe opens the tour and moves to step 4')
await phone.evaluate(() => window.__tsGesture('double-tap-2'))
await phone.waitForFunction(() => [...document.querySelectorAll('.st-guide-dots i')].findIndex((i) => i.classList.contains('on')) === 4, null, { timeout: 5000 }).catch(() => {})
check((await stepNo()) === 5, 'two-finger double-tap answers where am I and moves to step 5')
await phone.evaluate(() => window.__tsGesture('tap-3'))
await phone.waitForTimeout(400)
const langMid = await phone.locator('.st-lang').innerText()
await phone.waitForFunction(() => [...document.querySelectorAll('.st-guide-dots i')].findIndex((i) => i.classList.contains('on')) === 5, null, { timeout: 6000 }).catch(() => {})
const langEnd = await phone.locator('.st-lang').innerText()
check((await stepNo()) === 6 && langMid !== 'English' && langEnd === 'English', `three-finger tap changes the language (${langMid}) and the guide brings it back (${langEnd}), step 6`)
await phone.screenshot({ path: `${OUT}/student-guide-6.png` })
await phone.locator('.st-guide-a .primary').click()
await phone.waitForTimeout(200)
check((await phone.locator('.st-guide').count()) === 0 && (await phone.evaluate(() => localStorage.getItem('touchsight-guide-done'))) === '1', 'the guide closes and is remembered as done')

// ---- 3. the teacher points, the phone finds
const heart = JSON.parse(readFileSync(resolve('src/samples/sample-heart.tdm.json'), 'utf8'))
heart.id = 'lead-heart'; heart.title = 'The human heart (lesson)'
const cls = await laptop.newPage()
cls.on('pageerror', (e) => errors.push(`class: ${e.message}`))
await cls.goto(`${BASE}/teacher/class`, { waitUntil: 'networkidle' })
await cls.waitForFunction(() => /relay open/.test(document.querySelector('.wb-pane-h .mono')?.textContent ?? ''), null, { timeout: 10_000 }).catch(() => {})
const code = (await cls.locator('.cl-code').innerText()).trim()
await cls.evaluate(() => window.__class.roster(['Priya', 'Arjun']))
await cls.evaluate((t) => window.__class.push(t), heart)
await phone.goto(`${BASE}/student?room=${code}`, { waitUntil: 'networkidle' })
await phone.waitForSelector('.st-pick-card', { timeout: 10_000 })
await phone.locator('.st-pick-card').first().click(); await phone.waitForTimeout(150); await phone.locator('.st-pick-card').first().click()
await phone.waitForFunction(() => [...document.querySelectorAll('.st-card b')].some((b) => /lesson/.test(b.textContent)), null, { timeout: 10_000 }).catch(() => {})
await cls.reload({ waitUntil: 'networkidle' })
await cls.waitForSelector('.cl-pub-row', { timeout: 10_000 })
await cls.locator('.cl-pub-row:has-text("lesson") .btn.coral').click()
await cls.waitForSelector('.cl-lead-sheet svg')
const targetId = heart.regions.find((r) => /left ventricle/i.test(r.name.en))?.id ?? heart.regions[0].id
const targetName = heart.regions.find((r) => r.id === targetId).name.en
await cls.evaluate((id) => window.__class.pointAt(id), targetId)
// the phone was on its library: it is taken to the diagram and asked to find the part
await phone.waitForSelector('.st-lead', { timeout: 10_000 }).catch(() => {})
check(await phone.locator('.st-lead').isVisible().catch(() => false), `the phone is taken to the diagram and asked: "${await phone.locator('.st-lead b').innerText().catch(() => '')}"`)
await phone.screenshot({ path: `${OUT}/class-phone-pointed.png` })
await cls.waitForTimeout(300)
await cls.screenshot({ path: `${OUT}/class-console-leading.png` })
// a wrong lift gives a direction; resting on the target finds it
const svgBox = await phone.locator('.st-canvas svg').boundingBox()
const mm = await phone.evaluate((id) => { const t = window.__tsTdm; const r = t.regions.find((x) => x.id === id); const svg = document.querySelector('.st-canvas svg'); const c = r.polygon.reduce((a, p) => [a[0] + p[0] / r.polygon.length, a[1] + p[1] / r.polygon.length], [0, 0]); const pt = new DOMPoint(c[0], c[1]).matrixTransform(svg.getScreenCTM()); return { x: pt.x, y: pt.y } }, targetId)
await phone.mouse.move(svgBox.x + 8, svgBox.y + 8); await phone.mouse.down(); await phone.waitForTimeout(150); await phone.mouse.up()
await phone.waitForTimeout(300)
const hint = await phone.evaluate(() => window.__said.at(-1))
check(/move (up|down|left|right)/i.test(hint), `lifting on the wrong spot gives a direction: "${hint}"`)
await phone.mouse.move(mm.x, mm.y); await phone.mouse.down(); await phone.mouse.move(mm.x + 1, mm.y + 1, { steps: 2 })
await phone.waitForFunction(() => !document.querySelector('.st-lead'), null, { timeout: 6000 }).catch(() => {})
await phone.mouse.up()
const said = await phone.evaluate(() => window.__said.slice(-2).join(' | '))
check(/found it/i.test(said), `resting on the ${targetName} finds it: "${said}"`)
await cls.waitForFunction(() => document.querySelector('.cl-finders li.hit'), null, { timeout: 6000 }).catch(() => {})
const row = await cls.locator('.cl-finders li.hit').first().innerText().catch(() => '')
check(/Priya/.test(row) && /found in/.test(row), `the console shows who found it and how fast: ${row.replace(/\n/g, ' ')}`)
await cls.screenshot({ path: `${OUT}/class-console-found.png` })

await browser.close()
if (errors.length) console.log('page errors:', errors)
console.log(fail.length ? `\n${fail.length} FAILED` : '\nall checks passed')
process.exit(fail.length || errors.length ? 1 : 0)
