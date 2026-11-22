# Benchmark results — 25 figures

Measured 2026-11-18 at commit `a422605` by `app/scripts/run-pipeline.mjs`: headless Chromium, production build, no network, every figure in `benchmark/raw/` through understand → draft → simplify → validate → exports. Ground truth in `benchmark/truth/*.json`. Two tables on purpose: a figure can pass every geometric rule and still be semantically wrong, so what the pipeline *read* and what it *made* are scored apart.

## 1. Semantic — what the pipeline read

A label counts as read when every word matches within one dropped or misread character. A region counts as named when a region in the redesigned model carries that truth name. Relations: proposed by stroke adjacency; "match truth" is an automatic name-pair check against the truth file (direction ignored), so it under-counts correct proposals that the truth file does not list and never counts a wrong one.

| Figure | Difficulty | Labels read | Regions named | Relations proposed · match truth | Understand |
|---|---|---|---|---|---|
| astro-solarsystem-01 | medium | 3/17 (18%) | 0/4 (0%) | 4 · 0/4 | 1.2 s |
| bio-brain-fr-01 | easy | 0/6 (0%) | 1/6 (17%) | 2 · 0/4 | 1.2 s |
| bio-cellcycle-01 | hard | 41/45 (91%) | 1/9 (11%) | 6 · 0/4 | 2.4 s |
| bio-digestive-01 | hard | 30/30 (100%) | 2/7 (29%) | 8 · 0/4 | 2.1 s |
| bio-digestive-02 | hard | 29/30 (97%) | 2/8 (25%) | 7 · 0/4 | 2.1 s |
| bio-dna-01 | medium | 2/6 (33%) | 0/3 (0%) | 1 · 0/3 | 1.0 s |
| bio-eye-01 | medium | 18/19 (95%) | 2/7 (29%) | 1 · 0/3 | 2.2 s |
| bio-eye-02 | hard | 11/13 (85%) | 0/4 (0%) | 1 · 0/3 | 2.6 s |
| bio-flower-01 | medium | 17/17 (100%) | 1/6 (17%) | 3 · 0/5 | 1.1 s |
| bio-flower-02 | easy | 4/4 (100%) | 1/4 (25%) | 1 · 0/4 | 0.9 s |
| bio-heart-01 | hard | 10/14 (71%) | 0/4 (0%) | 6 · 0/4 | 1.7 s |
| bio-heart-02 | easy | 9/9 (100%) | 4/4 (100%) | 1 · 0/4 | 0.9 s |
| bio-neuron-01 | hard | 28/29 (97%) | 3/6 (50%) | 8 · 0/3 | 2.3 s |
| bio-plantcell-01 | medium | 21/22 (95%) | 1/6 (17%) | 5 · 0/3 | 2.0 s |
| bio-plantcell-02 | easy | 6/8 (75%) | 3/9 (33%) | 1 · 0/2 | 0.8 s |
| bio-respiratory-01 | hard | 42/48 (88%) | 2/7 (29%) | 5 · 0/3 | 2.9 s |
| chem-distillation-01 | medium | 8/16 (50%) | 0/6 (0%) | 3 · 0/3 | 1.0 s |
| geo-tectonic-01 | medium | 9/18 (50%) | 7/7 (100%) | 8 · 0/3 | 2.0 s |
| geo-watercycle-01 | hard | 14/24 (58%) | 2/4 (50%) | 7 · 0/3 | 2.2 s |
| geo-watercycle-02 | hard | 11/19 (58%) | 3/4 (75%) | 6 · 0/4 | 2.4 s |
| math-keplertriangle-01 | hard | 1/15 (7%) | 0/2 (0%) | 3 · 0/2 | 1.1 s |
| math-parallelogram-01 | easy | 0/4 (0%) | 0/2 (0%) | 0 · 0/2 | 0.6 s |
| math-triangleproof-01 | medium | 7/8 (88%) | 0/3 (0%) | 1 · 0/3 | 0.8 s |
| phy-circuit-schematic-01 | hard | 5/16 (31%) | 4/6 (67%) | 8 · 1/3 | 1.4 s |
| phy-pulley-01 | medium | 4/6 (67%) | 0/3 (0%) | 6 · 0/3 | 0.8 s |

