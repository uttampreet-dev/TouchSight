import { useEffect, useState } from 'react'
import type { Tdm, Lang } from '../../tdm/types'
import { nameIn, t } from '../../i18n'
import { toBraille, brailleSupported } from '../../student/braille'

/** The braille key: every element's letter, name and braille cells (liblouis, UEB or Bharati) in the student's language. */
export function BrailleKey({ tdm, lang, focus, onPick }: { tdm: Tdm; lang: Lang; focus: string | null; onPick: (id: string) => void }) {
  const s = t(lang)
  const [cells, setCells] = useState<Record<string, string | null>>({})
  const entries = tdm.readingOrder.map((id) => tdm.regions.find((r) => r.id === id) ?? tdm.lines.find((l) => l.id === id)).filter((e): e is NonNullable<typeof e> => !!e)

  useEffect(() => {
    let live = true
    setCells({})
    for (const el of entries) toBraille(nameIn(el.name, lang), lang).then((b) => { if (live) setCells((c) => ({ ...c, [el.id]: b })) })
    return () => { live = false }
  }, [tdm.id, lang]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="st-caption mono">{s.brailleOf} · {entries.length}{brailleSupported() ? '' : ` · ${s.brailleOff}`}</div>
      <ul className="st-key">
        {entries.map((el) => {
          const b = cells[el.id]
          return (
            <li key={el.id} className={focus === el.id ? 'on' : ''} onClick={() => onPick(el.id)}>
              <span className="ref">{el.keyRef}</span>
              <span className="name">{nameIn(el.name, lang)}</span>
              <span className={`cells ${b === undefined ? 'wait' : ''}`} aria-label={b ?? undefined}>{b === undefined ? '…' : b === null ? '—' : b}</span>
              <span className="feel">{'texture' in el ? s.textures[el.texture] : s.line}</span>
            </li>
          )
        })}
      </ul>
    </>
  )
}
