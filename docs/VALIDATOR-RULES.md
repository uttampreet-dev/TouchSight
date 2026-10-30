# Accessibility validator — rules and thresholds

The validator (`app/src/tdm/validate.ts`) is deterministic: the same model always produces the same findings, each
with a rule id, a sentence a teacher can act on, the element ids involved, and a location on the sheet. A model
with any **blocking** finding cannot be published. **Advisory** findings are shown and can be overridden.

All distances are millimetres at print size (A4 by default). The thresholds live in one place,
`RULES` in `app/src/tdm/simplify.ts`, so the solver and the validator can never disagree.

| Rule | Checks | Threshold | Blocking | Basis |
|---|---|---|---|---|
| S1 | Separation between any two raised elements: region–region boundaries, line–line (unless they share an endpoint), line–region (unless the line crosses the boundary, i.e. connects to it). Overlapping regions fail outright unless one is nested inside the other. | ≥ 3.0 mm | yes | BANA *Guidelines and Standards for Tactile Graphics* (2010): raised elements closer than ~1/8 in merge under a fingertip |
| S2 | Minimum region area; minimum line length | ≥ 60 mm²; ≥ 8 mm | yes | A region smaller than a fingertip pad cannot be identified by texture; a stroke shorter than a fingertip width reads as a dot |
| S3 | Minimum raised line width | ≥ 1.2 mm | yes | Swell-paper and embosser minimum reliable line |
| T1 | Regions within the adjacency distance use different textures (`empty` is exempt) | 5.0 mm | yes | Two adjacent areas with the same fill read as one |
| K1 | The braille key fits below the diagram inside the margins, laid out exactly as the SVG/STL exporters print it | 10 mm line pitch, 6 mm cell pitch, one column or two, 10 mm gap | yes | Standard braille line and cell spacing; the exporters and the rule share one layout function |
| M1 | Everything sits inside the sheet margins | 15 mm margin | yes | Embosser and swell-paper printable area |
| R1 | Every relation references existing elements | — | yes | Audio tour and quiz follow relations |
| R2 | Every region and line appears in the reading order exactly once | — | yes | The guided tour must cover everything, once |
| R3 | Every relation with `source: "detected"` has been confirmed (becomes `teacher`) or removed | — | yes | A relation is a claim about the subject, not geometry; the pipeline proposes, the teacher approves. Message: *Detected: Line 2 connects Left Atrium to Left Ventricle (83%) — confirm or remove* |
| O1 | OCR confidence of every label used | ≥ 0.75 | advisory | Below this a misread is likely; the teacher confirms |
| N1 | Every element has a real name, not a placeholder (`Region 3`, `Line 7`) | — | advisory | An unnamed part is spoken as nothing |

## What a finding looks like

```json
{ "rule": "S1", "msg": "Left atrium and Right atrium are 1.8 mm apart (min 3)", "ids": ["r-la", "r-ra"], "at": [104.2, 98.0] }
```

`at` is the midpoint between the two closest vertices, so the console can highlight the exact spot.

## Order of operations

1. The understand stage produces a draft model in millimetres.
2. **Simplify** fits the draft to the sheet, cleans outlines, drops slivers and duplicate outlines, resolves overlaps
   (the smaller named part yields the overlap plus the gap), pushes neighbours apart to S1, thins crowded strokes,
   assigns textures so T1 holds, and builds the reading order and key.
3. **Validate** runs every rule above on the result and writes the report into the model.
4. The teacher console shows each finding; nothing publishes while a blocking finding remains.

Simplify is built to satisfy S1–S3, T1, M1, R1 and R2 by construction; the validator still runs afterwards, because a
teacher's edit can reintroduce any of them.
