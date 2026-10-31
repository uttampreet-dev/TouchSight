const scrub = (value) => value.normalize('NFC').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, 2_000)
const RELATION_WORDS = Object.freeze({
  'flows-into': 'flows into',
  connects: 'connects to',
  contains: 'contains',
  'part-of': 'is part of',
  'points-to': 'points to',
  'greater-than': 'is greater than',
})

export function altText(tdm) {
  const elements = new Map([...tdm.regions, ...tdm.lines].map((element) => [element.id, element]))
  const sentences = [`The diagram shows ${scrub(tdm.title)} with ${tdm.regions.length} regions and ${tdm.lines.length} lines.`]
  for (const id of tdm.readingOrder) {
    const element = elements.get(id)
    const meaning = element.meaning ? `: ${scrub(element.meaning)}` : ''
    sentences.push(`${scrub(element.keyRef)}, ${scrub(element.name.en)}${meaning}.`)
  }
  for (const relation of tdm.relations) {
    const from = elements.get(relation.from), to = elements.get(relation.to)
    if (from && to) sentences.push(`${scrub(from.name.en)} ${RELATION_WORDS[relation.kind]} ${scrub(to.name.en)}.`)
  }
  return sentences.join(' ').replace(/\s+/g, ' ').slice(0, 20_000)
}