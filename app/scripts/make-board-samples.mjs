// Three more diagrams shipped inside the student app, each drawn the way a teacher draws on the console's board
// (boxes, rounds, lines, typed labels), compiled by the same pipeline, then given the edits a teacher makes:
// what each part does, and the review. usage: node scripts/make-board-samples.mjs   (serve.mjs on :4173 with a fresh build)
import { chromium } from 'playwright-core'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const EXE = process.env.CHROME || '/Users/uttampreet/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell'
const OUT = resolve('src/samples')
const circle = (cx, cy, r) => ({ kind: 'ellipse', a: [cx - r, cy - r], b: [cx + r, cy + r] })
const oval = (cx, cy, rx, ry) => ({ kind: 'ellipse', a: [cx - rx, cy - ry], b: [cx + rx, cy + ry] })
const text = (x, y, t) => ({ kind: 'text', at: [x, y], text: t })
const line = (a, b) => ({ kind: 'line', a, b })

const SAMPLES = [
  {
    id: 'sample-earth-layers', title: 'Layers of the Earth', subject: 'Geography · Class 7 · Inside our Earth',
    ops: [circle(600, 470, 400), circle(600, 470, 300), circle(600, 470, 185), circle(600, 470, 85),
      text(545, 470, 'Inner'), text(520, 610, 'Outer core'), text(535, 725, 'Mantle'), text(552, 822, 'Crust')],
    rename: { inner: 'Inner core' },
    meanings: {
      crust: 'The thin, solid outer layer we live on. It is only a few kilometres thick under the oceans.',
      mantle: 'The thickest layer, of hot rock that flows very slowly. It carries the plates of the crust.',
      'outer core': 'A layer of liquid iron and nickel. Its movement makes the Earth\'s magnetic field.',
      'inner core': 'A solid ball of iron and nickel at the centre, the hottest part of the Earth.',
    },
    relations: [['mantle', 'outer core', 'contains'], ['outer core', 'inner core', 'contains'], ['crust', 'mantle', 'contains']],
  },
  {
    id: 'sample-atom', title: 'Structure of an atom', subject: 'Science · Class 9 · Structure of the atom',
    ops: [circle(600, 460, 390), circle(600, 460, 250), circle(600, 460, 105),
      text(535, 460, 'Nucleus'), text(520, 640, 'First shell'), text(505, 780, 'Second shell')],
    rename: {},
    meanings: {
      nucleus: 'The tiny, dense centre of the atom. It holds the protons and the neutrons, and almost all the mass.',
      'first shell': 'The path closest to the nucleus. It can hold at most two electrons.',
      'second shell': 'The next path out. It can hold at most eight electrons.',
    },
    relations: [['second shell', 'first shell', 'contains'], ['first shell', 'nucleus', 'contains']],
  },
  {
    id: 'sample-animal-cell', title: 'Animal cell', subject: 'Biology · Class 9 · The fundamental unit of life',
    ops: [oval(600, 460, 500, 380), circle(430, 400, 150), circle(430, 330, 42), oval(800, 300, 130, 70), oval(790, 600, 150, 90),
      text(365, 430, 'Nucleus'), text(690, 300, 'Mitochondrion'), text(725, 600, 'Vacuole'), text(350, 705, 'Cytoplasm')],
    rename: {},
    meanings: {
      cytoplasm: 'The jelly that fills the cell inside its membrane and holds every organelle.',
      nucleus: 'Controls everything the cell does and holds the chromosomes.',
      mitochondrion: 'Releases energy from food. The powerhouse of the cell.',
      vacuole: 'A small store of water, food and waste. Animal cells have small vacuoles; plant cells have one large one.',
    },
    relations: [['cytoplasm', 'nucleus', 'contains'], ['cytoplasm', 'mitochondrion', 'contains'], ['cytoplasm', 'vacuole', 'contains']],
  },
]

