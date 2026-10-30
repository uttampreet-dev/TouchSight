// The benchmark: every figure in benchmark/raw through understand → draft → simplify → validate → exports, headless,
// production build, no network. Writes benchmark/results/pipeline.json and benchmark/RESULTS.md (two tables:
// semantic and geometric, kept apart) — the only writer of RESULTS.md.
// usage: node scripts/run-pipeline.mjs [image …] [--force]     (serve.mjs on :4173 with a fresh build)
import { chromium } from 'playwright-core'
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { execSync } from 'node:child_process'
import { sim } from './lib/match.mjs'

const EXE = process.env.CHROME || '/Users/uttampreet/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell'
const BASE = process.env.BASE || 'http://localhost:4173'
const RAW = resolve('../benchmark/raw'), TRUTH = resolve('../benchmark/truth'), OUT = resolve('../benchmark/results'), EXPORTS = resolve(OUT, 'exports')
mkdirSync(EXPORTS, { recursive: true })
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const force = process.argv.includes('--force')
const images = args.length ? args.map((a) => resolve(a)) : readdirSync(RAW).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort().map((f) => resolve(RAW, f))
const truthCount = readdirSync(TRUTH).filter((f) => f.endsWith('.json') && !f.startsWith('_')).length
const commit = (() => { try { return execSync('git rev-parse --short HEAD', { cwd: resolve('..') }).toString().trim() } catch { return '?' } })()

const browser = await chromium.launch({ executablePath: EXE })
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } })
page.on('pageerror', (e) => console.error('[pageerror]', e.message))

const rows = []
for (const img of images) {
  const name = basename(img).replace(/\.[^.]+$/, '')
  const tf = resolve(TRUTH, `${name}.json`)
  const truth = existsSync(tf) ? JSON.parse(readFileSync(tf, 'utf8')) : null
  await page.goto(`${BASE}/teacher/understand`, { waitUntil: 'networkidle' })
  await page.setInputFiles('input[type=file]', img)
  const wall0 = Date.now()
  await page.click('button:has-text("Understand")')
  await page.waitForFunction(() => window.__touchsight?.last, null, { timeout: 180_000 })
  const understandMs = Date.now() - wall0
  const d = await page.evaluate((id) => {
    const T = window.__touchsight, u = T.last
    const nameOf = (t, x) => t.regions.find((r) => r.id === x)?.name.en ?? t.lines.find((l) => l.id === x)?.name.en ?? x
    const t0 = performance.now()
    const { tdm: draft } = T.draftTdm(u, { id, title: id, subject: id.split('-')[0], sourceKind: 'upload', file: id })
    const t1 = performance.now()
    const { tdm, report } = T.simplify(draft)
    const t2 = performance.now()
    const v = T.validate(tdm); tdm.validation = v
    const t3 = performance.now()
    const ex = {}
    try { const s = T.exportSvg(tdm); ex.svg = { ok: true, cells: s.facts.cells, keyEntries: s.facts.keyEntries, keyFits: s.facts.keyFits, svg: s.svg } } catch (e) { ex.svg = { ok: false, error: String(e) } }
    try { const s = T.exportStl(tdm); const c = T.checkStl(s.stl); ex.stl = { ok: c.closed, triangles: s.facts.triangles, shells: s.facts.shells, openEdges: c.openEdges, bbox: s.facts.bbox, kb: Math.round(s.facts.bytes / 1024) } } catch (e) { ex.stl = { ok: false, error: String(e) } }
    try { const a = T.altText(tdm, 'en'); ex.alt = { ok: a.length > 20, words: a.split(/\s+/).length, text: a } } catch (e) { ex.alt = { ok: false, error: String(e) } }
    try { const b = T.exportBrf(tdm); ex.brf = { ok: true, pages: b.facts.pages, cells: b.facts.cells } } catch (e) { ex.brf = { ok: false, error: String(e) } }
    const t4 = performance.now()
    return {
      labels: u.labels.map((l) => l.text), regionsFound: u.regions.length, strokes: u.segments.length, timings: u.timings,
      draft: { regions: draft.regions.length, lines: draft.lines.length, relations: draft.relations.map((r) => [nameOf(draft, r.from), nameOf(draft, r.to), r.confidence]) },
      report: { dropped: report.dropped, merged: report.merged.length, minGapBefore: report.minGapBefore, minGapAfter: report.minGapAfter, passes: report.separationPasses, scaledBy: report.scaledBy, textures: report.textures },
      out: { regions: tdm.regions.map((r) => r.name.en), lines: tdm.lines.length, relations: tdm.relations.length, key: tdm.key.length },
      validation: { status: v.status, blocking: v.blocking.map((b) => b.rule), advisory: v.advisory.map((a) => a.rule), msgs: v.blocking.map((b) => `${b.rule}: ${b.msg}`) },
      ms: { draft: t1 - t0, simplify: t2 - t1, validate: t3 - t2, exports: t4 - t3 },
      exports: ex, tdmJson: JSON.stringify(tdm, null, 1),
    }
  }, name)
  writeFileSync(resolve(EXPORTS, `${name}.tdm.json`), d.tdmJson)
  if (d.exports.svg.ok) writeFileSync(resolve(EXPORTS, `${name}.tactile.svg`), d.exports.svg.svg)
  if (d.exports.alt.ok) writeFileSync(resolve(EXPORTS, `${name}.alt.txt`), d.exports.alt.text)
  delete d.exports.svg.svg; delete d.exports.alt.text; delete d.tdmJson

  // semantic scoring against the truth file
  const sem = { labelsPrinted: null, labelsRead: null, missing: [], regionsExpected: null, regionsNamed: null, relTruth: null, relMatched: null }
  if (truth) {
    sem.labelsPrinted = truth.labels.length
    const found = [], missing = []
    for (const t of truth.labels) { const best = d.labels.map((o) => ({ o, s: sim(t, o) })).sort((a, b) => b.s - a.s)[0]; if (best && best.s >= 0.8) found.push(t); else missing.push([t, best?.o ?? '']) }
    sem.labelsRead = found.length; sem.missing = missing
    sem.regionsExpected = truth.regions.length
    sem.regionsNamed = truth.regions.filter((t) => d.out.regions.some((o) => sim(t, o) >= 0.8 || sim(o, t) >= 0.8)).length
    sem.relTruth = (truth.relations ?? []).length
    sem.relMatched = (truth.relations ?? []).filter(([a, , b]) => d.draft.relations.some(([x, y]) => (sim(a, x) >= 0.8 && sim(b, y) >= 0.8) || (sim(a, y) >= 0.8 && sim(b, x) >= 0.8))).length
  }
  const geomBlocking = d.validation.blocking.filter((r) => r !== 'R3')
  const row = { name, difficulty: truth?.difficulty ?? '?', truth: !!truth, understandMs, ...d, sem, geomClean: geomBlocking.length === 0, r3: d.validation.blocking.filter((r) => r === 'R3').length }
  rows.push(row)
  console.log(`${name}: labels ${sem.labelsRead ?? '?'}/${sem.labelsPrinted ?? '?'} · regions ${d.draft.regions}→${d.out.regions.length} (named ${sem.regionsNamed ?? '?'}/${sem.regionsExpected ?? '?'}) · relations ${d.draft.relations.length} proposed, ${sem.relMatched ?? '?'}/${sem.relTruth ?? '?'} match truth · validator ${d.validation.status} [${d.validation.blocking.join(',') || 'clean'}] · gap ${d.report.minGapBefore}→${d.report.minGapAfter} · exports ${['svg', 'stl', 'brf', 'alt'].map((k) => (d.exports[k].ok ? k : k.toUpperCase() + '!')).join(' ')} · ${understandMs} + ${Math.round(d.ms.simplify + d.ms.validate)} + ${Math.round(d.ms.exports)} ms`)
}
await browser.close()
writeFileSync(resolve(OUT, 'pipeline.json'), JSON.stringify(rows, null, 2))

