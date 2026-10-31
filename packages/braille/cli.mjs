import { resolve } from 'node:path'
import { readTdm, safeFileStem, writePackageOutput } from '../tdm-runtime/tdm.mjs'
import { fillBrailleFields, writeBrf } from './braille.mjs'

const input = process.argv[2]
if (!input || process.argv.length > 3) throw new Error('Usage: npm run export:braille -- <tdm.json>')
const tdm = await readTdm(resolve(input))
fillBrailleFields(tdm)
const base = safeFileStem(tdm.id)
const outputJson = await writePackageOutput(import.meta.url, `${base}.braille.tdm.json`, `${JSON.stringify(tdm, null, 2)}\n`)
const outputBrf = await writePackageOutput(import.meta.url, `${base}.key.brf`, writeBrf(tdm))
console.log(`Wrote ${outputJson}`)
console.log(`Wrote ${outputBrf}`)