const browser = await chromium.launch({ executablePath: EXE })
let bad = 0
for (const sp of SAMPLES) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
  page.on('pageerror', (e) => console.log('[pageerror]', e.message))
  await page.goto('http://localhost:4173/teacher/inspect', { waitUntil: 'networkidle' })
  const out = await page.evaluate(async (sp) => {
    // the board's own drawing rules: a 1200 × 900 sheet, a 6 px pen, 34 px labels
    const W = 1200, H = 900, c = document.createElement('canvas'); c.width = W; c.height = H
    const ctx = c.getContext('2d')
    await document.fonts.load('600 34px Inter')
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = '#101418'; ctx.fillStyle = '#101418'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.font = '600 34px Inter, Arial, sans-serif'; ctx.textBaseline = 'middle'
    for (const op of sp.ops) {
      if (op.kind === 'ellipse') { ctx.beginPath(); ctx.ellipse((op.a[0] + op.b[0]) / 2, (op.a[1] + op.b[1]) / 2, Math.abs(op.b[0] - op.a[0]) / 2, Math.abs(op.b[1] - op.a[1]) / 2, 0, 0, Math.PI * 2); ctx.stroke() }
      else if (op.kind === 'line') { ctx.beginPath(); ctx.moveTo(...op.a); ctx.lineTo(...op.b); ctx.stroke() }
      else if (op.kind === 'text') ctx.fillText(op.text, op.at[0], op.at[1])
    }
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'))
    const T = window.__touchsight
    const u = await T.understand(blob)
    const { tdm: draft } = T.draftTdm(u, { id: sp.id, title: sp.title, subject: sp.subject, sourceKind: 'authored', file: 'board-drawing.png' })
    let { tdm } = T.simplify(draft)
    const before = [...tdm.regions, ...tdm.lines].map((e) => e.name.en)
    const byName = (n) => [...tdm.regions, ...tdm.lines].find((e) => e.name.en.toLowerCase() === n.toLowerCase())
    for (const [from, to] of Object.entries(sp.rename)) { const e = byName(from); if (e) tdm = T.edit.rename(tdm, e.id, 'en', to) }
    for (const e of [...tdm.regions, ...tdm.lines]) if (/^(Region|Line) \d+$/.test(e.name.en)) tdm = T.edit.remove(tdm, e.id)
    const missing = Object.keys(sp.meanings).filter((n) => !tdm.regions.some((r) => r.name.en.toLowerCase() === n))
    for (const [n, m] of Object.entries(sp.meanings)) { const e = tdm.regions.find((r) => r.name.en.toLowerCase() === n); if (e) { e.meaning = m; e.meaningSource = 'teacher' } }
    for (let i = tdm.relations.length - 1; i >= 0; i--) if (tdm.relations[i].source === 'detected') tdm = T.edit.removeRelation(tdm, i)
    for (const [a, b, kind] of sp.relations) { const ea = byName(a), eb = byName(b); if (ea && eb) tdm = T.edit.addRelation(tdm, ea.id, eb.id, kind) }
    tdm = T.edit.markReviewed({ ...tdm, id: sp.id, title: sp.title, subject: sp.subject })
    tdm.validation = T.validate(tdm)
    return { json: T.serializeTdm ? T.serializeTdm(tdm) : JSON.stringify(tdm, null, 2) + '\n', before, after: tdm.regions.map((r) => `${r.keyRef} ${r.name.en} (${r.texture})`), lines: tdm.lines.length, missing, status: tdm.validation.status, blocking: tdm.validation.blocking.map((b) => b.msg), png: c.toDataURL('image/png') }
  }, sp)
  console.log(`${sp.id}: read [${out.before.join(', ')}] → ${out.after.join(' | ')} · ${out.lines} lines · validation ${out.status}`)
  if (out.missing.length || out.status !== 'pass') { bad++; console.log('   NOT SHIPPED: missing', out.missing, out.blocking) }
  else writeFileSync(resolve(OUT, `${sp.id}.tdm.json`), out.json)
  writeFileSync(`/private/tmp/claude-501/-Users-uttampreet-cu-hack/a8ebd147-bd1f-4188-b161-1066f9e54762/scratchpad/${sp.id}.png`, Buffer.from(out.png.split(',')[1], 'base64'))
  await page.close()
}
await browser.close()
process.exit(bad ? 1 : 0)
