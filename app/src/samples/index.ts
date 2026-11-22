import type { Tdm } from '../tdm/types'

/** Teacher-reviewed diagrams shipped with the app, so a student has something to touch before the first lesson arrives. */
const files = import.meta.glob<{ default: Tdm }>('./*.tdm.json', { eager: true })

// the order a student meets them in: the heart first (the guided first diagram uses it), then by subject
const ORDER = ['sample-heart', 'sample-plant-cell', 'sample-animal-cell', 'sample-atom', 'sample-earth-layers']
const rank = (t: Tdm) => { const i = ORDER.indexOf(t.id); return i < 0 ? ORDER.length : i }
export const SAMPLES: Tdm[] = Object.keys(files).sort().map((k) => files[k].default).sort((a, b) => rank(a) - rank(b))
export const sampleById = (id: string) => SAMPLES.find((s) => s.id === id)
