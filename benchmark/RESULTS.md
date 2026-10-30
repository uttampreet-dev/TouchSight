# Benchmark results — 8 figures

Measured 2026-10-30 at commit `d2e3fbe` by `app/scripts/run-pipeline.mjs`: headless Chromium, production build, no network, every figure in `benchmark/raw/` through understand → draft → simplify → validate → exports. Ground truth in `benchmark/truth/*.json`. Two tables on purpose: a figure can pass every geometric rule and still be semantically wrong, so what the pipeline *read* and what it *made* are scored apart.

## 1. Semantic — what the pipeline read

A label counts as read when every word matches within one dropped or misread character. A region counts as named when a region in the redesigned model carries that truth name. Relations: proposed by stroke adjacency; "match truth" is an automatic name-pair check against the truth file (direction ignored), so it under-counts correct proposals that the truth file does not list and never counts a wrong one.

| Figure | Difficulty | Labels read | Regions named | Relations proposed · match truth | Understand |
|---|---|---|---|---|---|
| bio-digestive-01 | hard | 29/30 (97%) | 3/7 (43%) | 6 · 1/4 | 2.0 s |
| bio-eye-01 | medium | 18/19 (95%) | 1/7 (14%) | 1 · 0/3 | 1.9 s |
| bio-flower-01 | medium | 16/17 (94%) | 1/6 (17%) | 3 · 0/5 | 1.0 s |
| bio-heart-01 | hard | 9/14 (64%) | 0/4 (0%) | 7 · 0/4 | 1.5 s |
| bio-heart-02 | easy | 9/9 (100%) | 4/4 (100%) | 6 · 2/4 | 0.8 s |
| bio-plantcell-01 | medium | 21/22 (95%) | 2/6 (33%) | 5 · 0/3 | 1.7 s |
| bio-plantcell-02 | easy | 6/8 (75%) | 4/9 (44%) | 1 · 0/2 | 0.7 s |
| geo-watercycle-01 | hard | 11/24 (46%) | 1/4 (25%) | 4 · 0/3 | 1.8 s |

Mean label recall **83%**, mean region recall **35%** over 8 figures with truth; 33 relations proposed, 3 of the 28 in the truth files matched automatically.

## 2. Geometric — what the pipeline made

First-run validator status before any teacher edit. R3 (a detected relation awaiting the teacher) is listed separately because it is the designed stop, not a geometry failure. "Geometry clean" means no S1–S3, T1, K1, M1, R1 or R2 finding.

| Figure | Geometry clean | Blocking by rule | R3 awaiting teacher | Min gap before → after | Regions kept · dropped | Lines kept | Scale | Exports SVG · STL · BRF · alt | Redesign + validate + export |
|---|---|---|---|---|---|---|---|---|---|
| bio-digestive-01 | yes | — | 4 | 0.18 → 3.1 mm | 6 · 4 | 8 | ×0.892 | ✓ · ✓ · ✓ · ✓ (398 shells closed) | 22 + 20 ms |
| bio-eye-01 | yes | — | 1 | 0.85 → 3.11 mm | 6 · 0 | 7 | 1 | ✓ · ✓ · ✓ · ✓ (866 shells closed) | 6 + 33 ms |
| bio-flower-01 | yes | — | 1 | 0.25 → 3.1 mm | 5 · 3 | 7 | 1 | ✓ · ✓ · ✓ · ✓ (286 shells closed) | 8 + 12 ms |
| bio-heart-01 | yes | — | 5 | 0.26 → 3.1 mm | 6 · 2 | 4 | 1 | ✓ · ✓ · ✓ · ✓ (399 shells closed) | 38 + 25 ms |
| bio-heart-02 | yes | — | 6 | 1.22 → 3.11 mm | 5 · 0 | 6 | 1 | ✓ · ✓ · ✓ · ✓ (816 shells closed) | 5 + 28 ms |
| bio-plantcell-01 | yes | — | 2 | 0.38 → 3.11 mm | 5 · 5 | 11 | 1 | ✓ · ✓ · ✓ · ✓ (652 shells closed) | 9 + 26 ms |
| bio-plantcell-02 | yes | — | 1 | 0 → 3.09 mm | 5 · 4 | 6 | 1 | ✓ · ✓ · ✓ · ✓ (433 shells closed) | 13 + 18 ms |
| geo-watercycle-01 | yes | — | 3 | 0.18 → 3.09 mm | 13 · 1 | 5 | 1 | ✓ · ✓ · ✓ · ✓ (1146 shells closed) | 28 + 47 ms |

Geometry clean on first run: **8/8**. Every export succeeded on **8/8** figures. End to end (photo in → four files out, no teacher): median **1.7 s**, mean 1.5 s.

## 3. Known failures

- bio-digestive-01: label "Jejunum" not read (closest: "Mouth")
- bio-eye-01: label "Ciliary body" not read (closest: "Ciliary bodly")
- bio-flower-01: label "anther" not read (closest: "Mature flower")
- bio-heart-01: label "Pulmonary Artery" not read (closest: "Pulmonary Art")
- bio-heart-01: label "Left Atrium" not read (closest: "Right trium")
- bio-heart-01: label "Left Ventricle" not read (closest: "Left")
- bio-heart-01: label "Right Ventricle" not read (closest: "Right trium")
- bio-heart-01: label "Pericardium" not read (closest: "Superior Vena Cava")
- bio-plantcell-01: label "Small membranous vesicles" not read (closest: "Small membranous")
- bio-plantcell-02: label "Nucleolus" not read (closest: "Cell wall")
- bio-plantcell-02: label "Mitochondrion" not read (closest: "Cell wall")
- geo-watercycle-01: label "The Water Cycle" not read (closest: "The")
- geo-watercycle-01: label "Ice and snow" not read (closest: "Ice and")
- geo-watercycle-01: label "Fog drip" not read (closest: "The")
- geo-watercycle-01: label "Surface runoff" not read (closest: "Surface")
- geo-watercycle-01: label "Snowmelt runoff" not read (closest: "The")
- geo-watercycle-01: label "Dew" not read (closest: "The")
- geo-watercycle-01: label "Infiltration" not read (closest: "The")
- geo-watercycle-01: label "Streamflow" not read (closest: "The")
- geo-watercycle-01: label "Seepage" not read (closest: "The")
- geo-watercycle-01: label "Spring" not read (closest: "The")
- geo-watercycle-01: label "Plant uptake" not read (closest: "The")
- geo-watercycle-01: label "Freshwater" not read (closest: "The")
- geo-watercycle-01: label "Groundwater flow" not read (closest: "flow")

## 4. Teacher corrections and the eyes-closed test

Logged by hand in `benchmark/CORRECTIONS.md` (edits and time to "Ready to publish" per figure) and `benchmark/USABILITY.md` (two testers, eyes closed, Wi-Fi off). Those numbers are not in this file until the runs happen.
