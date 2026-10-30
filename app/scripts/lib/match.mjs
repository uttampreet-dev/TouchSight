// Label matching shared by the scorer and the pipeline runner.
// A truth label counts as read when every word matches within one dropped or misread character (5+ letter words), or exactly.
export const norm = (s) => s.toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

function lev(a, b) {
  const m = a.length, n = b.length
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 1; j <= n; j++) d[0][j] = j
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[m][n]
}
// a token matches when equal, or within 2 edits for words of 5+ letters (one dropped/misread character)
const tokenHit = (t, set) => set.has(t) || [...set].some((x) => Math.min(x.length, t.length) >= 5 && lev(x, t) <= 2)

export function sim(a, b) {
  // token-level: fraction of truth tokens present in the candidate
  const ta = norm(a).split(' ').filter(Boolean), tb = new Set(norm(b).split(' ').filter(Boolean))
  if (!ta.length) return 0
  return ta.filter((t) => tokenHit(t, tb)).length / ta.length
}

export function matchLabels(truthLabels, observedLabels) {
  const candidates = truthLabels.flatMap((truth, truthIndex) =>
    observedLabels
      .map((observed, observedIndex) => ({ truthIndex, observedIndex, score: sim(truth, observed) }))
      .filter((candidate) => candidate.score >= 0.8),
  ).sort((a, b) => b.score - a.score)
  const matches = new Map(), usedObserved = new Set()
  for (const candidate of candidates) {
    if (matches.has(candidate.truthIndex) || usedObserved.has(candidate.observedIndex)) continue
    matches.set(candidate.truthIndex, candidate.observedIndex)
    usedObserved.add(candidate.observedIndex)
  }
  const found = [], missing = []
  truthLabels.forEach((truth, truthIndex) => {
    const observedIndex = matches.get(truthIndex)
    if (observedIndex !== undefined) {
      found.push([truth, observedLabels[observedIndex]])
      return
    }
    const best = observedLabels.map((observed) => ({ observed, score: sim(truth, observed) })).sort((a, b) => b.score - a.score)[0]
    missing.push([truth, best?.observed ?? '', best ? +best.score.toFixed(2) : 0])
  })
  return { found, missing }
}
