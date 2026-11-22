# Architecture

TouchSight is a single static web application plus one small relay. Everything that reads an image, redesigns it for
touch, checks it, speaks it, vibrates it, prints it or mirrors it runs in the browser of the device in use. The relay
only forwards messages between devices in the same room; it never sees an image and stores nothing but what a
classroom needs to survive a page reload.

```
                       ┌────────────────────────────────────────────────────────────┐
                       │  Static host (any CDN)                                      │
                       │  index.html · JS · CSS · OpenCV.js · Tesseract.js · liblouis │
                       └───────────────┬───────────────────────┬─────────────────────┘
                                       │ loads once, then offline (PWA)
        ┌──────────────────────────────┴──────┐    ┌───────────┴─────────┐    ┌───────────────────┐
        │  Teacher console  /teacher           │    │ Student app /student│    │ Projector  /stage │
        │  understand → simplify → validate    │    │ haptics · sound ·   │    │ live mirror of    │
        │  review → publish → export           │    │ speech · tour · quiz│    │ the finger        │
        │  IndexedDB: library, images, progress│    │ IndexedDB: diagrams │    │                   │
        └───────────┬───────────┬──────────────┘    └──────┬──────────────┘    └──────┬────────────┘
                    │ publish   │ roster, reset             │ activity, finger          │ ping
                    ▼           ▼                           ▼                           ▼
              ┌─────────────────────────────────────────────────────────────────────────────┐
              │  Relay  wss://…/relay   (Node `ws` server, or a Cloudflare Durable Object)   │
              │  rooms: roster · published diagrams · activity        stage: last diagram    │
              └─────────────────────────────────────────────────────────────────────────────┘
```

## Surfaces

| Surface | Route | Device | What it holds |
|---|---|---|---|
| Landing | `/` | any | the product story, a live validator replay, links to every surface |
| Teacher console | `/teacher`, `/teacher/d/:id`, `/teacher/library`, `/teacher/class`, `/teacher/preview`, `/teacher/inspect` | laptop | capture (photo, file, board drawing, shipped figure), understand, review, publish, export; library with review log; room code, roster, leading the class, live progress and heat map; phone and projector on one screen; the pipeline inspector |
| Student app | `/student`, `/student/d/:id`, `/student?room=CODE` | Android phone, installed | library of received diagrams and samples; the haptic explorer with tour, quiz, key, voice |
| Projector | `/stage` | the classroom screen | the sheet, the student's finger, captions, round-trip time |
| Print pack | `/print/:chapter` | laptop, then a printer | a cover and one A4 tactile sheet per published diagram of a chapter |
| Device check | `/device` | phone | installed from the home screen, offline-capable, local store, vibration, speech voices per language |

## One model, many renderers

The Tactile Diagram Model (TDM, [TDM-SPEC.md](TDM-SPEC.md)) is the only artefact that crosses a surface boundary.
The console produces it; the phone, the projector, the SVG, STL, BRF and alt-text exporters and the standalone CLIs
read it. No renderer ever opens the source photo. This is what makes the phone work with Wi-Fi off, the exports
agree with the screen, and the validator's verdict mean the same thing everywhere: a model that passes is safe to
touch on any of them.

```
photo ──► understand ──► draft TDM ──► simplify ──► validate ──► teacher review ──► publish
                                           ▲                          │
                                           └───── edits re-solve ─────┘
                                                        │
             ┌──────────────┬───────────────┬───────────┼────────────┬───────────────┐
             ▼              ▼               ▼           ▼            ▼               ▼
         phone (haptic)  projector     tactile SVG   STL relief   BRF key + alt   classroom push
```

## Module map

| Area | Path | Responsibility |
|---|---|---|
| Pipeline | `app/src/pipeline/` | image preparation, segmentation, OCR, stroke detection, label-to-region association, draft model; see [PIPELINE.md](PIPELINE.md) |
| Model | `app/src/tdm/` | types, parse/serialize, geometry (Clipper offsets, booleans, distances), the simplify solver, the validator, teacher edits |
| Student | `app/src/student/` | hit testing in millimetres, the explorer step function, gestures, question answering, braille worker client, projector mirror client |
| Device | `app/src/device/` | vibration patterns, sonification, speech synthesis, speech recognition |
| Class | `app/src/class/` | classroom link: rooms, roster, publish, activity queue |
| Export | `app/src/export/` | tactile SVG, STL relief with a closed-shell check, braille key layout, BRF, alt-text |
| i18n | `app/src/i18n/` | UI strings and spoken phrases in English, Hindi and Punjabi; glossary of part names; part meanings |
| Store | `app/src/store/db.ts` | IndexedDB: diagrams, source images, quiz results, class progress |
| Routes | `app/src/routes/` | the five surfaces |
| Relay | `app/scripts/serve.mjs`, `cloudflare/relay.js` | the room protocol, in Node and as a Durable Object |
| CLIs | `packages/` | the four exporters as standalone Node programs with their own model validation |
| Benchmark | `benchmark/`, `app/scripts/run-pipeline.mjs` | 25 figures with hand-written truth, the headless harness that measures every stage |

## Where state lives

| State | Where | Lifetime |
|---|---|---|
| Teacher's library (models, source images) | IndexedDB on the laptop | until deleted |
| Student's diagrams (received and samples) | IndexedDB on the phone | until deleted; survives Wi-Fi off and reinstall of the tab |
| Quiz results, progress rows | IndexedDB | per device |
| Room code, student name, language, contrast, sound, speak-first | `localStorage` | per device |
| Activity recorded offline | `localStorage` queue on the phone | flushed on the next connection |
| Rooms (roster, published models, last 2000 activity events) | relay memory + `.rooms.json` (Node) or Durable Object storage (Cloudflare) | until the room is reset |
| The last projected diagram | relay memory | until replaced |

There are no accounts, no server-side images and no analytics. A room code is four letters from an alphabet without
look-alikes; it is a meeting point, not a credential, and a room holds nothing a stranger could use.

## Offline and installation

The student app is a progressive web app. Workbox precaches every asset including OpenCV.js, the Tesseract worker and
language data and the liblouis tables, so a phone that opened the app once runs it with Wi-Fi off, including braille
translation and speech (on-device voices). Speech recognition on Android runs on Google's servers and needs a network;
every spoken command has a gesture that does the same job offline.

## Hosting

Two pieces: the static build and the relay.

| Piece | Serves | Options used |
|---|---|---|
| Static build (`app/dist`) | all five surfaces | Vercel (SPA rewrite in `app/vercel.json`); any static host works |
| Relay | `/relay` WebSocket | `app/scripts/serve.mjs` (serves `dist` and the relay on one origin, for a laptop or a LAN); Render web service (`render.yaml`); Cloudflare Workers + Durable Object (`cloudflare/`) |

When the static build and the relay live on different origins, the build is made with `VITE_RELAY_URL` pointing at the
relay; otherwise the app expects the relay on its own origin.

## Security and privacy

- Images never leave the laptop: understanding runs in the console's own tab.
- The relay receives models and activity events only for the room the sender joined; it is a fan-out, not an API.
- Exports are plain files; the CLIs validate the model, cap sizes, and refuse to follow any path or URL inside it.
- Microphone and vibration are used only on the phone, after the first touch, and only while the app is open.