// ---- RESULTS.md
const scored = rows.filter((r) => r.truth)
const pct = (a, b) => (b ? `${a}/${b} (${Math.round((100 * a) / b)}%)` : '—')
const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0)
const median = (xs) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }
const labelMean = Math.round(mean(scored.map((r) => (100 * r.sem.labelsRead) / r.sem.labelsPrinted)))
const regionMean = Math.round(mean(scored.filter((r) => r.sem.regionsExpected).map((r) => (100 * r.sem.regionsNamed) / r.sem.regionsExpected)))
const relTruth = scored.reduce((s, r) => s + r.sem.relTruth, 0), relMatched = scored.reduce((s, r) => s + r.sem.relMatched, 0), relProposed = rows.reduce((s, r) => s + r.draft.relations.length, 0)
const geomClean = rows.filter((r) => r.geomClean).length
const endToEnd = rows.map((r) => (r.understandMs + r.ms.draft + r.ms.simplify + r.ms.validate + r.ms.exports) / 1000)
const exportsOk = rows.filter((r) => ['svg', 'stl', 'brf', 'alt'].every((k) => r.exports[k].ok)).length
const md = [
  `# Benchmark results — ${rows.length} figures`,
  '',
  `Measured ${new Date().toISOString().slice(0, 10)} at commit \`${commit}\` by \`app/scripts/run-pipeline.mjs\`: headless Chromium, production build, no network, every figure in \`benchmark/raw/\` through understand → draft → simplify → validate → exports. Ground truth in \`benchmark/truth/*.json\`. Two tables on purpose: a figure can pass every geometric rule and still be semantically wrong, so what the pipeline *read* and what it *made* are scored apart.`,
  '',
  '## 1. Semantic — what the pipeline read',
  '',
  'A label counts as read when every word matches within one dropped or misread character. A region counts as named when a region in the redesigned model carries that truth name. Relations: proposed by stroke adjacency; "match truth" is an automatic name-pair check against the truth file (direction ignored), so it under-counts correct proposals that the truth file does not list and never counts a wrong one.',
  '',
  '| Figure | Difficulty | Labels read | Regions named | Relations proposed · match truth | Understand |',
  '|---|---|---|---|---|---|',
  ...rows.map((r) => `| ${r.name} | ${r.difficulty} | ${r.truth ? pct(r.sem.labelsRead, r.sem.labelsPrinted) : '—'} | ${r.truth ? pct(r.sem.regionsNamed, r.sem.regionsExpected) : '—'} | ${r.draft.relations.length} · ${r.truth ? `${r.sem.relMatched}/${r.sem.relTruth}` : '—'} | ${(r.understandMs / 1000).toFixed(1)} s |`),
  '',
  `Mean label recall **${labelMean}%**, mean region recall **${regionMean}%** over ${scored.length} figures with truth; ${relProposed} relations proposed, ${relMatched} of the ${relTruth} in the truth files matched automatically.`,
  '',
  '## 2. Geometric — what the pipeline made',
  '',
  'First-run validator status before any teacher edit. R3 (a detected relation awaiting the teacher) is listed separately because it is the designed stop, not a geometry failure. "Geometry clean" means no S1–S3, T1, K1, M1, R1 or R2 finding.',
  '',
  '| Figure | Geometry clean | Blocking by rule | R3 awaiting teacher | Min gap before → after | Regions kept · dropped | Lines kept | Scale | Exports SVG · STL · BRF · alt | Redesign + validate + export |',
  '|---|---|---|---|---|---|---|---|---|---|',
  ...rows.map((r) => `| ${r.name} | ${r.geomClean ? 'yes' : 'NO'} | ${r.validation.blocking.filter((x) => x !== 'R3').join(', ') || '—'} | ${r.r3} | ${r.report.minGapBefore === null ? '—' : r.report.minGapBefore} → ${r.report.minGapAfter} mm | ${r.out.regions.length} · ${r.report.dropped.filter((x) => x.id.startsWith('r-')).length} | ${r.out.lines} | ${r.report.scaledBy === 1 ? '1' : `×${r.report.scaledBy}`} | ${['svg', 'stl', 'brf', 'alt'].map((k) => (r.exports[k].ok ? '✓' : '✗')).join(' · ')}${r.exports.stl.ok ? ` (${r.exports.stl.shells} shells closed)` : ''} | ${Math.round(r.ms.simplify + r.ms.validate)} + ${Math.round(r.ms.exports)} ms |`),
  '',
  `Geometry clean on first run: **${geomClean}/${rows.length}**. Every export succeeded on **${exportsOk}/${rows.length}** figures. End to end (photo in → four files out, no teacher): median **${median(endToEnd).toFixed(1)} s**, mean ${mean(endToEnd).toFixed(1)} s.`,
  '',
  '## 3. Known failures',
  '',
  ...rows.flatMap((r) => [
    ...(r.sem.missing ?? []).map(([t, o]) => `- ${r.name}: label "${t}" not read (closest: "${o}")`),
    ...r.validation.msgs.filter((m) => !m.startsWith('R3')).map((m) => `- ${r.name}: validator ${m}`),
    ...['svg', 'stl', 'brf', 'alt'].filter((k) => !r.exports[k].ok).map((k) => `- ${r.name}: ${k} export failed (${r.exports[k].error ?? `${r.exports[k].openEdges} open edges`})`),
  ]),
  '',
  '## 4. Teacher corrections and the eyes-closed test',
  '',
  'Logged by hand in `benchmark/CORRECTIONS.md` (edits and time to "Ready to publish" per figure) and `benchmark/USABILITY.md` (two testers, eyes closed, Wi-Fi off). Those numbers are not in this file until the runs happen.',
  '',
].join('\n')
if (rows.length < truthCount && !force) {
  writeFileSync(resolve('../benchmark/RESULTS.partial.md'), md.replace('# Benchmark results', `# PARTIAL RUN (${rows.length} of ${truthCount}) — Benchmark results`))
  console.log(`\nonly ${rows.length} of ${truthCount} figures: wrote benchmark/RESULTS.partial.md, RESULTS.md untouched (--force to overwrite)`)
} else {
  writeFileSync(resolve('../benchmark/RESULTS.md'), md)
  console.log(`\nwrote benchmark/RESULTS.md: labels ${labelMean}%, regions ${regionMean}%, geometry clean ${geomClean}/${rows.length}, exports ${exportsOk}/${rows.length}, median ${median(endToEnd).toFixed(1)} s end to end`)
}
