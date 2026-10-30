// Build the sample diagrams shipped inside the student app: understand → simplify → the edits a teacher would make → reviewed.
// usage: node scripts/make-samples.mjs   (serve.mjs must be on :4173 with a fresh build)
import { chromium } from 'playwright-core'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const EXE = '/Users/uttampreet/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell'
const RAW = resolve('../benchmark/raw')
const OUT = resolve('src/samples')

/** Per sample: what a teacher does in the console after Simplify. Names are matched on the English label, case-insensitive. */
const SAMPLES = [
  {
    file: 'bio-heart-02.png', id: 'sample-heart', title: 'The human heart', subject: 'Biology · Class 10 · Life processes',
    keepNamedOnly: true,
    rename: { 'superior vena cava': 'Heart wall' },
    meanings: {
      'right atrium': 'Receives blood from the body through the vena cava and passes it down to the right ventricle.',
      'right ventricle': 'Pumps blood to the lungs through the pulmonary artery to pick up oxygen.',
      'left atrium': 'Receives oxygen-rich blood from the lungs through the pulmonary veins.',
      'left ventricle': 'The thickest chamber. Pumps oxygen-rich blood to the whole body through the aorta.',
      'heart wall': 'The muscular wall around the four chambers. The septum down the middle keeps the two sides apart.',
    },
    relations: [['right atrium', 'right ventricle', 'flows-into'], ['left atrium', 'left ventricle', 'flows-into']],
  },
  {
    file: 'bio-plantcell-01.png', id: 'sample-plant-cell', title: 'Plant cell', subject: 'Biology · Class 9 · The fundamental unit of life',
    keepNamedOnly: true, rename: {}, meanings: {}, relations: [],
  },
]

const browser = await chromium.launch({ executablePath: EXE })
for (const sp of SAMPLES) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
  page.on('pageerror', (e) => console.log('[pageerror]', e.message))
  await page.goto('http://localhost:4173/teacher/inspect', { waitUntil: 'networkidle' })
  await page.setInputFiles('input[type=file]', resolve(RAW, sp.file))
  await page.click('button:has-text("Understand")')
  await page.waitForFunction(() => window.__touchsight?.last, null, { timeout: 180_000 })
  const { json, before, after } = await page.evaluate((sp) => {
    const T = window.__touchsight
    const { tdm: draft } = T.draftTdm(T.last, { id: sp.id, title: sp.title, subject: sp.subject, sourceKind: 'upload', file: sp.file })
    let { tdm } = T.simplify(draft)
    const before = [...tdm.regions, ...tdm.lines].map((e) => `${e.id}:${e.name.en}`)
    const byName = (n) => [...tdm.regions, ...tdm.lines].find((e) => e.name.en.toLowerCase() === n.toLowerCase())
    for (const [from, to] of Object.entries(sp.rename)) { const e = byName(from); if (e) tdm = T.edit.rename(tdm, e.id, 'en', to) }
    if (sp.keepNamedOnly) for (const e of [...tdm.regions, ...tdm.lines]) if (/^(Region|Line) \d+$/.test(e.name.en)) tdm = T.edit.remove(tdm, e.id)
    for (const [n, m] of Object.entries(sp.meanings)) { const e = tdm.regions.find((r) => r.name.en.toLowerCase() === n.toLowerCase()); if (e) e.meaning = m }
    for (const [a, b, kind] of sp.relations) { const ea = byName(a), eb = byName(b); if (ea && eb) tdm = T.edit.addRelation(tdm, ea.id, eb.id, kind) }
    tdm = T.edit.markReviewed({ ...tdm, id: sp.id, title: sp.title, subject: sp.subject })
    tdm.validation = T.validate(tdm)
    const after = [...tdm.regions, ...tdm.lines].map((e) => `${e.keyRef} ${e.name.en} (${e.texture ?? 'line'})`)
    return { json: T.serializeTdm(tdm), before, after, status: tdm.validation.status }
  }, sp)
  const tdm = JSON.parse(json)
  console.log(`${sp.id}: ${before.length} → ${after.length} elements, validation ${tdm.validation.status}`)
  console.log('   before:', before.join(', '))
  console.log('   after: ', after.join(' | '))
  if (tdm.validation.status !== 'pass') console.log('   BLOCKING:', tdm.validation.blocking.map((b) => b.msg).join('; '))
  writeFileSync(resolve(OUT, `${sp.id}.tdm.json`), json)
  await page.close()
}
await browser.close()
