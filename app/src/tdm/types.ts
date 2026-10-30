/** Tactile Diagram Model v0.1 — mirrors docs/TDM-SPEC.md. All coordinates in millimetres on the sheet. */

export type Lang = 'en' | 'hi' | 'pa'
export type LocalText = Partial<Record<Lang, string>> & { en: string }

export type Texture = 'solid' | 'dots' | 'diagonal-lines' | 'horizontal-lines' | 'grid' | 'empty'
export type LineStyle = 'single' | 'double' | 'dashed'
export type Arrow = 'none' | 'start' | 'end' | 'both'
export type Point = [number, number]

export interface TdmRegion {
  id: string
  name: LocalText
  meaning?: string
  polygon: Point[]
  texture: Texture
  keyRef: string
  confidence: number
  sourceLabel?: { text: string; ocrConfidence: number }
}

export interface TdmLine {
  id: string
  name: LocalText
  path: Point[]
  width: number
  style: LineStyle
  arrow: Arrow
  keyRef: string
}

export type RelationKind = 'flows-into' | 'connects' | 'contains' | 'part-of' | 'points-to' | 'greater-than'

export interface TdmRelation {
  from: string
  to: string
  kind: RelationKind
  direction: 'forward' | 'backward' | 'both'
  /** 0–1 for a relation the pipeline proposed; absent for a teacher's */
  confidence?: number
  /** 'detected' blocks publication until the teacher confirms (rule R3); absent means teacher-made */
  source?: 'detected' | 'teacher'
  /** the stroke that proposed it */
  via?: string
}

export const RELATION_KINDS: RelationKind[] = ['flows-into', 'connects', 'contains', 'part-of', 'points-to', 'greater-than']

export interface TdmKeyEntry {
  ref: string
  regionId: string
  text: LocalText
  braille: Partial<Record<Lang, string>>
}

export interface ValidationFinding {
  rule: string
  msg: string
  ids: string[]
  at?: Point
}

export interface TdmValidation {
  status: 'pending' | 'pass' | 'fail'
  blocking: ValidationFinding[]
  advisory: ValidationFinding[]
}

export interface Tdm {
  tdm: '0.1'
  id: string
  title: string
  subject: string
  sheet: { w: number; h: number; margin: number }
  source: { kind: 'photo' | 'upload' | 'pdf' | 'authored'; file?: string; captured: string }
  regions: TdmRegion[]
  lines: TdmLine[]
  relations: TdmRelation[]
  key: TdmKeyEntry[]
  readingOrder: string[]
  languages: { primary: Lang; available: Lang[] }
  validation: TdmValidation
  provenance: { pipeline: string; teacherReviewed: boolean; reviewedAt: string | null }
}

export const TEXTURES: Texture[] = ['dots', 'diagonal-lines', 'horizontal-lines', 'grid', 'solid', 'empty']
