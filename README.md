# TouchSight

**A textbook can have a braille edition. A blackboard can't.**

Every diagram a teacher draws, photocopies or projects is invisible to a blind student on the day it is taught.
TouchSight is an **accessibility compiler for diagrams**: it reads a diagram's structure, redesigns that
structure for a fingertip, and renders one verified model as touch, audio, quiz and print.

![React](https://img.shields.io/badge/React-19-20232a?logo=react&logoColor=61dafb)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-7-3178c6?logo=typescript&logoColor=white)
![OpenCV.js](https://img.shields.io/badge/OpenCV.js-5-5c3ee8?logo=opencv&logoColor=white)
![Tesseract.js](https://img.shields.io/badge/Tesseract.js-7-2b6cb0)
![liblouis](https://img.shields.io/badge/liblouis-3.2-0e7c7b)

It is not an image describer, a braille translator or a model that draws a new picture. Those exist. The
compiler and its validator are the contribution.

## Why a fingertip needs a compiler, not a filter

| Physical fact | What it forces |
|---|---|
| A fingertip resolves ~1–2 mm; raised lines closer than ~3 mm merge into one ridge | Geometry is re-spaced, not scaled |
| Touch reads serially, one region at a time; vision reads in parallel | Detail is cut to what survives serial reading |
| Colour, shading, gradients and hairlines carry no tactile information | Meaning moves into texture, outline and a braille key |

So the middle stage, **Simplify**, is a constraint solver over real geometry at print size, and a deterministic
**validator** refuses to publish anything a fingertip could not read.

## What is in the box

```
photo / page ─► UNDERSTAND ─► draft TDM ─► SIMPLIFY ─► VALIDATE ─► teacher review ─► PUBLISH
                regions,                   re-space,    S1 S2 S3 T1   confirm relations,      │
                labels (OCR),              textures,    K1 M1 R1 R2   rename, merge, remove   │
                strokes, relations         key, order   R3                                     ▼
                                                              ┌──────── one Tactile Diagram Model ────────┐
                                                              ▼              ▼            ▼              ▼
                                                      STUDENT APP       PROJECTOR      EXPORTS        LIBRARY
                                                      haptic explore,   finger trail,  tactile SVG,   per chapter,
                                                      audio tour,       captions,      STL relief,    offline,
                                                      quiz, braille key round trip     BRF key, alt   on the phone
```

Three surfaces, one codebase, no server:

- **Teacher console** (laptop): photograph or drop a figure → regions, labels and strokes are read in the
  browser (OpenCV.js + Tesseract.js) and drawn over the photo as they arrive → the solver redesigns it → the
  validator lists every blocking finding by rule → the teacher confirms detected relations, renames, merges,
  removes → publish → export. The published relief is shown in 3-D from the very STL that is exported, lit so
  dots and ridges throw shadows.
- **Student app** (Android phone, installed from the browser, works with Wi-Fi off): a finger on the screen
  feels a tick at every boundary and a different rhythm per texture, hears the part's name when it rests, can
  take an audio tour in reading order, be quizzed ("find the left ventricle", the finger is the answer), and read
  the braille key. English, Hindi and Punjabi. Built to be driven without sight: every control speaks on the
  first touch and acts on the second; two-finger swipe changes mode, two-finger double-tap says where the finger
  is, two fingers held still take a spoken command (where am I, what does it do, tour, quiz, key, repeat, next,
  library, a language), three-finger tap changes language; a spoken introduction plays on first launch. A sound layer doubles the
  haptics on phones without a motor: a tone under the finger whose pitch follows height on the sheet, a timbre per
  texture, a click at every boundary, panned with position. A high-contrast mode (larger type, thicker lines)
  serves low vision.
- **Projector view** (laptop): mirrors the student's finger live through a relay on the app's own origin,
  with a trail, boundary flashes, captions and a measured round trip.
- **Classroom** (console + phones, no accounts): the console shows a four-letter room code and QR; a phone joins
  once and from then on every publish lands on it and stays there offline. The teacher types the roster; the
  student holding the phone picks their name by touch (each name is spoken, a second touch chooses). Their activity
  flows back to the console's Class view: diagrams opened, time under the finger per part, quiz targets found and
  tries per target, live and kept on the laptop. Activity recorded while the phone is offline is queued on the
  phone and sent when the link returns.

## The Tactile Diagram Model

Everything downstream reads one JSON document, in millimetres on an A4 sheet:

```json
{
  "tdm": "0.1", "id": "heart", "title": "The human heart", "sheet": { "w": 210, "h": 297, "margin": 15 },
  "regions": [{ "id": "r-la", "name": { "en": "Left atrium", "hi": "बायाँ आलिंद" }, "polygon": [[106,53],[146,53],[146,95],[106,95]],
                "texture": "dots", "keyRef": "c", "confidence": 0.96, "meaning": "receives oxygenated blood from the lungs" }],
  "lines":   [{ "id": "l-01", "name": { "en": "Aorta" }, "path": [[120,20],[150,40]], "width": 1.2, "style": "single", "arrow": "end", "keyRef": "f" }],
  "relations": [{ "from": "r-la", "to": "r-lv", "kind": "flows-into", "direction": "forward", "source": "teacher" }],
  "key": [{ "ref": "c", "regionId": "r-la", "text": { "en": "Left atrium" }, "braille": { "en": "⠠⠇⠑⠋⠞ ⠁⠞⠗⠊⠥⠍" } }],
  "readingOrder": ["r-ra", "r-rv", "r-la", "r-lv", "l-01"],
  "validation": { "status": "pass", "blocking": [], "advisory": [] },
  "provenance": { "pipeline": "0.1", "teacherReviewed": true, "reviewedAt": "2026-10-30T09:12:00+05:30" }
}
```

Full schema: [docs/TDM-SPEC.md](docs/TDM-SPEC.md).

## The validator

Deterministic, located, named. A model with any blocking finding cannot be published.

| Rule | Checks | Threshold | Blocks |
|---|---|---|---|
| S1 | Separation between raised elements | ≥ 3.0 mm (BANA 2010) | yes |
| S2 | Minimum region area; minimum line length | ≥ 60 mm²; ≥ 8 mm | yes |
| S3 | Minimum raised line width | ≥ 1.2 mm | yes |
| T1 | Neighbouring regions use different textures | within 5 mm | yes |
| K1 | Braille key fits the sheet, laid out exactly as it prints | 10 mm line pitch, 6 mm cells | yes |
| M1 | Everything inside the sheet margins | 15 mm | yes |
| R1 | Relations reference existing elements | — | yes |
| R2 | Every element in the reading order exactly once | — | yes |
| R3 | Every relation the pipeline detected is confirmed or removed by a teacher | — | yes |
| O1 | OCR confidence of every label used | ≥ 0.75 | advisory |
| N1 | Every element has a real name | — | advisory |

A finding looks like `S1: Left atrium and Right atrium are 1.8 mm apart (min 3)` with the ids and the spot on
the sheet. Rules, thresholds and sources: [docs/VALIDATOR-RULES.md](docs/VALIDATOR-RULES.md).

## Measured

From [benchmark/RESULTS.md](benchmark/RESULTS.md): 25 figures (8 development figures plus 17 Wikimedia Commons
diagrams across biology, physics, chemistry, geography, mathematics and astronomy), headless Chromium, production
build, no network, every figure through understand → redesign → validate → exports with no teacher. Two tables in
the file on purpose: a figure can pass every geometric rule and still be semantically wrong.

| What the pipeline read | What it made |
|---|---|
| Labels read: mean **54%** over 25 figures; **10 figures at or above 90%** (digestive, cell cycle, eye, flower, heart line art, neuron, plant cell, respiratory) | Validator geometry clean on the first run: **23/25** (the two misses are K1, a braille key that did not fit) |
| Regions named: mean **20%**; 100% on the clean heart, 0% where labels sit over gradients or where the figure is symbolic | Minimum gap raised to ≥ 3.0 mm on every figure that had one below |
| Symbolic and numeric labels (DNA formula, distillation, three maths figures, pulley): **0%**, see limits | All four exports on **25/25**, every STL shell closed |
| Relations: 91 proposed, **3 of 83** truth pairs matched automatically; rule R3 holds every one for the teacher | Median **1.3 s** from photo to four files |

Teacher-correction counts and the eyes-closed location test are logged by hand in
[benchmark/CORRECTIONS.md](benchmark/CORRECTIONS.md) and [benchmark/USABILITY.md](benchmark/USABILITY.md); both
are protocols with no recorded runs yet.

## What it cannot do yet

- **Naming regions is the weak link** (region recall 20% across 25 figures, 100% on the clean heart). Labels are
  read well on printed figures; tying a label to the right enclosed area fails over gradients, broken leader lines
  and white pockets between organs. The teacher renames in the console.
- **Symbolic, numeric and non-English labels are not read.** Formulas, angle marks and numerals (the DNA, distillation,
  pulley and three maths figures) scored 0%; a French diagram scored 0%. Clean printed words in English are the target.
- **Relations are proposed from stroke adjacency only.** They are often wrong, which is why rule R3 blocks
  every one until a teacher confirms it.
- **3-D shaded colour figures** read at 64% and **low-resolution paintings** at 46–58% label recall.
- **Hand-drawn chalk on a blackboard** is not supported. Clean printed, photocopied or projected figures are the
  target.
- **Haptics are Android-only** (iOS Safari has no Vibration API); audio, quiz and print work everywhere. A phone
  screen is for exploration; the raised print is the study artefact.
- **The live projector mirror and the classroom link need the phone and laptop on one link** (a hotspot and
  tunnel, or the same machine); the student app itself needs no network. Room state lives in the relay's memory:
  the console re-sends roster and published diagrams when it reconnects, phones keep theirs, progress is kept on
  the laptop.
- **Braille tables** (UEB grade 1, Bharati Hindi and Punjabi via liblouis) have not yet been checked by a braille
  reader.
- **Spoken commands need a network.** Android's speech recognition runs on a server; the touch gestures do the same
  jobs offline, so voice is a convenience over them, not the only way.

Full list: [benchmark/LIMITS.md](benchmark/LIMITS.md).

## Run it

```bash
cd app && npm install
npm run build
node scripts/serve.mjs 4173        # app on http://localhost:4173, projector relay at /relay
```

Open `/teacher` on the laptop, `/student` on an Android phone (add to home screen, then turn Wi-Fi off),
`/stage` on the projector, `/teacher/class` for the room code the phones join. For a phone on another network, expose the port over https
(`cloudflared tunnel --url http://localhost:4173`); the phone needs https for installation and vibration.

Development: `npm run dev`. Tests: `npm test` (model, solver, validator, explorer, exports, 23 tests).
Benchmark: `npm run benchmark` rewrites `benchmark/RESULTS.md` from a full headless run; a partial run never
overwrites it.

## Repository

```
app/            the web app: src/pipeline (understand), src/tdm (model, solver, validator, edits),
                src/export (SVG, STL, BRF, alt-text), src/student (explorer, braille), src/routes (screens),
                scripts/ (static server + relay, headless harnesses, benchmark runner)
docs/           TDM-SPEC.md, VALIDATOR-RULES.md
packages/       standalone Node CLIs that take a .tdm.json and write the tactile SVG, STL, braille key and alt-text
                without the app (npm install at the root, then npm run export:svg examples/bio-heart-01.tdm.json)
benchmark/      raw figures and sources, truth files, RESULTS.md, LIMITS.md, results/ (overlays, exports, screens)
examples/       a hand-authored heart model
```

Figure sources and licences: [benchmark/raw/SOURCES.md](benchmark/raw/SOURCES.md).
