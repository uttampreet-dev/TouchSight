# The understand stage

A diagram enters as a photograph, a file, a shipped textbook figure, or a drawing made on the console's board
(`components/SketchPad.tsx`). The board hands its canvas over as an image, so all four take the path below.

`app/src/pipeline/` turns a photograph, scan, slide or screenshot of a diagram into a draft Tactile Diagram Model.
Everything runs in the browser tab of the teacher console, with OpenCV.js and Tesseract.js; nothing is uploaded.
A median figure takes 1.5 s end to end on a laptop (25-figure benchmark, headless Chromium).

```
image ─► prepare ─► segment ─► read labels ─► trace strokes ─► associate ─► draft TDM
          1600 px    regions     Tesseract ×4    Hough on ink    tiers, 1:1    millimetres
```

## 1. Prepare (`image.ts`)

The image is decoded and scaled so its longer side is at most 1600 px. Every later measurement is in prepared
pixels; the draft stage maps them to millimetres on the sheet (A4 portrait, 15 mm margin) with one uniform scale, so
the printed sheet and the phone screen show the same geometry.

## 2. Segment (`segment.ts`)

Two classical paths, chosen by how colourful the image is:

- **Coloured figures** (textbook plates, slides): k-means-style colour clustering on a blurred copy; each cluster's
  connected components become region candidates with their mean colour.
- **Line art** (worksheets, board photos, scans): adaptive thresholding gives an ink mask; the enclosed white areas
  bounded by ink are traced as contours.

Candidates smaller than 0.4 % or larger than 60 % of the image, and contours touching the border, are dropped. A drawn
outline has two edges and both are traced; when one region sits inside another and fills four fifths of it, the outer
one is the stroke's second edge and is dropped. Each
candidate carries a polygon, area, bounding box, centroid and the method that found it. The ink mask is kept for the
stroke stage.

## 3. Read labels (`ocr.ts`)

Tesseract runs four passes: the colour image, the ink mask rendered black on white, a contrast-equalised grayscale
(CLAHE), and the **letters alone**. The last is the ink mask with every connected shape taller than 6 % of the image or
wider than 10 % removed, so outlines, leaders and fills are gone and only letter-sized marks remain: a name written
inside a part is read there, where the part's own outline otherwise makes the page look like a picture to the OCR engine.
Words below 45 % confidence are dropped, and so are words without two letters unless they are a confident number
(1 to 3 digits, read at 70 % or better) or a single capital (85 % or better): numbered keys and vertex letters. Words are then clustered by position, not by
Tesseract's own lines: words on one baseline with a small gap join, and stacked lines join when they are tightly
spaced and roughly centred on each other. Each cluster becomes a label with its text, confidence, bounding box,
centre and the printed lines it was read from. The passes are merged by overlap, keeping the more confident read.

## 4. Trace strokes (`lines.ts`)

Label boxes are painted out of the ink mask so letters do not become strokes; the mask is dilated so dotted and dashed
leaders become continuous; a probabilistic Hough transform returns straight segments. These are the leader lines from
labels to parts, and the vessels, wires, arrows and axes that become raised lines on the sheet.

## 5. Associate (`associate.ts`)

Every label is tied to the part it names, in four tiers:

| Tier | Rule |
|---|---|
| 0 | the label's centre lies inside a part |
| 1 | a stroke starts at the label's box and ends in a part, or on the wall of a part drawn inside an outline, or stops short of a part within reach |
| 2 | the label lies inside, or its leader ends on, an **outline**: a region that holds two or more smaller regions |
| 3 | the nearest region edge within 70 px (at 1000 px scale) |

Ties are settled **one label per region and one region per label**: candidates are ranked by tier, then by distance
(for containment, by how central the label sits in the region and how confident the read is), and assigned greedily;
a label that loses its first choice falls to its next. A read with no word of four letters and confidence under 0.85,
or any read under 0.5, is texture mistaken for text and never names a part; the part stays `Region n` for the teacher
to name, which the validator reports (rule N1).

Before association, a block that OCR read as one label but that is really a **column of names** is split: when
every printed line of the block has a leader of its own coming in from the side and leading away, each line becomes a
label. A wrapped two-line name with one leader stays whole.

## 6. Draft (`understand.ts`)

Regions become TDM regions in millimetres with the title-cased label text as the name (or `Region n`), a provisional
texture, a key letter and the OCR confidence; strokes that are not leaders, do not run along the wall of a part (that is the part's own outline), and are
long or touch two regions, become TDM lines (at most 16); pairs of parts joined by a line become detected relations for the teacher to confirm; the
reading order is top-to-bottom, left-to-right. The draft then goes through simplify and validate
([VALIDATOR-RULES.md](VALIDATOR-RULES.md)).

## Measured

The benchmark (`npm run benchmark` in `app/`) runs every figure in `benchmark/raw/` through the whole pipeline in a
headless production build and writes `benchmark/RESULTS.md`. Truth files are hand-transcribed. Current means over 25
figures: labels read 66 % (nine figures at 90 % or better), regions named 27 %, geometry clean on first run 25 of 25,
exports succeeded 25 of 25, median 1.5 s. The semantic and geometric tables are kept apart on purpose: a figure whose
labels were misread can still produce a clean, printable sheet, and the teacher's review is where the names get fixed.

## Known limits

- Photographs of boards and hand-drawn figures read far worse than printed ones; OCR is the weakest stage.
- Region recall is bounded by segmentation: parts drawn as open strokes inside one outline (an eye, a heart in a
  textbook plate) are often found as one outline plus a few blobs, so the label of a missing part has nowhere to go.
- Plain numbers and single capitals are read when confident; formulas, Greek letters, units and non-English labels are not.
- Relations are proposed from geometry only (a line joining two parts) and are always confirmed by the teacher.
