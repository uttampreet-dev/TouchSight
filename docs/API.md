# Interfaces

Everything a program outside the app can talk to: the model file, the relay protocol, the URL contract, the
command-line exporters, the headless harness, and the build-time configuration.

## The model file

`<id>.tdm.json`, specified in [TDM-SPEC.md](TDM-SPEC.md). Coordinates in millimetres on the sheet. The app reads and
writes it through `app/src/tdm/io.ts` (`parseTdm`, `serializeTdm`), which validates ids, references and the key.
The standalone CLIs re-validate it with their own copy of the rules (`packages/tdm-runtime/tdm.mjs`).

## Relay protocol

One WebSocket endpoint, `/relay`, carries two kinds of traffic. Messages are JSON text frames.

### Stage traffic (projector mirror)

Every stage frame carries a projector code in `stage` and reaches only the sockets on that code, so two rooms, or two
visitors, never see each other's fingers. A projector has a four-letter code of its own, shown as a QR that opens
`/student?stage=CODE` on one phone; a projector opened as `/stage?room=CODE` uses the class room's code, and every phone
in that room mirrors to it. A socket joins a code with `{ "type": "stage-join", "stage": "CODE" }`. The relay keeps
the last `hello` on each code and replays it to a projector that joins late. A phone with neither a projector code nor
a room does not use the relay for mirroring at all.

| `type` | From | Fields | Meaning |
|---|---|---|---|
| `hello` | student | `tdm` | the diagram the phone is exploring, in full |
| `finger` | student | `p: [x, y] \| null`, `id` | finger position in sheet millimetres and the element under it; `null` when lifted |
| `focus` | student | `id` | the element the phone is speaking about |
| `say` | student | `text` | what the phone just said |
| `mode` | student | `mode` | `explore`, `tour`, `quiz`, `key` |
| `quiz` | student | `target`, `result?`, `hitId?` | the part asked for; then `correct` or `wrong` and what was touched |
| `ping` / `pong` | stage / student | `t0`, `from` | round-trip measurement shown on the projector |
| `stage-join` | both | `stage` | binds the socket to a projector code |

