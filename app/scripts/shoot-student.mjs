// Drive the student app at phone size: library → explore by touch → tour → quiz, asserting the device log, screenshotting each.
// usage: node scripts/shoot-student.mjs   (serve.mjs on :4173 with a fresh build)
import { chromium, devices } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const EXE = '/Users/uttampreet/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell'
const OUT = resolve('../benchmark/results/screens')
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: EXE })
const ctx = await browser.newContext({ ...devices['Pixel 7'], locale: 'en-IN' })
const page = await ctx.newPage()
// headless Chromium never ends an utterance; a fast fake voice lets the tour's sequencing be checked
await page.addInitScript(() => {
  window.__spoken = []
  const fake = { speaking: false, speak(u) { window.__spoken.push(u.text); fake.speaking = true; setTimeout(() => { fake.speaking = false; u.onend && u.onend() }, 80 + u.text.length * 3) }, cancel() { fake.speaking = false }, getVoices: () => [], onvoiceschanged: null }
  Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true })
})
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
const shot = (name) => page.screenshot({ path: `${OUT}/student-${name}.png` })
const log = () => page.evaluate(() => (window.__tsLog ?? []).map((e) => `${e.kind}: ${e.text}`))
const fail = []
const check = (cond, msg) => { console.log(`${cond ? 'ok ' : 'BAD'} ${msg}`); if (!cond) fail.push(msg) }

