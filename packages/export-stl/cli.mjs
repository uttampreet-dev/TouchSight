import { resolve } from 'node:path'
import { readTdm, safeFileStem, writePackageOutput } from '../tdm-runtime/tdm.mjs'
import { exportStl } from './stl.mjs'

const input = process.argv[2]
if (!input || process.argv.length > 3) throw new Error('Usage: npm run export:stl -- <tdm.json>')
const tdm = await readTdm(resolve(input))
const { stl, features, bytes } = exportStl(tdm)
const output = await writePackageOutput(import.meta.url, `${safeFileStem(tdm.id)}.relief.stl`, Buffer.from(stl.buffer, stl.byteOffset, stl.byteLength))
console.log(`Wrote ${output} (${features} geometry features, ${bytes} bytes)`)