Every frame also carries `t` (sender's clock), `src` (`student` or `stage`) and `stage` (the projector code). The same events go over a
`BroadcastChannel` named `touchsight-stage` for a projector tab on the same device.

### Class traffic (rooms)

Frames with `{ "type": "class", "room": "ABCD", ... }`. A room code is four letters from `ABCDEFGHJKLMNPQRSTUVWXYZ`.

Client to relay:

| `op` | Fields | Who | Effect |
|---|---|---|---|
| `join` | `role: "console" \| "student"`, `student?` | both | binds the socket to the room; the relay replies with `state` and tells the room about the presence change |
| `roster` | `names: string[]` (≤ 60) | console | replaces the roster |
| `publish` | `tdm` | console | stores the model and fans it out |
| `unpublish` | `id` | console | removes it |
| `activity` | `event`, `student`, `at` | student | appends and fans out one activity event |
| `point` | `diagramId`, `id \| null`, `name`, `at` | console | the teacher points at a part; every phone is asked to find it; `null` stops |
| `reset` | — | console | clears the room's activity and the pointing |

Relay to clients:

| `op` | Fields |
|---|---|
| `state` | `roster`, `published: Tdm[]`, `activity` (last 500), `phones`, `students` (names connected), `pointing` |
| `roster` | `names` |
| `published` | `tdm` |
| `unpublished` | `id` |
| `activity` | `event` (with `student` and `at`) |
| `presence` | `phones`, `student`, `joined` |
| `point` | `diagramId`, `id`, `name`, `at` |

Activity events (`event.kind`): `open` (`diagramId`, `title`), `explore` (`partId`, `partName`, `ms` under the
finger), `quiz` (`target`, `targetName`, `found`, `attempts`, `seconds`), `found` (the part the teacher pointed at: `partId`,
`partName`, `seconds`, `attempts`), `tour`, `lang`. A phone that is offline
queues events in `localStorage` and sends them on reconnect; a console re-sends its roster and published models after
every reconnect, so a relay restart loses nothing.

Two implementations speak this protocol: `app/scripts/serve.mjs` (Node, `ws`, rooms persisted to `.rooms.json`) and
`cloudflare/relay.js` (a Durable Object with hibernating WebSockets, rooms in its storage).

## URL contract

| URL | Behaviour |
|---|---|
| `/student?room=ABCD` | the phone joins room `ABCD` and remembers it; this is what the console's QR encodes |
| `/student/d/<id>` | opens a stored diagram in the explorer |
| `/student/d/<id>?guide=1` | the same, with the guided first diagram running |
| `/teacher?sample=<figure>` | the console compiles a shipped figure at once (`bio-heart-02`, `bio-plantcell-02`, `phy-circuit-schematic-01`, `bio-neuron-01`, `geo-tectonic-01`) |
| `/teacher/preview/<id>` | the student app and the projector side by side for that diagram |
| `/print/<chapter>` | every published diagram of the chapter as A4 tactile sheets, ready to print |
| `/teacher/d/<id>` | opens a library model in the console |
| `/stage` | the projector, on a code of its own; its QR links one phone to it |
| `/stage?room=ABCD` | the projector for class `ABCD`; every phone in the room mirrors to it |
| `/student?stage=CODE` | links this phone to that projector for the session |
| `/stage?local` | the projector for a phone on this device only; never connects to the relay |
| `/device` | the device check |

Only the student route is in the PWA manifest's `start_url`; the console is a normal web page.

## Review log

A published model carries what its review cost in `provenance.review`: `seconds` from the first draft to publish,
`edits`, and `byKind` (`rename`, `relation`, `meaning`, `texture`, `merge`, `remove`, `order`). The library downloads
one CSV row per reviewed diagram; the Class view downloads the lesson's activity as CSV.

## Headless harness

In a built app, `window.__touchsight` exposes the pipeline for scripts and tests:
`understand(src, onStage)`, `draftTdm(understanding, meta)`, `simplify(tdm)`, `validate(tdm)`, `exportSvg`,
`exportStl`, `checkStl`, `exportBrf`, `altText`, `segment`, `detectSegments`, `readLabels`, `loadCv`, `loadImage`,
`prepare`, `edit`, and `last` (the most recent understanding). `app/scripts/run-pipeline.mjs` drives
`/teacher/understand` with Playwright through this object to produce `benchmark/RESULTS.md`; `shoot-*.mjs` take the
screenshots used in the README.

## Command-line exporters

From the repository root, each takes one model file and writes into its package's `out/` directory:

```bash
npm run export:svg      examples/bio-heart-01.tdm.json   # <id>.tactile.svg  A4, true mm, braille dots
npm run export:stl      examples/bio-heart-01.tdm.json   # <id>.relief.stl   closed shells
npm run export:braille  examples/bio-heart-01.tdm.json   # <id>.brf + a model copy with braille fields filled
npm run export:alt-text examples/bio-heart-01.tdm.json   # <id>.alt.txt
npm run test:exports
```

Limits enforced by `tdm-runtime`: 2 MB input, 100 regions, 200 lines, 500 relations, 10 000 coordinate pairs, 50 MB
output. The CLIs never read a path or URL found inside the model.

## Build and configuration

| Setting | Where | Meaning |
|---|---|---|
| `VITE_RELAY_URL` | build environment | `wss://host/relay` when the relay is not on the app's origin |
| `PORT` / argv | `scripts/serve.mjs [port]` | port for the static server and relay (default 4173) |
| `engines.node` | `app/package.json` | Node 24 |
| `vercel.json` | `app/` | SPA rewrite and cache headers for a static host |
| `render.yaml` | repo root | the relay as a web service |
| `cloudflare/wrangler.toml` | | the relay as a Worker with a Durable Object binding `HUB` |

```bash
cd app && npm install
npm run dev            # Vite on :5173, /relay proxied to :4173
npm run build          # production build in app/dist (PWA precache included)
node scripts/serve.mjs # serve dist and the relay on :4173
npm test               # unit tests
npm run benchmark      # full headless benchmark against :4173
```
