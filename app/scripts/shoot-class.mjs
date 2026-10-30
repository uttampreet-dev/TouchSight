// The classroom, across two devices joined only by the relay: the console makes a roster and pushes a diagram; a
// phone joins by the QR link, picks a name by touch, receives the diagram, explores and is quizzed; the console
// sees the student's activity live. usage: node scripts/shoot-class.mjs  (serve.mjs on :4173 with a fresh build)
import { chromium, devices } from 'playwright-core'
import { mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const EXE = '/Users/uttampreet/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell'
const OUT = resolve('../benchmark/results/screens')
mkdirSync(OUT, { recursive: true })
const heart = JSON.parse(readFileSync(resolve('src/samples/sample-heart.tdm.json'), 'utf8'))
heart.id = 'class-heart'; heart.title = 'The human heart (class)'
const browser = await chromium.launch({ executablePath: EXE })
const fail = [], errors = []
const check = (cond, msg) => { console.log(`${cond ? 'ok ' : 'BAD'} ${msg}`); if (!cond) fail.push(msg) }

const laptop = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const console_ = await laptop.newPage()
console_.on('pageerror', (e) => errors.push(`console: ${e.message}`))
await console_.goto('http://localhost:4173/teacher/class', { waitUntil: 'networkidle' })
await console_.waitForFunction(() => /relay open/.test(document.querySelector('.wb-pane-h .mono')?.textContent ?? ''), null, { timeout: 10_000 }).catch(() => {})
const code = (await console_.locator('.cl-code').innerText()).trim()
check(/^[A-Z]{4}$/.test(code), `console shows a room code: ${code}`)
await console_.evaluate(() => window.__class.roster([]))
for (const n of ['Priya', 'Arjun']) { await console_.fill('.cl-add input', n); await console_.click('.cl-add button') }
check((await console_.locator('.cl-roster li:not(.cl-empty)').count()) === 2, 'roster has two names')
await console_.evaluate((t) => window.__class.push(t), heart)
await console_.waitForTimeout(300)

const phoneCtx = await browser.newContext({ ...devices['Pixel 7'] })
const phone = await phoneCtx.newPage()
phone.on('pageerror', (e) => errors.push(`phone: ${e.message}`))
await phone.addInitScript(() => { try { localStorage.setItem('touchsight-intro-seen', '1') } catch {} })
await phone.addInitScript(() => { window.speechSynthesis && (window.speechSynthesis.speak = (u) => { setTimeout(() => u.onstart?.(new Event('start')), 5); setTimeout(() => u.onend?.(new Event('end')), 60) }) })
await phone.goto(`http://localhost:4173/student?room=${code}`, { waitUntil: 'networkidle' })
await phone.waitForSelector('.st-pick-card', { timeout: 10_000 })
const names = await phone.locator('.st-pick-card b').allInnerTexts()
check(names.join(',') === 'Priya,Arjun', `phone offers the roster by touch: ${names.join(', ')}`)
const card = phone.locator('.st-pick-card').first()
await card.dispatchEvent('pointerdown'); await phone.waitForTimeout(250)
const armed = await phone.locator('.st-pick-card.armed .mono').innerText()
check(/this is me/i.test(armed), `first touch speaks the name and arms it ("${armed}")`)
await card.dispatchEvent('pointerdown'); await phone.waitForTimeout(400)
check(/Priya/.test(await phone.locator('.st-me b').innerText()), 'second touch chooses: the phone belongs to Priya')
await phone.waitForFunction(() => [...document.querySelectorAll('.st-card b')].some((b) => /class/.test(b.textContent)), null, { timeout: 10_000 }).catch(() => {})
const mine = await phone.locator('.st-section').first().locator('.st-card b').allInnerTexts()
check(mine.some((t) => /class/.test(t)), `pushed diagram arrived on the phone: ${mine.join(', ')}`)
await phone.screenshot({ path: `${OUT}/class-phone-library.png`, fullPage: true })
await console_.waitForFunction(() => /1 phone/.test(document.querySelector('.wb-pane-h .mono')?.textContent ?? ''), null, { timeout: 5_000 }).catch(() => {})
check(/1 phone/.test(await console_.locator('.wb-pane-h .mono').first().innerText()), 'console counts one phone in the room')
await console_.screenshot({ path: `${OUT}/class-console-roster.png` })

// Priya explores and takes the quiz
await phone.click('.st-card:has-text("class")')
await phone.waitForSelector('.st-canvas svg', { timeout: 10_000 })
const box = await phone.locator('.st-canvas svg').boundingBox()
const at = (fx, fy) => ({ x: box.x + box.width * fx, y: box.y + box.height * fy })
const path = [[0.3, 0.3], [0.32, 0.32], [0.7, 0.3], [0.7, 0.32], [0.3, 0.7], [0.32, 0.72], [0.7, 0.7], [0.72, 0.72]]
await phone.mouse.move(at(0.3, 0.3).x, at(0.3, 0.3).y); await phone.mouse.down()
for (const [fx, fy] of path) { const p = at(fx, fy); await phone.mouse.move(p.x, p.y, { steps: 6 }); await phone.waitForTimeout(420) }
await phone.mouse.up(); await phone.waitForTimeout(200)
await phone.click('button[role=tab]:has-text("Quiz")'); await phone.waitForTimeout(400)
for (const [fx, fy] of [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7], [0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]]) { const p = at(fx, fy); await phone.mouse.move(p.x, p.y); await phone.mouse.down(); await phone.waitForTimeout(60); await phone.mouse.up(); await phone.waitForTimeout(500) }
await phone.screenshot({ path: `${OUT}/class-phone-quiz.png` })