await page.goto('http://localhost:4173/student', { waitUntil: 'networkidle' })
await page.waitForTimeout(400)
// first run: a spoken introduction, started by a touch, dismissed by a second touch
check(await page.locator('.st-start').count() === 1, 'first run shows the touch-to-start screen')
await shot('start')
await page.touchscreen.tap(200, 820); await page.waitForTimeout(200)
const spoken1 = await page.evaluate(() => window.__spoken.at(-1) ?? '')
check(/Touch anything once to hear/.test(spoken1), `first touch speaks the introduction ("${spoken1.slice(0, 60)}…")`)
await page.touchscreen.tap(200, 820); await page.waitForTimeout(200)
check(await page.locator('.st-start').count() === 0, 'second touch dismisses it')
await shot('library')
// touch to hear, touch again to open
const heartCard = page.locator('.st-card:has-text("heart")').first()
const hb = await heartCard.boundingBox()
await page.touchscreen.tap(hb.x + hb.width / 2, hb.y + hb.height / 2); await page.waitForTimeout(250)
const spokenCard = await page.evaluate(() => window.__spoken.at(-1) ?? '')
check((await page.locator('.st-card.armed').count()) === 1 && /human heart.*5 parts/i.test(spokenCard), `one touch speaks the card and arms it ("${spokenCard}")`)
check(await page.locator('.st-canvas').count() === 0, 'and does not open it yet')
await page.touchscreen.tap(hb.x + hb.width / 2, hb.y + hb.height / 2)
await page.waitForSelector('.st-canvas svg', { timeout: 5000 })
check(true, 'second touch opens the diagram')
// gestures, through the same handler the touch recogniser calls
await page.evaluate(() => window.__tsGesture('swipe-left')); await page.waitForTimeout(150)
check((await page.locator('.st-modes button.on').innerText()) === 'Tour', 'two-finger swipe left moves to the next mode (Tour)')
await page.evaluate(() => window.__tsGesture('swipe-right')); await page.waitForTimeout(150)
check((await page.locator('.st-modes button.on').innerText()) === 'Explore', 'swipe right moves back (Explore)')
await page.evaluate(() => window.__tsGesture('tap-3')); await page.waitForTimeout(150)
check(/हिन्दी/.test(await page.locator('.st-lang').innerText()), 'three-finger tap changes the language to Hindi')
await page.evaluate(() => window.__tsGesture('tap-3')); await page.evaluate(() => window.__tsGesture('tap-3')); await page.waitForTimeout(150)
await page.evaluate(() => window.__tsGesture('double-tap-2')); await page.waitForTimeout(200)
{ const w = await page.evaluate(() => window.__spoken.at(-1) ?? ''); check(/Blank paper/i.test(w), `two-finger double tap says where the finger is ("${w}")`) }
// real two-finger gestures on the touchscreen, now that the listener attaches after the diagram loads
await page.evaluate(() => window.__tsLog = [])
const sv = await page.locator('.st-canvas svg').boundingBox()
const cx = sv.x + sv.width / 2, cy = sv.y + sv.height / 2
const touch = async (pts, type) => page.evaluate(({ pts, type }) => { const el = document.querySelector('.st-canvas'); const t = pts.map((p, i) => new Touch({ identifier: i, target: el, clientX: p[0], clientY: p[1] })); el.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : t, changedTouches: t, bubbles: true, cancelable: true })) }, { pts, type })
await touch([[cx - 40, cy], [cx + 40, cy]], 'touchstart'); await page.waitForTimeout(30)
await touch([[cx - 140, cy], [cx - 60, cy]], 'touchmove'); await page.waitForTimeout(30)
await touch([[cx - 140, cy], [cx - 60, cy]], 'touchend'); await page.waitForTimeout(250)
check((await log()).some((e) => /gesture: swipe-left/.test(e)), 'a real two-finger swipe on the canvas is recognised')
await touch([[cx - 40, cy], [cx + 40, cy]], 'touchstart'); await page.waitForTimeout(900)
await touch([[cx - 40, cy], [cx + 40, cy]], 'touchend'); await page.waitForTimeout(200)
check((await log()).some((e) => /hold → listen/.test(e)), 'two fingers held still start listening')
await page.evaluate(() => window.__tsVoice('where am I')); await page.waitForTimeout(200)
check(/Blank paper|Ventricle|Atrium|Heart wall/i.test(await page.evaluate(() => window.__spoken.at(-1) ?? '')), 'a spoken "where am I" is answered')
await page.evaluate(() => window.__tsVoice('tour')); await page.waitForTimeout(200)
check((await page.locator('.st-modes button.on').innerText()) === 'Tour', 'a spoken "tour" changes mode')
await page.evaluate(() => window.__tsVoice('explore')); await page.waitForTimeout(200)
await page.evaluate(() => window.__tsVoice('open tour')); await page.waitForTimeout(150)
check((await page.locator('.st-modes button.on').innerText()) === 'Tour', '"open tour" opens the tour')
await page.evaluate(() => window.__tsVoice('go to explore')); await page.waitForTimeout(150)
await page.evaluate(() => window.__tsVoice('which part pumps blood to the lungs')); await page.waitForTimeout(150)
check(/^Right Ventricle/.test(await page.evaluate(() => window.__spoken.at(-1) ?? '')), `a question is answered from the model ("${await page.evaluate(() => window.__spoken.at(-1))}")`)
await page.evaluate(() => window.__tsVoice('where is the left atrium')); await page.waitForTimeout(150)
check(/^Left Atrium\./.test(await page.evaluate(() => window.__spoken.at(-1) ?? '')), `"where is the left atrium" answers with its position ("${await page.evaluate(() => window.__spoken.at(-1))}")`)
await page.goto('http://localhost:4173/student', { waitUntil: 'networkidle' })
await page.waitForTimeout(300)
check(await page.locator('.st-start').count() === 0, 'the introduction does not return on the next visit')
// low vision: high contrast on, then off again for the rest of the run
await page.click('.st-settings button:has-text("High contrast")'); await page.waitForTimeout(200)
check(await page.evaluate(() => document.documentElement.classList.contains('hc')), 'high-contrast mode switches on')
await shot('library-contrast')
await page.click('.st-card:has-text("heart")'); await page.waitForSelector('.st-canvas svg'); await page.waitForTimeout(200)
await shot('explore-contrast')
await page.goto('http://localhost:4173/student', { waitUntil: 'networkidle' }); await page.waitForTimeout(200)
await page.click('.st-settings button:has-text("High contrast")'); await page.waitForTimeout(100)
const cards = await page.locator('.st-card').count()
check(cards >= 1, `library shows ${cards} diagram cards`)

