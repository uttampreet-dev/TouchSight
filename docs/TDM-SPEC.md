# Tactile Diagram Model (TDM) — specification v0.1

The TDM is the single source of truth for a converted diagram. Every renderer — haptic explorer, audio tour,
quiz, tactile SVG, STL, alt-text, braille key — reads **only** this document. Nothing renders from the source
image. A TDM is produced by the understand → simplify pipeline, corrected by a teacher, and gated by the
validator before it is published.

File: `<diagram-id>.tdm.json`. All coordinates are **millimetres** on the target print sheet (A4 portrait by
default, origin top-left, x right, y down). Screens scale from millimetres; print never scales.

## Top level

```json
{
  "tdm": "0.1",
  "id": "bio-heart-01",
  "title": "The human heart",
  "subject": "biology",
  "sheet": { "w": 210, "h": 297, "margin": 15 },
  "source": { "kind": "photo", "file": "raw/bio-heart-01.jpg", "captured": "2026-10-30T13:02:00+05:30" },
  "regions": [ ... ],
  "lines": [ ... ],
  "relations": [ ... ],
  "key": [ ... ],
  "readingOrder": [ "r-lv", "r-la", ... ],
  "languages": { "primary": "en", "available": ["en", "hi", "pa"] },
  "validation": { "status": "pass", "blocking": [], "advisory": [] },
  "provenance": { "pipeline": "0.1", "teacherReviewed": true, "reviewedAt": "..." }
}
```

## `regions[]` — the touchable areas

```json
{
  "id": "r-lv",
  "name": { "en": "Left ventricle", "hi": "बायाँ निलय", "pa": "ਖੱਬਾ ਨਿਲਯ" },
  "meaning": "chamber that pumps oxygenated blood into the aorta",
  "polygon": [[92.0, 150.2], [118.4, 150.2], ...],
  "texture": "diagonal-lines",
  "keyRef": "d",
  "confidence": 0.91,
  "sourceLabel": { "text": "Left Ventricle", "ocrConfidence": 0.97 }
}
```

- `polygon`: closed outline in mm, ≥ 3 points, simplified for touch (no vertex closer than 1.5 mm to its neighbour).
- `texture`: one of `solid`, `dots`, `diagonal-lines`, `horizontal-lines`, `grid`, `empty`. **Adjacent regions never
  share a texture** (validator rule T1).
- `keyRef`: the braille key letter for this region (`a`…`z`). Labels are never placed inside the diagram.
- `name`: at least the primary language; the braille key is generated from these strings.

## `lines[]` — raised strokes that are not region boundaries (vessels, wires, arrows, axes)

```json
{
  "id": "l-aorta",
  "name": { "en": "Aorta" },
  "path": [[120.0, 60.0], [128.5, 42.0], [140.0, 38.0]],
  "width": 1.5,
  "style": "double",
  "arrow": "end",
  "keyRef": "e"
}
```

- `width` in mm, ≥ 1.2. `style`: `single`, `double` (two parallel ridges, used for vessels/wires), `dashed`.
- `arrow`: `none`, `start`, `end`, `both` — rendered as a raised chevron.

## `relations[]` — what the diagram *says*

```json
{ "from": "r-lv", "to": "l-aorta", "kind": "flows-into", "direction": "forward" }
```

`kind` is free text from a small vocabulary: `flows-into`, `connects`, `contains`, `part-of`, `points-to`,
`greater-than`. Relations drive the audio tour ("the left ventricle flows into the aorta") and the quiz.

Optional fields record where a relation came from:

```json
{ "from": "r-03", "to": "r-01", "kind": "connects", "direction": "forward", "confidence": 0.83, "source": "detected", "via": "l-02" }
```

- `source`: `detected` when the understand stage proposed it from a stroke whose ends sit in or within 6 mm of two
  different parts; `teacher` once confirmed, drawn or edited in the console. Absent means teacher-made.
- `confidence`: 0–1 for a detected relation, 1 − (mean end distance / 6 mm).
- `via`: the stroke that proposed it.

A `detected` relation blocks publication (validator rule R3) until the teacher confirms or removes it: the
pipeline proposes, a person approves.

## `key[]` — the braille key printed beside the diagram

```json
{ "ref": "a", "regionId": "r-ra", "text": { "en": "Right atrium" }, "braille": { "en": "⠗⠊⠛⠓⠞ ⠁⠞⠗⠊⠥⠍" } }
```

Braille strings are produced by liblouis (Bharati Braille tables for `hi` and `pa`, UEB grade 1 for `en`).

## `readingOrder[]`

Ordered ids (regions and lines) for the guided tour: top-left serial scan, then relation-following. A teacher may
reorder.

## `validation`

Written by the validator; a TDM with `status: "fail"` cannot be published.

```json
{
  "status": "fail",
  "blocking": [
    { "rule": "S1", "msg": "r-la and r-ra are 1.8 mm apart (min 3.0)", "ids": ["r-la", "r-ra"], "at": [104.2, 98.0] }
  ],
  "advisory": [
    { "rule": "O1", "msg": "label 'Pulmonary' OCR confidence 0.62 (floor 0.75)", "ids": ["r-pa"] }
  ]
}
```

## Validator rules (summary — full thresholds in `VALIDATOR-RULES.md`)

| Rule | Checks | Blocking |
|---|---|---|
| S1 | separation between any two raised elements ≥ 3.0 mm | yes |
| S2 | region area ≥ 60 mm²; line length ≥ 8 mm | yes |
| S3 | line width ≥ 1.2 mm | yes |
| T1 | adjacent regions have different textures | yes |
| K1 | braille key cells do not overlap any raised element; key fits on sheet | yes |
| O1 | OCR confidence of every used label ≥ 0.75 | advisory |
| R1 | every relation references existing ids | yes |
| R2 | every region appears in `readingOrder` exactly once | yes |
| R3 | every detected relation has been confirmed or removed by the teacher | yes |
| M1 | diagram fits inside sheet margins | yes |

## Versioning

`tdm` is the schema version. Renderers reject a major version they do not know. Additive fields are allowed
within a minor version.