await console_.waitForFunction(() => { const c = document.querySelector('.cl-student'); const st = c?.querySelector('.cl-stats')?.textContent.replace(/\s+/g, ' ') ?? ''; return c && /1 opened/.test(st) && !/0 \/0 found/.test(st) && document.querySelectorAll('.cl-bars li').length > 0 }, null, { timeout: 10_000 }).catch(() => {})
const stud = await console_.locator('.cl-student').first()
const stats = (await stud.locator('.cl-stats').innerText()).replace(/\s+/g, ' ')
const bars = await stud.locator('.cl-bars li').count()
const quizFound = +(stats.match(/(\d+) ?\/ ?(\d+) found/)?.[1] ?? 0), quizAsked = +(stats.match(/(\d+) ?\/ ?(\d+) found/)?.[2] ?? 0)
check(/^Priya/.test(await stud.locator('header b').innerText()) && /1 opened/.test(stats), `console shows Priya opened the diagram (${stats})`)
check(bars >= 2, `time under the finger per part reached the console (${bars} parts)`)
check(quizAsked >= 1 && quizFound >= 1, `quiz results reached the console (${quizFound}/${quizAsked} found) [${stats}]`)
check((await console_.locator('.cl-student.on').count()) >= 1, 'Priya shows as online')
await console_.screenshot({ path: `${OUT}/class-console-progress.png` })

// the projector still mirrors a phone that is in a room
const stage = await laptop.newPage()
stage.on('pageerror', (e) => errors.push(`stage: ${e.message}`))
await stage.goto('http://localhost:4173/stage', { waitUntil: 'networkidle' })
await phone.click('button[role=tab]:has-text("Explore")'); await phone.waitForTimeout(300)
const p0 = at(0.3, 0.3); await phone.mouse.move(p0.x, p0.y); await phone.mouse.down(); await phone.mouse.move(at(0.7, 0.7).x, at(0.7, 0.7).y, { steps: 8 }); await phone.mouse.up()
await stage.waitForFunction(() => document.querySelectorAll('.sg-log li, .sg-log div').length > 0, null, { timeout: 5_000 }).catch(() => {})
const stageTxt = await stage.locator('body').innerText()
check(/cross|hello/i.test(stageTxt), 'projector still receives the phone through the relay')

console.log(errors.length ? `page errors:\n${errors.join('\n')}` : 'no page errors')
console.log(fail.length ? `FAILED: ${fail.length}` : 'ALL CHECKS PASSED')
await browser.close()
process.exit(fail.length || errors.length ? 1 : 0)