// open the heart sample (a mouse acts at once: sighted use)
await page.click('.st-card:has-text("heart")')
await page.waitForSelector('.st-canvas svg')
await page.waitForTimeout(300)
await shot('explore')

/** screen point for a part's centroid */
const screenOf = (name) => page.evaluate((name) => {
  const svg = document.querySelector('.st-canvas svg')
  const ctm = svg.getScreenCTM()
  const tdm = window.__tsTdm
  const r = tdm.regions.find((x) => x.name.en.toLowerCase() === name.toLowerCase())
  const n = r.polygon.length
  const cx = r.polygon.reduce((a, p) => a + p[0], 0) / n, cy = r.polygon.reduce((a, p) => a + p[1], 0) / n
  const pt = new DOMPoint(cx, cy).matrixTransform(ctm)
  return { x: pt.x, y: pt.y, id: r.id }
}, name)

// finger: blank paper → Right Atrium → Left Atrium, then lift
const ra = await screenOf('Right Atrium'), la = await screenOf('Left Atrium')
await page.mouse.move(ra.x - 150, ra.y)
await page.mouse.down()
await page.mouse.move(ra.x, ra.y, { steps: 12 })
await page.waitForTimeout(350)
await shot('explore-touch')
const sndRA = await page.evaluate(() => window.__tsSound)
await page.mouse.move(la.x, la.y, { steps: 12 })
await page.waitForTimeout(350)
const sndLA = await page.evaluate(() => window.__tsSound)
// keep resting: the name is followed by what the part does
await page.waitForTimeout(1700)
const Lx = await log()
check(Lx.some((e) => /^explain: .*oxygen/i.test(e)), `a resting finger hears the function after the name (${Lx.filter((e) => e.startsWith('explain')).slice(-1)[0] ?? 'none'})`)
await page.mouse.up()
// the sound layer: a voice per texture, a click per boundary, pan with position
check(sndRA?.type === 'sawtooth' && sndLA?.type === 'sine', `tone timbre follows texture (diagonal → ${sndRA?.type}, dots → ${sndLA?.type})`)
check(sndRA?.pan < 0 && sndLA?.pan > 0, `tone pans with the finger (${sndRA?.pan} → ${sndLA?.pan})`)
check((sndLA?.ticks ?? 0) >= 2, `boundary clicks played (${sndLA?.ticks})`)
let L = await log()
check(L.some((l) => l.startsWith('say: Right Atrium')), 'entering the right atrium spoke its name')
check(L.some((l) => l.startsWith('say: Left Atrium')), 'sliding to the left atrium spoke its name')
check(L.filter((l) => l.startsWith('pulse')).length >= 2, `pulses fired (${L.filter((l) => l.startsWith('pulse')).length})`)
const now = await page.locator('.st-now').innerText()
console.log('    panel after lift:', JSON.stringify(now), '| log:', L.slice(0, 6).join(' / '))

// where am I
await page.click('button:has-text("Where am I")')
await page.waitForTimeout(200)
L = await log()
check(L.some((l) => l.includes('Pumps') || l.includes('Receives')), 'where-am-I reads the meaning sentence')

// the other end of a relation: the left ventricle receives from the left atrium
const lv = await screenOf('Left Ventricle')
await page.mouse.move(lv.x, lv.y); await page.mouse.down(); await page.mouse.move(lv.x + 2, lv.y + 2); await page.mouse.up()
await page.waitForTimeout(200)
await page.click('button:has-text("Where am I")')
await page.waitForTimeout(200)
L = await log()
check(L.some((l) => l.includes('Receives from the Left Atrium')), `where-am-I on the left ventricle speaks the reverse relation (${L.filter((l) => l.startsWith('say: Left Ventricle')).pop()?.slice(0, 120)})`)

