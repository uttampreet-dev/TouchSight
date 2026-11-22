import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { listDiagrams } from '../store/db'
import { exportSvg } from '../export'
import { toBraille, brailleSupported } from '../student/braille'
import { nameIn } from '../i18n'
import type { Tdm, Lang } from '../tdm/types'
import './print.css'

/**
 * A chapter as one print job: a cover with the contents, then every published diagram of the chapter as its own A4
 * tactile sheet in true millimetres, with its braille key. Printed on swell paper, or saved as one PDF.
 */
const LANG_LABEL: Record<Lang, string> = { en: 'English', hi: 'हिन्दी', pa: 'ਪੰਜਾਬੀ' }

export function PrintPack() {
  const { chapter = '' } = useParams()
  const [lang, setLang] = useState<Lang>('en')
  const [sheets, setSheets] = useState<{ tdm: Tdm; svg: string; cells: number; keyFits: boolean }[] | null>(null)

  useEffect(() => {
    let live = true
    setSheets(null)
    ;(async () => {
      const rows = (await listDiagrams(true)).filter((r) => r.chapter === chapter)
      const out = []
      for (const r of rows) {
        // liblouis cells for the key, as the single-sheet export makes them; the exporter falls back to built-in UEB without them
        let braille: Record<string, string> | undefined
        if (brailleSupported()) {
          const pairs = await Promise.all(r.tdm.readingOrder.map(async (id) => { const el = r.tdm.regions.find((x) => x.id === id) ?? r.tdm.lines.find((x) => x.id === id); return [id, el ? await toBraille(nameIn(el.name, lang), lang) : null] as const }))
          braille = Object.fromEntries(pairs.filter((p) => p[1]).map((p) => [p[0], p[1]!]))
        }
        const { svg, facts } = exportSvg(r.tdm, { lang, braille })
        out.push({ tdm: r.tdm, svg, cells: facts.cells, keyFits: facts.keyFits })
      }
      if (live) setSheets(out)
    })().catch(() => { if (live) setSheets([]) })
    return () => { live = false }
  }, [chapter, lang])

  useEffect(() => { document.title = `${chapter} · tactile pack` }, [chapter])
  const cells = sheets?.reduce((a, s) => a + s.cells, 0) ?? 0

  return (
    <main className="pp">
      <header className="pp-bar">
        <div><span className="kicker">Chapter pack</span><b>{chapter}</b><span className="mono">{sheets ? `${sheets.length + 1} pages · A4 · ${cells} braille cells` : 'laying out…'}</span></div>
        <div className="pp-bar-r">
          <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label="key language">{(['en', 'hi', 'pa'] as Lang[]).map((l) => <option key={l} value={l}>{LANG_LABEL[l]} key</option>)}</select>
          <button className="btn primary" disabled={!sheets?.length} onClick={() => window.print()}>Print, or save as PDF</button>
        </div>
      </header>
      {sheets && !sheets.length && <p className="pp-empty">No published diagrams in this chapter on this device.</p>}
      {sheets && sheets.length > 0 && (
        <div className="pp-pages">
          <section className="pp-page pp-cover">
            <div className="pp-cover-top"><span className="pp-mark" aria-hidden><i /><i /><i /><i /></span><span className="mono">TouchSight · tactile pack</span></div>
            <h1>{chapter}</h1>
            <p className="mono">{sheets.length} tactile sheet{sheets.length === 1 ? '' : 's'} · key in {LANG_LABEL[lang]} · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <ol className="pp-toc">
              {sheets.map((s, i) => <li key={s.tdm.id}><span className="mono">{String(i + 2).padStart(2, '0')}</span><b>{s.tdm.title}</b><em className="mono">{s.tdm.regions.length} parts · {s.tdm.lines.length} lines · {s.tdm.key.length} key entries{s.keyFits ? '' : ' · key overflows'}</em></li>)}
            </ol>
            <div className="pp-how">
              <span className="kicker">How to print</span>
              <ul>
                <li>Print at <b>100 %</b>, A4, no "fit to page": every sheet is in true millimetres.</li>
                <li>Swell paper: print or photocopy with carbon-black toner, then run it through the fuser. Black raises, white stays flat.</li>
                <li>Each sheet carries its own braille key below the figure; letters in the figure are the key references.</li>
                <li>The same models are on the students' phones for touch, voice, tour and quiz.</li>
              </ul>
            </div>
          </section>
          {sheets.map((s) => <section key={s.tdm.id} className="pp-page pp-sheet" aria-label={s.tdm.title} dangerouslySetInnerHTML={{ __html: s.svg }} />)}
        </div>
      )}
    </main>
  )
}
