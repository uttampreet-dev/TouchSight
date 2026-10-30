// Score benchmark/results/understand.json (from run-understand.mjs) against benchmark/truth/<name>.json: a quick label-recall check.
// The judged results file, benchmark/RESULTS.md, is written by run-pipeline.mjs only.
import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const RES = resolve('../benchmark/results/understand.json')
const TRUTH = resolve('../benchmark/truth')
import { matchLabels, sim } from './lib/match.mjs'

const results = JSON.parse(readFileSync(RES, 'utf8'))
const rows = []
for (const r of results) {
  const tf = resolve(TRUTH, `${r.name}.json`)
  if (!existsSync(tf)) { rows.push({ name: r.name, truth: false }); continue }
  const truth = JSON.parse(readFileSync(tf, 'utf8'))
  if (!Array.isArray(truth.labels) || truth.labelsPrinted !== truth.labels.length) throw new Error(`Invalid truth file for ${r.name}: labelsPrinted does not match labels`)
  const ocr = r.labels.map((x) => x[0])
  const { found, missing } = matchLabels(truth.labels, ocr)
  const spurious = ocr.filter((o) => !truth.labels.some((t) => sim(t, o) >= 0.8 || sim(o, t) >= 0.8)).length
  rows.push({ name: r.name, truth: true, labelsPrinted: truth.labelsPrinted, found: found.length, pct: Math.round((100 * found.length) / truth.labelsPrinted), spurious, regionsFound: r.regions, regionsExpected: truth.regions.length, strokes: r.strokes, ms: r.time, missing })
}
for (const x of rows) {
  if (!x.truth) { console.log(`${x.name}: no truth file`); continue }
  console.log(`${x.name}: labels ${x.found}/${x.labelsPrinted} = ${x.pct}% · spurious ${x.spurious} · regions ${x.regionsFound} (expected ≥${x.regionsExpected}) · strokes ${x.strokes} · ${x.ms} ms`)
  for (const m of x.missing) console.log(`    missing: "${m[0]}"  best: "${m[1]}" (${m[2]})`)
}
writeFileSync(resolve('../benchmark/results/score.json'), JSON.stringify(rows, null, 2))
const scored = rows.filter((x) => x.truth)
const mean = Math.round(scored.reduce((s, x) => s + x.pct, 0) / scored.length)
console.log(`\nmean label recall ${mean}% over ${scored.length} figures (wrote results/score.json; RESULTS.md is written by run-pipeline.mjs)`)