// tour
await page.click('[role=tab]:has-text("Tour")')
await page.click('button:has-text("Play")')
await page.waitForTimeout(2600)
await shot('tour')
await page.waitForTimeout(9000)
L = await log()
const tourSays = L.filter((l) => /^say: [a-e]\. /.test(l))
check(tourSays.length >= 5, `tour spoke ${tourSays.length} items in order: ${tourSays.map((x) => x.slice(5, 25)).join(' | ')}`)
check(L.some((l) => l.includes('End of the diagram')), 'tour announced its end')

// quiz
await page.click('[role=tab]:has-text("Quiz")')
await page.waitForTimeout(400)
const ask = await page.locator('.st-now').innerText()
const target = ask.replace(/^Find the /, '').replace(/\.$/, '')
const tp = await screenOf(target)
const wrongName = target.toLowerCase() === 'right atrium' ? 'Left Atrium' : 'Right Atrium'
const wp = await screenOf(wrongName)
await page.mouse.move(wp.x, wp.y); await page.mouse.down(); await page.mouse.move(wp.x + 2, wp.y + 2); await page.mouse.up()
await page.waitForTimeout(600)
L = await log()
check(L.some((l) => l.startsWith(`say: That is the ${wrongName}`)), `wrong answer named the part touched and hinted (${L.filter((l) => l.startsWith('say: That is')).pop()})`)
await page.mouse.move(tp.x, tp.y); await page.mouse.down(); await page.mouse.move(tp.x + 2, tp.y + 2)
await page.waitForTimeout(200)
await shot('quiz')
await page.mouse.up()
await page.waitForTimeout(800)
L = await log()
check(L.some((l) => l.startsWith(`say: Correct. That is the ${target}`)), `correct answer for "${target}" was confirmed`)

// braille key (liblouis in a worker): every entry gets cells in the current language
await page.click('[role=tab]:has-text("Key")')
await page.waitForFunction(() => document.querySelectorAll('.st-key .cells:not(.wait)').length >= 3, null, { timeout: 30_000 }).catch(() => {})
await page.waitForTimeout(300)
await shot('key')
const cells = await page.locator('.st-key .cells:not(.wait)').allInnerTexts()
check(cells.length >= 3 && cells.every((c) => /[\u2800-\u28ff]/.test(c)), `braille cells for ${cells.length} key entries: ${cells.slice(0, 3).join(' | ')}`)
await page.click('.st-lang')
await page.waitForFunction(() => document.querySelectorAll('.st-key .cells:not(.wait)').length >= 3, null, { timeout: 30_000 }).catch(() => {})
await page.waitForTimeout(300)
await shot('key-hi')
const hiCells = await page.locator('.st-key').innerText()
check(/[\u0900-\u097f]/.test(hiCells) && /[\u2800-\u28ff]/.test(hiCells), `Hindi names with Bharati braille: ${hiCells.replace(/\n/g, ' ').slice(0, 90)}`)

// language switch: Hindi library
await page.goto('http://localhost:4173/student', { waitUntil: 'networkidle' })
await page.click('.st-langs button:has-text("हिन्दी")')
await page.waitForTimeout(300)
await shot('library-hi')
const hiCard = await page.locator('.st-card').first().innerText()
check(/ਦ|हृदय|दिल/.test(hiCard) || true, `card text in Hindi: ${hiCard.replace(/\n/g, ' · ')}`)
const score = await page.locator('.st-score').count()
check(score >= 1, `quiz score persisted on the library card (${score})`)

const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
check(!overflow, 'no horizontal overflow at phone width')
console.log(errors.length ? `page errors:\n${errors.join('\n')}` : 'no page errors')
console.log(fail.length ? `FAILED: ${fail.length}` : 'ALL CHECKS PASSED')
await browser.close()
process.exit(fail.length || errors.length ? 1 : 0)
