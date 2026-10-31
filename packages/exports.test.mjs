import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { assertTdm, readTdm } from './tdm-runtime/tdm.mjs'
import { exportSvg } from './export-svg/svg.mjs'
import { exportStl } from './export-stl/stl.mjs'
import { backTranslateBraille, fillBrailleFields, toBraille, toBrf, writeBrf } from './braille/braille.mjs'
import { altText } from './alt-text/alt-text.mjs'

const examplePath = fileURLToPath(new URL('../examples/bio-heart-01.tdm.json', import.meta.url))
const example = await readTdm(examplePath)

test('complete v0.1 validation rejects malformed, unsafe, and excessive input', () => {
  const missingProvenance = structuredClone(example)
  delete missingProvenance.provenance.teacherReviewed
  assert.throws(() => assertTdm(missingProvenance), /teacherReviewed/)

  const nonFinite = structuredClone(example)
  nonFinite.regions[0].polygon[0][0] = Number.NaN
  assert.throws(() => assertTdm(nonFinite), /finite/)

  const unknownRelation = structuredClone(example)
  unknownRelation.relations[0].to = 'missing'
  assert.throws(() => assertTdm(unknownRelation), /unknown element/)

  const excessive = structuredClone(example)
  excessive.regions = Array.from({ length: 101 }, (_, index) => ({ ...structuredClone(example.regions[0]), id: `r-${index}` }))
  assert.throws(() => assertTdm(excessive), /regions count exceeds/)

  const nested = structuredClone(example)
  nested.extension = { value: 'x'.repeat(2_001) }
  assert.throws(() => assertTdm(nested), /JSON text exceeds/)
})

test('SVG is A4, black and white, whitelist-only, and escapes user text', () => {
  const tdm = structuredClone(example)
  tdm.key[0].text.en = '<script>alert(1)</script>&"\uFFFF'
  const svg = exportSvg(assertTdm(tdm))
  assert.match(svg, /width="210mm" height="297mm" viewBox="0 0 210 297"/)
  assert.match(svg, /&lt;script&gt;alert\(1\)&lt;\/script&gt;&amp;&quot;/)
  assert.doesNotMatch(svg, /<script|foreignObject|on\w+\s*=|href\s*=/i)
  assert.ok(!svg.includes('\uFFFF'))
  const tags = [...svg.matchAll(/<\/?([A-Za-z][\w:-]*)\b/g)].map((match) => match[1])
  assert.ok(tags.every((tag) => ['svg', 'defs', 'pattern', 'path', 'line', 'polyline', 'text', 'g'].includes(tag)))
  for (const id of ['dots', 'diagonal', 'horizontal', 'grid']) assert.ok(svg.includes(`id="${id}"`))
  assert.match(svg, /stroke-width="1\.2"/)
  assert.ok(exportSvg(example).includes('a0.75 0.75'), 'blank input key fields still render braille cells')
})

test('braille tables match 10 known forward and reverse chart entries per language', () => {
  const words = {
    en: ['cat', 'dog', 'heart', 'blood', 'water', 'school', 'human', 'left', 'right', 'atrium'],
    hi: ['जल', 'दिल', 'मानव', 'रक्त', 'हृदय', 'पानी', 'आलिंद', 'निलय', 'शरीर', 'दायाँ'],
    pa: ['ਜਲ', 'ਦਿਲ', 'ਮਨੁੱਖ', 'ਖੂਨ', 'ਪਾਣੀ', 'ਸਕੂਲ', 'ਸਰੀਰ', 'ਨਿਲਯ', 'ਆਲਿੰਦ', 'ਸੱਜਾ'],
  }
  const expectedEnglish = ['⠉⠁⠞', '⠙⠕⠛', '⠓⠑⠁⠗⠞', '⠃⠇⠕⠕⠙', '⠺⠁⠞⠑⠗', '⠎⠉⠓⠕⠕⠇', '⠓⠥⠍⠁⠝', '⠇⠑⠋⠞', '⠗⠊⠛⠓⠞', '⠁⠞⠗⠊⠥⠍']
  const expectedNative = {
    hi: ['⠚⠇', '⠙⠊⠇', '⠍⠜⠝⠧', '⠗⠈⠅⠞', '⠓⠐⠗⠙⠽', '⠏⠜⠝⠔', '⠜⠇⠊⠰⠙', '⠝⠊⠇⠽', '⠩⠗⠔⠗', '⠙⠜⠽⠜⠄'],
    pa: ['⠚⠇', '⠙⠊⠇', '⠍⠝⠥⠈⠊', '⠊⠳⠝', '⠏⠜⠼⠔', '⠎⠅⠳⠇', '⠎⠗⠔⠗', '⠝⠊⠇⠽', '⠜⠇⠊⠰⠙', '⠈⠎⠚⠜'],
  }
  const expectedBack = {
    hi: ['जल', 'दइल', 'मआनव', 'रक्त', 'हऋदय', 'पआनई', 'आलइंद', 'नइलय', 'शरईर', 'दआयआँ'],
    pa: ['ਜਲ', 'ਦਇਲ', 'ਮਨਉਖੱ', 'ਇਊਨ', 'ਪਆਈ', 'ਸਕਊਲ', 'ਸਰਈਰ', 'ਨਇਲਯ', 'ਆਲਇਂਦ', 'ਸੱਜਆ'],
  }
  for (const language of ['en', 'hi', 'pa']) for (const [index, word] of words[language].entries()) {
    const cells = toBraille(word, language)
    assert.match(cells, /^[\u2800-\u28ff ]+$/)
    if (language === 'en') {
      assert.equal(cells, expectedEnglish[index], word)
      assert.equal(backTranslateBraille(cells, language), word)
    }
    else {
      assert.equal(cells, expectedNative[language][index], `${language}: ${word}`)
      assert.equal(backTranslateBraille(cells, language), expectedBack[language][index], `${language} reverse: ${word}`)
    }
  }
  assert.equal(toBrf('⠠⠇⠑⠋⠞⠀⠁⠞⠗⠊⠥⠍'), ',LEFT ATRIUM')
  assert.throws(() => toBraille('<script>alert(1)</script>', 'en'), /unsupported characters/)
})

