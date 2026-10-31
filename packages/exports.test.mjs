import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { assertTdm, readTdm } from './tdm-runtime/tdm.mjs'
import { exportSvg } from './export-svg/svg.mjs'
import { exportStl } from './export-stl/stl.mjs'
import { backTranslateBraille, fillBrailleFields, toBraille, toBrf } from './braille/braille.mjs'
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
})

test('SVG is A4, black and white, whitelist-only, and escapes user text', () => {
  const tdm = structuredClone(example)
  tdm.key[0].text.en = '<script>alert(1)</script>&"'
  const svg = exportSvg(assertTdm(tdm))
  assert.match(svg, /width="210mm" height="297mm" viewBox="0 0 210 297"/)
  assert.match(svg, /&lt;script&gt;alert\(1\)&lt;\/script&gt;&amp;&quot;/)
  assert.doesNotMatch(svg, /<script|foreignObject|on\w+\s*=|href\s*=/i)
  const tags = [...svg.matchAll(/<\/?([A-Za-z][\w:-]*)\b/g)].map((match) => match[1])
  assert.ok(tags.every((tag) => ['svg', 'defs', 'pattern', 'path', 'line', 'polyline', 'text', 'g'].includes(tag)))
  for (const id of ['dots', 'diagonal', 'horizontal', 'grid']) assert.ok(svg.includes(`id="${id}"`))
  assert.match(svg, /stroke-width="1\.2"/)
})

test('braille tables round-trip 10 known words in each supported language', () => {
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
    if (language === 'en') assert.equal(cells, expectedEnglish[index], word)
    else {
      assert.equal(cells, expectedNative[language][index], `${language}: ${word}`)
      assert.equal(backTranslateBraille(cells, language), expectedBack[language][index], `${language} reverse: ${word}`)
    }
  }
  assert.equal(toBrf('⠠⠇⠑⠋⠞⠀⠁⠞⠗⠊⠥⠍'), ',LEFT ATRIUM')
})

test('braille CLI model fill populates each requested language and BRF is ASCII', () => {
  const tdm = fillBrailleFields(structuredClone(example))
  for (const entry of tdm.key) for (const language of tdm.languages.available) assert.match(entry.braille[language], /^[\u2800-\u28ff ]+$/)
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
  const vertices = []
  const keyOf = (offset) => [0, 4, 8].map((delta) => view.getFloat32(offset + delta, true).toFixed(4)).join(',')
  for (let triangle = 0; triangle < triangleCount; triangle++) {
    const start = 84 + triangle * 50 + 12
    const points = [keyOf(start), keyOf(start + 12), keyOf(start + 24)]
    for (let i = 0; i < 3; i++) {
      const a = points[i], b = points[(i + 1) % 3], edge = a < b ? `${a}|${b}` : `${b}|${a}`
      edges.set(edge, (edges.get(edge) ?? 0) + 1)
      vertices.push(points[i].split(',').map(Number))
    }
  }
  const badEdges = [...edges].filter(([, count]) => count !== 2)
  assert.equal(badEdges.length, 0, `${badEdges.length} STL edges are not shared by exactly two triangles: ${JSON.stringify(badEdges.slice(0, 3))}`)
  const xs = vertices.map((point) => point[0]), ys = vertices.map((point) => point[1]), zs = vertices.map((point) => point[2])
  assert.ok(Math.min(...xs) >= -0.01 && Math.max(...xs) <= 210.01)
  assert.ok(Math.min(...ys) >= -0.01 && Math.max(...ys) <= 297.01)
  assert.ok(Math.min(...zs) >= -0.01 && Math.max(...zs) <= 3.01)
})