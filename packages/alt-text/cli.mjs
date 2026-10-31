import { resolve } from 'node:path'
import { readTdm, safeFileStem, writePackageOutput } from '../tdm-runtime/tdm.mjs'
import { altText } from './alt-text.mjs'

const input = process.argv[2]
if (!input || process.argv.length > 3) throw new Error('Usage: npm run export:alt-text -- <tdm.json>')
const tdm = await readTdm(resolve(input))
const output = await writePackageOutput(import.meta.url, `${safeFileStem(tdm.id)}.alt.txt`, `${altText(tdm)}\n`)
console.log(`Wrote ${output}`)