Mean label recall **66%**, mean region recall **27%** over 25 figures with truth; 102 relations proposed, 1 of the 83 in the truth files matched automatically.

## 2. Geometric — what the pipeline made

First-run validator status before any teacher edit. R3 (a detected relation awaiting the teacher) is listed separately because it is the designed stop, not a geometry failure. "Geometry clean" means no S1–S3, T1, K1, M1, R1 or R2 finding.

| Figure | Geometry clean | Blocking by rule | R3 awaiting teacher | Min gap before → after | Regions kept · dropped | Lines kept | Scale | Exports SVG · STL · BRF · alt | Redesign + validate + export |
|---|---|---|---|---|---|---|---|---|---|
| astro-solarsystem-01 | yes | — | 4 | 8.42 → 8.42 mm | 8 · 0 | 6 | 1 | ✓ · ✓ · ✓ · ✓ (390 shells closed) | 11 + 19 ms |
| bio-brain-fr-01 | yes | — | 2 | 0.34 → 3.11 mm | 4 · 0 | 8 | 1 | ✓ · ✓ · ✓ · ✓ (860 shells closed) | 13 + 42 ms |
| bio-cellcycle-01 | yes | — | 6 | 0.19 → 3.1 mm | 13 · 2 | 4 | ×0.936 | ✓ · ✓ · ✓ · ✓ (621 shells closed) | 28 + 25 ms |
| bio-digestive-01 | yes | — | 3 | 0.19 → 3.1 mm | 6 · 4 | 8 | ×0.943 | ✓ · ✓ · ✓ · ✓ (350 shells closed) | 19 + 17 ms |
| bio-digestive-02 | yes | — | 7 | 0.23 → 3.1 mm | 6 · 1 | 9 | ×0.939 | ✓ · ✓ · ✓ · ✓ (346 shells closed) | 15 + 15 ms |
| bio-dna-01 | yes | — | 1 | 0.64 → 3.13 mm | 5 · 0 | 0 | 1 | ✓ · ✓ · ✓ · ✓ (171 shells closed) | 4 + 10 ms |
| bio-eye-01 | yes | — | 1 | 0.85 → 3.11 mm | 6 · 0 | 7 | 1 | ✓ · ✓ · ✓ · ✓ (846 shells closed) | 6 + 33 ms |
| bio-eye-02 | yes | — | 1 | 2.65 → 3.1 mm | 2 · 0 | 7 | 1 | ✓ · ✓ · ✓ · ✓ (1291 shells closed) | 5 + 47 ms |
| bio-flower-01 | yes | — | 2 | 0.25 → 3.1 mm | 5 · 3 | 5 | 1 | ✓ · ✓ · ✓ · ✓ (264 shells closed) | 8 + 12 ms |
| bio-flower-02 | yes | — | 1 | Infinity → Infinity mm | 1 · 0 | 5 | 1 | ✓ · ✓ · ✓ · ✓ (523 shells closed) | 3 + 23 ms |
| bio-heart-01 | yes | — | 5 | 0.98 → 3.1 mm | 7 · 2 | 7 | 1 | ✓ · ✓ · ✓ · ✓ (552 shells closed) | 15 + 26 ms |
| bio-heart-02 | yes | — | 1 | 1.22 → 3.11 mm | 5 · 0 | 0 | 1 | ✓ · ✓ · ✓ · ✓ (679 shells closed) | 5 + 24 ms |
| bio-neuron-01 | yes | — | 4 | 0.16 → 3.1 mm | 10 · 2 | 4 | 1 | ✓ · ✓ · ✓ · ✓ (537 shells closed) | 14 + 25 ms |
| bio-plantcell-01 | yes | — | 3 | 0.38 → 3.11 mm | 5 · 5 | 7 | 1 | ✓ · ✓ · ✓ · ✓ (604 shells closed) | 10 + 26 ms |
| bio-plantcell-02 | yes | — | 1 | 0 → 3.09 mm | 5 · 4 | 2 | 1 | ✓ · ✓ · ✓ · ✓ (326 shells closed) | 13 + 16 ms |
| bio-respiratory-01 | yes | — | 3 | 8.18 → 8.18 mm | 6 · 0 | 2 | 1 | ✓ · ✓ · ✓ · ✓ (402 shells closed) | 7 + 16 ms |
| chem-distillation-01 | yes | — | 2 | 0.67 → 3.12 mm | 5 · 1 | 4 | ×0.985 | ✓ · ✓ · ✓ · ✓ (336 shells closed) | 5 + 15 ms |
| geo-tectonic-01 | yes | — | 8 | 0.56 → 3.13 mm | 10 · 0 | 2 | 1 | ✓ · ✓ · ✓ · ✓ (800 shells closed) | 25 + 39 ms |
| geo-watercycle-01 | yes | — | 3 | 0.18 → 3.09 mm | 13 · 1 | 5 | 1 | ✓ · ✓ · ✓ · ✓ (1210 shells closed) | 28 + 51 ms |
| geo-watercycle-02 | yes | — | 6 | 0.07 → 3.1 mm | 12 · 2 | 4 | 1 | ✓ · ✓ · ✓ · ✓ (1218 shells closed) | 41 + 55 ms |
| math-keplertriangle-01 | yes | — | 3 | 0.53 → 3.1 mm | 6 · 0 | 6 | 1 | ✓ · ✓ · ✓ · ✓ (425 shells closed) | 4 + 16 ms |
| math-parallelogram-01 | yes | — | 0 | 0.05 → 3.11 mm | 4 · 0 | 1 | 1 | ✓ · ✓ · ✓ · ✓ (2007 shells closed) | 3 + 72 ms |
| math-triangleproof-01 | yes | — | 1 | 0.81 → 3.1 mm | 7 · 0 | 0 | 1 | ✓ · ✓ · ✓ · ✓ (570 shells closed) | 7 + 25 ms |
| phy-circuit-schematic-01 | yes | — | 7 | 0.3 → 3.1 mm | 8 · 2 | 4 | 1 | ✓ · ✓ · ✓ · ✓ (1641 shells closed) | 14 + 66 ms |
| phy-pulley-01 | yes | — | 6 | 0.09 → 3.09 mm | 9 · 0 | 3 | 1 | ✓ · ✓ · ✓ · ✓ (1255 shells closed) | 12 + 49 ms |

