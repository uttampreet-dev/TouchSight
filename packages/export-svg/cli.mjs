import { resolve } from 'node:path'
import { readTdm, safeFileStem, writePackageOutput } from '../tdm-runtime/tdm.mjs'
import { exportSvg } from './svg.mjs'

const input = process.argv[2]
if (!input || process.argv.length > 3) throw new Error('Usage: npm run export:svg -- <tdm.json>')
const tdm = await readTdm(resolve(input))
const svg = exportSvg(tdm, tdm.languages.primary)
const output = await writePackageOutput(import.meta.url, `${safeFileStem(tdm.id)}.tactile.svg`, svg)
console.log(`Wrote ${output}`)