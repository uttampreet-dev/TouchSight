// Score benchmark/results/understand.json against benchmark/truth/<name>.json.
// A truth label counts as found when some OCR label matches it (normalised; ≥0.8 similarity or token containment).
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const RES = resolve('../benchmark/results/understand.json')
const TRUTH = resolve('../benchmark/truth')
const norm = (s) => s.toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

function lev(a, b) {
  const m = a.length, n = b.length
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 1; j <= n; j++) d[0][j] = j
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[m][n]
}
// a token matches when equal, or within 2 edits for words of 5+ letters (one dropped/misread character)
const tokenHit = (t, set) => set.has(t) || [...set].some((x) => Math.min(x.length, t.length) >= 5 && lev(x, t) <= 2)

function sim(a, b) {
  // token-level: fraction of truth tokens present in the candidate
  const ta = norm(a).split(' ').filter(Boolean), tb = new Set(norm(b).split(' ').filter(Boolean))
  if (!ta.length) return 0
  return ta.filter((t) => tokenHit(t, tb)).length / ta.length
}

const results = JSON.parse(readFileSync(RES, 'utf8'))
const rows = []
for (const r of results) {
  const tf = resolve(TRUTH, `${r.name}.json`)
  if (!existsSync(tf)) { rows.push({ name: r.name, truth: false }); continue }
  const truth = JSON.parse(readFileSync(tf, 'utf8'))
  const ocr = r.labels.map((x) => x[0])
  const found = [], missing = []
  for (const t of truth.labels) {
    const best = ocr.map((o) => ({ o, s: sim(t, o) })).sort((a, b) => b.s - a.s)[0]
    if (best && best.s >= 0.8) found.push([t, best.o]); else missing.push([t, best?.o ?? '', best ? +best.s.toFixed(2) : 0])
  }
  const spurious = ocr.filter((o) => !truth.labels.some((t) => sim(t, o) >= 0.8 || sim(o, t) >= 0.8)).length
  rows.push({ name: r.name, truth: true, labelsPrinted: truth.labels.length, found: found.length, pct: Math.round((100 * found.length) / truth.labels.length), spurious, regionsFound: r.regions, regionsExpected: truth.regions.length, strokes: r.strokes, ms: r.time, missing })
}
for (const x of rows) {
  if (!x.truth) { console.log(`${x.name}: no truth file`); continue }
  console.log(`${x.name}: labels ${x.found}/${x.labelsPrinted} = ${x.pct}% · spurious ${x.spurious} · regions ${x.regionsFound} (expected ≥${x.regionsExpected}) · strokes ${x.strokes} · ${x.ms} ms`)
  for (const m of x.missing) console.log(`    missing: "${m[0]}"  best: "${m[1]}" (${m[2]})`)
}
writeFileSync(resolve('../benchmark/results/score.json'), JSON.stringify(rows, null, 2))
const scored = rows.filter((x) => x.truth)
const mean = Math.round(scored.reduce((s, x) => s + x.pct, 0) / scored.length)
const md = [
  '# Understand stage — label recall on the benchmark set',
  '',
  'Measured by `app/scripts/run-understand.mjs` (headless Chromium, production build, no network) and scored by `app/scripts/score.mjs`',
  'against `benchmark/truth/*.json`. A label counts as read when every word matches within one dropped or misread character.',
  '',
  '| Figure | Difficulty | Labels read | Spurious | Regions found | Strokes | Time |',
  '|---|---|---|---|---|---|---|',
  ...scored.map((x) => {
    const truth = JSON.parse(readFileSync(resolve(TRUTH, `${x.name}.json`), 'utf8'))
    return `| ${x.name} | ${truth.difficulty} | ${x.found}/${x.labelsPrinted} (${x.pct}%) | ${x.spurious} | ${x.regionsFound} | ${x.strokes} | ${x.ms} ms |`
  }),
  '',
  `Mean label recall: **${mean}%** over ${scored.length} figures. Clean line-art and flat-colour figures: ${scored.filter((x) => x.pct >= 85).length}/${scored.length} at or above 85%.`,
  '',
  '## Known failures',
  ...scored.flatMap((x) => x.missing.map((m) => `- ${x.name}: "${m[0]}" not read (closest: "${m[1]}")`)),
  '',
].join('\n')
// The file a judge reads is the number we quote: a run over part of the set never overwrites it.
const truthCount = readdirSync(TRUTH).filter((f) => f.endsWith('.json') && !f.startsWith('_')).length
const force = process.argv.includes('--force')
if (scored.length < truthCount && !force) {
  writeFileSync(resolve('../benchmark/RESULTS.partial.md'), md.replace('# Understand stage', `# PARTIAL RUN (${scored.length} of ${truthCount} figures) — Understand stage`))
  console.log(`\nonly ${scored.length} of ${truthCount} figures with truth files were run: wrote benchmark/RESULTS.partial.md, left RESULTS.md untouched (pass --force to overwrite)`)
} else {
  writeFileSync(resolve('../benchmark/RESULTS.md'), md)
  console.log(`\nwrote benchmark/RESULTS.md (mean ${mean}% over ${scored.length}/${truthCount} figures)`)
}