Geometry clean on first run: **25/25**. Every export succeeded on **25/25** figures. End to end (photo in → four files out, no teacher): median **1.5 s**, mean 1.6 s.

## 3. Known failures

- astro-solarsystem-01: label "Mercury" not read (closest: "rls")
- astro-solarsystem-01: label "Venus" not read (closest: "rls")
- astro-solarsystem-01: label "Earth" not read (closest: "rls")
- astro-solarsystem-01: label "Moon" not read (closest: "rls")
- astro-solarsystem-01: label "Mars" not read (closest: "rls")
- astro-solarsystem-01: label "Asteroid Belt" not read (closest: "rls")
- astro-solarsystem-01: label "Ceres" not read (closest: "rls")
- astro-solarsystem-01: label "Jupiter" not read (closest: "rls")
- astro-solarsystem-01: label "Saturn" not read (closest: "rls")
- astro-solarsystem-01: label "Uranus" not read (closest: "rls")
- astro-solarsystem-01: label "Neptune" not read (closest: "rls")
- astro-solarsystem-01: label "Eris" not read (closest: "rls")
- astro-solarsystem-01: label "Kuiper Belt Objects" not read (closest: "rls")
- astro-solarsystem-01: label "Makemake" not read (closest: "rls")
- bio-brain-fr-01: label "Lobe frontal" not read (closest: "ofe par tal")
- bio-brain-fr-01: label "Lobe pariétal" not read (closest: "ofe par tal")
- bio-brain-fr-01: label "Lobe temporal" not read (closest: "ofe par tal")
- bio-brain-fr-01: label "Lobe occipital" not read (closest: "ofe par tal")
- bio-brain-fr-01: label "Cervelet" not read (closest: "ofe par tal")
- bio-brain-fr-01: label "Tronc cérébral" not read (closest: "Tronc crbral")
- bio-cellcycle-01: label "(Animal Cells)" not read (closest: "Telophase and Cytokinesis Nuclear membrane reforms nucleoli reappear chromosomes unwind into chromatin")
- bio-cellcycle-01: label "Resting Phase G0" not read (closest: "Resting Phase G Cell leaves cycle")
- bio-cellcycle-01: label "Gap I G1" not read (closest: "Gap Cell grows")
- bio-cellcycle-01: label "Gap II G2" not read (closest: "Gap Cell grows")
- bio-digestive-02: label "Ileum" not read (closest: "Mouth Palate Uvula Tongue Teeth")
- bio-dna-01: label "1" not read (closest: "4")
- bio-dna-01: label "3" not read (closest: "4")
- bio-dna-01: label "5" not read (closest: "4")
- bio-dna-01: label "6" not read (closest: "4")
- bio-eye-01: label "Ciliary body" not read (closest: "Cilia")
- bio-eye-02: label "Iris" not read (closest: "Sclera")
- bio-eye-02: label "Optic papilla" not read (closest: "Optic nerve")
- bio-heart-01: label "Pulmonary Artery" not read (closest: "Pulmonary Art")
- bio-heart-01: label "Left Atrium" not read (closest: "Atria")
- bio-heart-01: label "Left Ventricle" not read (closest: "Left")
- bio-heart-01: label "Right Ventricle" not read (closest: "Right trium")
- bio-neuron-01: label "Mitochondrion" not read (closest: "4")
- bio-plantcell-01: label "Small membranous vesicles" not read (closest: "Small membranous")
- bio-plantcell-02: label "Nucleolus" not read (closest: "roplast")
- bio-plantcell-02: label "Mitochondrion" not read (closest: "roplast")
- bio-respiratory-01: label "Esophagus" not read (closest: "Capilllary beds")
- bio-respiratory-01: label "Oral cavity" not read (closest: "Nose Nasal cavity Nasal conchae Nasal vestibule")
- bio-respiratory-01: label "Main bronchi" not read (closest: "bronchi")
- bio-respiratory-01: label "Tracheal and bronchi rings" not read (closest: "Tracheal and and bro bro chi ch")
- bio-respiratory-01: label "Alveolar sacs" not read (closest: "Alveolar")
- bio-respiratory-01: label "Alveolar duct" not read (closest: "Alveolar")
- chem-distillation-01: label "4" not read (closest: "Sf SS")
- chem-distillation-01: label "5" not read (closest: "Sf SS")
- chem-distillation-01: label "6" not read (closest: "Sf SS")
- chem-distillation-01: label "7" not read (closest: "Sf SS")
- chem-distillation-01: label "8" not read (closest: "Sf SS")
- chem-distillation-01: label "11" not read (closest: "Sf SS")
- chem-distillation-01: label "12" not read (closest: "Sf SS")
- chem-distillation-01: label "15" not read (closest: "Sf SS")
- geo-tectonic-01: label "NORTH AMERICAN PLATE" not read (closest: "SOUTH AMERICAN")
- geo-tectonic-01: label "JUAN DE FUCA PLATE" not read (closest: "JUAN DE FUCA")
- geo-tectonic-01: label "PHILIPPINE PLATE" not read (closest: "PLATE")
- geo-tectonic-01: label "ARABIAN PLATE" not read (closest: "PLATE")
- geo-tectonic-01: label "AFRICAN PLATE" not read (closest: "of AMERICAN")
- geo-tectonic-01: label "SOUTH AMERICAN PLATE" not read (closest: "SOUTH AMERICAN")
- geo-tectonic-01: label "NAZCA PLATE" not read (closest: "PLATE")
- geo-tectonic-01: label "PACIFIC PLATE" not read (closest: "PLATE")
- geo-tectonic-01: label "ANTARCTIC PLATE" not read (closest: "PLATE")
- geo-watercycle-01: label "The Water Cycle" not read (closest: "The")
- geo-watercycle-01: label "Volcanic steam" not read (closest: "Volcanic ste")
- geo-watercycle-01: label "Ice and snow" not read (closest: "Ice and")
- geo-watercycle-01: label "Fog drip" not read (closest: "The")
- geo-watercycle-01: label "Dew" not read (closest: "The")
- geo-watercycle-01: label "Infiltration" not read (closest: "The")
- geo-watercycle-01: label "Spring" not read (closest: "The")
- geo-watercycle-01: label "Plant uptake" not read (closest: "uptake")
- geo-watercycle-01: label "Freshwater" not read (closest: "The")
- geo-watercycle-01: label "Groundwater flow" not read (closest: "flow")
- geo-watercycle-02: label "SEA ICE" not read (closest: "CLOUDS and WATER")
- geo-watercycle-02: label "SNOW, GLACIERS and ICE SHEETS" not read (closest: "SNOW GLACIERS and ICESHEETS")
- geo-watercycle-02: label "EVAPOTRANSPIRATION" not read (closest: "CLOUDS and WATER")
- geo-watercycle-02: label "SURFACE RUNOFF" not read (closest: "SURFACE")
- geo-watercycle-02: label "RIVERS and LAKES" not read (closest: "RIVERS and")
- geo-watercycle-02: label "PERCOLATION" not read (closest: "CLOUDS and WATER")
- geo-watercycle-02: label "RIVER DISCHARGE" not read (closest: "RIVERS and")
- geo-watercycle-02: label "GROUND-WATER FLOW" not read (closest: "CLOUDS and WATER")
- math-keplertriangle-01: label "√φ^(-10) ≈ .090" not read (closest: "VoA(-10)")
- math-keplertriangle-01: label "√φ^(-8) ≈ .145" not read (closest: "VoA(-10)")
- math-keplertriangle-01: label "√φ^(-9) ≈ .114" not read (closest: "VoA(-10)")
- math-keplertriangle-01: label "√φ^(-7) ≈ .185" not read (closest: "VoA(-10)")
- math-keplertriangle-01: label "√φ^(-6) ≈ .236" not read (closest: "VoA(-10)")
- math-keplertriangle-01: label "√φ^(-5) ≈ .300" not read (closest: "VoA(-10)")
- math-keplertriangle-01: label "√φ^(-3) ≈ .485" not read (closest: "VoA(-10)")
- math-keplertriangle-01: label "√φ^(-3) ≈ .485" not read (closest: "VoA(-10)")
- math-keplertriangle-01: label "√φ^(-2) ≈ .618" not read (closest: "VoA(-10)")
- math-keplertriangle-01: label "√φ^(-2) ≈ .618" not read (closest: "VoA(-10)")
- math-keplertriangle-01: label "√φ^(-1) ≈ .786" not read (closest: "VoA(-10)")
- math-keplertriangle-01: label "√φ^(0) =1." not read (closest: "VoA(-10)")
- math-keplertriangle-01: label "√φ^(1) ≈1.272" not read (closest: "VoA(-10)")
- math-keplertriangle-01: label "√φ^(2) ≈1.618" not read (closest: "VoA(-10)")
- math-parallelogram-01: label "a" not read (closest: "")
- math-parallelogram-01: label "b" not read (closest: "")
- math-parallelogram-01: label "h" not read (closest: "")
- math-parallelogram-01: label "γ" not read (closest: "")
- math-triangleproof-01: label "F" not read (closest: "A")
- phy-circuit-schematic-01: label "1" not read (closest: "4")
- phy-circuit-schematic-01: label "A" not read (closest: "4")
- phy-circuit-schematic-01: label "I=4 AMPERES" not read (closest: "4")
- phy-circuit-schematic-01: label "R=3 OHMS" not read (closest: "OHMS")
- phy-circuit-schematic-01: label "+" not read (closest: "4")
- phy-circuit-schematic-01: label "V" not read (closest: "4")
- phy-circuit-schematic-01: label "-" not read (closest: "4")
- phy-circuit-schematic-01: label "E=12 VOLTS" not read (closest: "12 VOLTS")
- phy-circuit-schematic-01: label "2" not read (closest: "4")
- phy-circuit-schematic-01: label "SCHEMATIC OF CIRCUIT" not read (closest: "PICTORIAL DIAGRAM OF CIRCUIT")
- phy-circuit-schematic-01: label "Figure 48. Diagram of a basic electric circuit." not read (closest: "PICTORIAL DIAGRAM OF CIRCUIT")
- phy-pulley-01: label "F_N" not read (closest: "F")
- phy-pulley-01: label "β" not read (closest: "FAF")

## 4. Teacher corrections and the eyes-closed test

Logged by hand in `benchmark/CORRECTIONS.md` (edits and time to "Ready to publish" per figure) and `benchmark/USABILITY.md` (two testers, eyes closed, Wi-Fi off). Those numbers are not in this file until the runs happen.
