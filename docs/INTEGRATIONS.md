# Stack and integrations

Everything is open source or a platform API; there are no paid services and no API keys.

## Application

| Piece | Version | Used for |
|---|---|---|
| React | 19 | the five surfaces |
| Vite + vite-plugin-pwa (Workbox) | 8 | build, service worker, precache of 40 MB of engines and tables so the phone runs offline |
| TypeScript | 7 | every module; the model types are the contract between stages |
| React Router | 7 | routes |
| Vitest | 5 | 38 unit tests: model, solver, validator, association, explorer, gestures, answers, glossary, exports |
| Playwright (headless Chromium) | | the benchmark harness, screenshot scripts, recorded walkthroughs |

## Vision and text

| Piece | Used for |
|---|---|
| OpenCV.js | colour clustering, adaptive threshold, contours, connected components, morphology, probabilistic Hough, CLAHE |
| Tesseract.js (English traineddata, bundled) | four OCR passes with word boxes and confidences |

Both run as WebAssembly in the console's tab. The traineddata and the worker are served from the app itself, so OCR
works offline too.

## Geometry

| Piece | Used for |
|---|---|
| clipper-lib | polygon offsetting (the 3 mm separation), union, intersection, difference in integer millimetre space |
| earcut | triangulation of region polygons for the STL relief |
| three.js | the in-console 3-D view, which renders the very bytes the STL exporter wrote; the CLI's STL writer (`ExtrudeGeometry`, `STLExporter`) |

## Braille

| Piece | Used for |
|---|---|
| liblouis (asm.js build in a Web Worker) | UEB grade 1 (`en-ueb-g1.ctb`), Bharati Hindi (`hi-in-g1.utb`) and Punjabi (`pu-in-g1.utb`) translation for the key on the phone, in the SVG, in the STL domes and in the BRF file |

The CLI uses the liblouis Node binding with the same tables. Braille geometry follows the common embosser values:
6 mm cell pitch, 10 mm line pitch, 1.5 mm dots.

## Device APIs on the phone

| API | Used for | Fallback |
|---|---|---|
| Vibration API | a tick at every boundary, a rhythm per texture, quiz feedback | the sound layer (Web Audio) doubles every pulse; iOS Safari has no vibration |
| Web Audio | sonification: pitch by height, timbre by texture, panning by position, click at edges, ducking under speech | — |
| Web Speech synthesis | names, meanings, the tour, quiz prompts, answers; on-device voices in `en-IN`, `hi-IN`, `pa-IN` where installed | the projector captions |
| Web Speech recognition | spoken commands and questions (needs network on Android) | two- and three-finger gestures do the same jobs offline |
| Pointer Events | finger tracking at screen rate; multi-finger gestures | — |
| IndexedDB (via `idb`) | diagrams, images, quiz results, progress | — |
| BroadcastChannel | projector tab on the same device | the relay |
| Service worker + manifest | installation, offline start | a browser tab works without installation, minus vibration on some browsers |

## Relay and hosting

| Piece | Used for |
|---|---|
| `ws` (Node) | the relay in `scripts/serve.mjs`, also the static server for a laptop or LAN |
| Cloudflare Workers + Durable Objects | the relay as an always-on single object with hibernating WebSockets (`cloudflare/`) |
| Vercel | the static build (`app/vercel.json`) |
| Render | the Node relay as a web service (`render.yaml`) |

## Output formats and the equipment that consumes them

| File | Device | Notes |
|---|---|---|
| `*.tactile.svg` | swell-paper (microcapsule) printer and fuser; braille embosser with graphics mode | A4, true millimetres; black raises, grey does not; outlines 1.2 mm, textures at 2.2 mm pitch |
| `*.relief.stl` | any FDM or resin 3-D printer | textures as raised features, braille as 1.5 mm domes; every shell checked closed before export |
| `*.brf` | braille embosser | the key only, UEB grade 1 or Bharati |
| `*.alt.txt` | screen readers, LMS, worksheets | reading order, then the relations the figure teaches |
| `*.tdm.json` | TouchSight itself | the model |

## Standards followed

- BANA / APH *Guidelines and Standards for Tactile Graphics* for minimum separation, line width, texture distinctness
  and key placement (the validator's thresholds, [VALIDATOR-RULES.md](VALIDATOR-RULES.md)).
- Unified English Braille grade 1 and Bharati braille for Hindi and Punjabi.
- WCAG 2.2 for the sighted surfaces: contrast, keyboard focus, names on controls, and reduced motion honoured on the landing page.
