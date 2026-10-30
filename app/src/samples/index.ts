import type { Tdm } from '../tdm/types'

/** Teacher-reviewed diagrams shipped with the app, so a student has something to touch before the first lesson arrives. */
const files = import.meta.glob<{ default: Tdm }>('./*.tdm.json', { eager: true })

export const SAMPLES: Tdm[] = Object.keys(files).sort().map((k) => files[k].default)
export const sampleById = (id: string) => SAMPLES.find((s) => s.id === id)
