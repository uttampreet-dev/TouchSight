import { useEffect, useState } from 'react'
import type { Tdm, Lang } from '../tdm/types'
import { exportSvg, exportStl, checkStl, altText, exportBrf } from '../export'
import { toBraille, brailleSupported } from '../student/braille'
import { nameIn } from '../i18n'
import { serializeTdm } from '../tdm/io'

/** One model, every output. Each button makes the file and shows what was measured in it, never a bare "download". */

type Facts = Record<string, string>
const LANG_LABEL: Record<Lang, string> = { en: 'English', hi: 'हिन्दी', pa: 'ਪੰਜਾਬੀ' }

function download(name: string, data: string | ArrayBuffer, type: string) {
  const blob = new Blob([data], { type })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export function ExportPanel({ tdm, compact = false }: { tdm: Tdm; compact?: boolean }) {
  const [lang, setLang] = useState<Lang>('en')
  const [braille, setBraille] = useState<Record<string, string> | null>(null)
  const [facts, setFacts] = useState<Facts>({})
  const [alt, setAlt] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  // liblouis cells for the key in the chosen language; the exporters fall back to built-in UEB grade 1 without them
  useEffect(() => {
    let live = true
    setBraille(null)
    if (!brailleSupported()) return
    const ids = tdm.readingOrder
    Promise.all(ids.map(async (id) => { const el = tdm.regions.find((r) => r.id === id) ?? tdm.lines.find((l) => l.id === id); return [id, el ? await toBraille(nameIn(el.name, lang), lang) : null] as const }))
      .then((rows) => { if (live) setBraille(Object.fromEntries(rows.filter((r) => r[1]).map((r) => [r[0], r[1]!]))) })
    return () => { live = false }
  }, [tdm, lang])

  const run = async (kind: string, fn: () => Promise<void> | void) => { setBusy(kind); try { await fn() } finally { setBusy(null) } }
  const b = braille ?? undefined

  const doSvg = () => run('svg', () => {
    const { svg, facts: f } = exportSvg(tdm, { lang, braille: b })
    download(`${tdm.id}.tactile.svg`, svg, 'image/svg+xml')
    setFacts((x) => ({ ...x, svg: `A4 ${f.widthMm}×${f.heightMm} mm · ${f.regions} regions · ${f.lines} lines · ${f.keyEntries} key entries · ${f.cells} braille cells${f.keyFits ? '' : ' · KEY DOES NOT FIT'}${f.truncatedKeyRows ? ` · ${f.truncatedKeyRows} names shortened` : ''}` }))
  })
  const doStl = () => run('stl', () => {
    const { stl, facts: f } = exportStl(tdm, { lang, braille: b })
    const chk = checkStl(stl)
    download(`${tdm.id}.relief.stl`, stl, 'model/stl')
    setFacts((x) => ({ ...x, stl: `${f.triangles.toLocaleString()} triangles · ${f.shells} shells${chk.closed ? ', all closed' : `, ${chk.openEdges} open edges`} · ${f.bbox.w}×${f.bbox.h}×${f.bbox.d} mm · ${f.textureFeatures} texture features · ${f.keyDomes} braille domes · ${(f.bytes / 1024).toFixed(0)} KB` }))
  })
  const doAlt = () => run('alt', async () => {
    const text = altText(tdm, lang)
    setAlt(text)
    try { await navigator.clipboard.writeText(text) } catch { /* clipboard may be blocked */ }
    setFacts((x) => ({ ...x, alt: `${text.split(/\s+/).length} words · ${LANG_LABEL[lang]} · copied` }))
  })
  const doBrf = () => run('brf', () => {
    const { brf, facts: f } = exportBrf(tdm, { lang, braille: b })
    download(`${tdm.id}.key.brf`, brf, 'text/plain')
    setFacts((x) => ({ ...x, brf: `${f.entries} entries · ${f.lines} lines · ${f.pages} page${f.pages === 1 ? '' : 's'} · ${f.cells} cells · 40×25` }))
  })
  const doTdm = () => run('tdm', () => { download(`${tdm.id}.tdm.json`, serializeTdm(tdm), 'application/json'); setFacts((x) => ({ ...x, tdm: `${tdm.regions.length} regions · ${tdm.lines.length} lines · ${tdm.relations.length} relations · ${tdm.key.length} key` })) })

  const Row = ({ k, label, onClick }: { k: string; label: string; onClick: () => void }) => (
    <div className="xp-row">
      <button className="btn" disabled={busy === k} onClick={onClick}>{label}</button>
      <span className="mono xp-facts">{facts[k] ?? ''}</span>
    </div>
  )

  return (
    <div className={`xp ${compact ? 'compact' : ''}`}>
      <div className="xp-head">
        <span className="kicker">Export</span>
        <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label="key language">
          {(['en', 'hi', 'pa'] as Lang[]).map((l) => <option key={l} value={l}>{LANG_LABEL[l]}</option>)}
        </select>
        <span className="mono xp-braille">{!brailleSupported() ? 'built-in UEB' : braille ? `liblouis · ${Object.keys(braille).length} cells rows` : 'transcribing…'}</span>
      </div>
      <Row k="svg" label="Tactile SVG" onClick={doSvg} />
      <Row k="stl" label="3-D relief STL" onClick={doStl} />
      <Row k="brf" label="Braille key BRF" onClick={doBrf} />
      <Row k="alt" label="Alt-text" onClick={doAlt} />
      <Row k="tdm" label="Model .tdm.json" onClick={doTdm} />
      {alt && <p className="xp-alt">{alt}</p>}
    </div>
  )
}