test('braille CLI model fill populates each requested language and BRF is ASCII', () => {
  const tdm = fillBrailleFields(structuredClone(example))
  for (const entry of tdm.key) for (const language of tdm.languages.available) assert.match(entry.braille[language], /^[\u2800-\u28ff ]+$/)
  const brf = writeBrf(tdm, 'en')
  assert.match(brf, /^[\x20-\x7e\r\n]*$/)
  assert.ok(brf.split(/\r\n|\f/).every((line) => line.length <= 40))
  assert.ok(brf.split('\f').every((page) => page.split('\r\n').length <= 25))
  assert.ok(tdm.key.every((entry) => entry.braille.en.length > 0))
  assert.equal(toBrf('⠠⠇⠑⠋⠞⠀⠁⠞⠗⠊⠥⠍'), ',LEFT ATRIUM')
})

test('alt text follows reading order and relations deterministically', () => {
  const first = altText(example), second = altText(structuredClone(example))
  assert.equal(first, second)
  assert.ok(first.startsWith('The diagram shows The human heart'))
  assert.ok(first.indexOf('Right atrium') < first.indexOf('Right ventricle'))
  assert.ok(first.includes('Right atrium flows into Right ventricle'))
})

test('Three.js STL serializes as closed edges within A4 bounds', () => {
  const { stl, features, bytes } = exportStl(example)
  assert.ok(features > 500)
  assert.equal(bytes, stl.byteLength)
  const view = new DataView(stl.buffer, stl.byteOffset, stl.byteLength)
  const triangleCount = view.getUint32(80, true)
  assert.ok(triangleCount > 10_000)
  const edges = new Map()
  const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity }
  const keyOf = (offset) => [0, 4, 8].map((delta) => view.getFloat32(offset + delta, true).toFixed(4)).join(',')
  for (let triangle = 0; triangle < triangleCount; triangle++) {
    const start = 84 + triangle * 50 + 12
    const points = [keyOf(start), keyOf(start + 12), keyOf(start + 24)]
    for (let i = 0; i < 3; i++) {
      const a = points[i], b = points[(i + 1) % 3], edge = a < b ? `${a}|${b}` : `${b}|${a}`
      edges.set(edge, (edges.get(edge) ?? 0) + 1)
      const [x, y, z] = points[i].split(',').map(Number)
      bounds.minX = Math.min(bounds.minX, x); bounds.maxX = Math.max(bounds.maxX, x)
      bounds.minY = Math.min(bounds.minY, y); bounds.maxY = Math.max(bounds.maxY, y)
      bounds.minZ = Math.min(bounds.minZ, z); bounds.maxZ = Math.max(bounds.maxZ, z)
    }
  }
  const badEdges = [...edges].filter(([, count]) => count !== 2)
  assert.equal(badEdges.length, 0, `${badEdges.length} STL edges are not shared by exactly two triangles: ${JSON.stringify(badEdges.slice(0, 3))}`)
  assert.ok(bounds.minX >= -0.01 && bounds.maxX <= 210.01)
  assert.ok(bounds.minY >= -0.01 && bounds.maxY <= 297.01)
  assert.ok(bounds.minZ >= -0.01 && bounds.maxZ <= 3.01)
})