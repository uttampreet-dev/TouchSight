# Benchmark results — 25 figures

Measured 2026-10-31 at commit `b685623` by `app/scripts/run-pipeline.mjs`: headless Chromium, production build, no network, every figure in `benchmark/raw/` through understand → draft → simplify → validate → exports. Ground truth in `benchmark/truth/*.json`. Two tables on purpose: a figure can pass every geometric rule and still be semantically wrong, so what the pipeline *read* and what it *made* are scored apart.

## 1. Semantic — what the pipeline read

A label counts as read when every word matches within one dropped or misread character. A region counts as named when a region in the redesigned model carries that truth name. Relations: proposed by stroke adjacency; "match truth" is an automatic name-pair check against the truth file (direction ignored), so it under-counts correct proposals that the truth file does not list and never counts a wrong one.

| Figure | Difficulty | Labels read | Regions named | Relations proposed · match truth | Understand |
|---|---|---|---|---|---|
| astro-solarsystem-01 | medium | 2/17 (12%) | 0/4 (0%) | 4 · 0/4 | 1.0 s |
| bio-brain-fr-01 | easy | 0/6 (0%) | 1/6 (17%) | 5 · 0/4 | 1.1 s |
| bio-cellcycle-01 | hard | 41/45 (91%) | 2/9 (22%) | 6 · 0/4 | 1.9 s |
| bio-digestive-01 | hard | 29/30 (97%) | 3/7 (43%) | 6 · 1/4 | 1.8 s |
| bio-digestive-02 | hard | 30/30 (100%) | 1/8 (13%) | 2 · 0/4 | 1.7 s |
| bio-dna-01 | medium | 0/6 (0%) | 0/3 (0%) | 2 · 0/3 | 0.8 s |
| bio-eye-01 | medium | 18/19 (95%) | 1/7 (14%) | 1 · 0/3 | 1.9 s |
| bio-eye-02 | hard | 11/13 (85%) | 0/4 (0%) | 1 · 0/3 | 2.3 s |
| bio-flower-01 | medium | 16/17 (94%) | 1/6 (17%) | 3 · 0/5 | 1.0 s |
| bio-flower-02 | easy | 4/4 (100%) | 0/4 (0%) | 1 · 0/4 | 0.8 s |
| bio-heart-01 | hard | 9/14 (64%) | 0/4 (0%) | 7 · 0/4 | 1.5 s |
| bio-heart-02 | easy | 9/9 (100%) | 4/4 (100%) | 6 · 2/4 | 0.8 s |
| bio-neuron-01 | hard | 27/29 (93%) | 1/6 (17%) | 3 · 0/3 | 1.9 s |
| bio-plantcell-01 | medium | 21/22 (95%) | 2/6 (33%) | 5 · 0/3 | 1.7 s |
| bio-plantcell-02 | easy | 6/8 (75%) | 4/9 (44%) | 1 · 0/2 | 0.7 s |
| bio-respiratory-01 | hard | 44/48 (92%) | 0/7 (0%) | 4 · 0/3 | 2.3 s |
| chem-distillation-01 | medium | 0/16 (0%) | 0/6 (0%) | 2 · 0/3 | 0.9 s |
| geo-tectonic-01 | medium | 6/18 (33%) | 4/7 (57%) | 6 · 0/3 | 1.7 s |
| geo-watercycle-01 | hard | 11/24 (46%) | 1/4 (25%) | 4 · 0/3 | 1.8 s |
| geo-watercycle-02 | hard | 11/19 (58%) | 1/4 (25%) | 5 · 0/4 | 2.1 s |
| math-keplertriangle-01 | hard | 0/15 (0%) | 0/2 (0%) | 7 · 0/2 | 1.0 s |
| math-parallelogram-01 | easy | 0/4 (0%) | 0/2 (0%) | 3 · 0/2 | 0.5 s |
| math-triangleproof-01 | medium | 0/8 (0%) | 0/3 (0%) | 2 · 0/3 | 0.7 s |
| phy-circuit-schematic-01 | hard | 5/16 (31%) | 4/6 (67%) | 1 · 0/3 | 1.2 s |
| phy-pulley-01 | medium | 0/6 (0%) | 0/3 (0%) | 4 · 0/3 | 0.8 s |

Mean label recall **54%**, mean region recall **20%** over 25 figures with truth; 91 relations proposed, 3 of the 83 in the truth files matched automatically.

## 2. Geometric — what the pipeline made

First-run validator status before any teacher edit. R3 (a detected relation awaiting the teacher) is listed separately because it is the designed stop, not a geometry failure. "Geometry clean" means no S1–S3, T1, K1, M1, R1 or R2 finding.

| Figure | Geometry clean | Blocking by rule | R3 awaiting teacher | Min gap before → after | Regions kept · dropped | Lines kept | Scale | Exports SVG · STL · BRF · alt | Redesign + validate + export |
|---|---|---|---|---|---|---|---|---|---|
| astro-solarsystem-01 | yes | — | 3 | 8.42 → 8.42 mm | 8 · 0 | 6 | 1 | ✓ · ✓ · ✓ · ✓ (361 shells closed) | 11 + 18 ms |
| bio-brain-fr-01 | yes | — | 4 | 0.34 → 3.11 mm | 4 · 0 | 4 | 1 | ✓ · ✓ · ✓ · ✓ (809 shells closed) | 13 + 42 ms |
| bio-cellcycle-01 | yes | — | 6 | 0.06 → 3.02 mm | 13 · 3 | 2 | ×0.872 | ✓ · ✓ · ✓ · ✓ (549 shells closed) | 28 + 23 ms |
| bio-digestive-01 | yes | — | 4 | 0.18 → 3.1 mm | 6 · 4 | 8 | ×0.892 | ✓ · ✓ · ✓ · ✓ (398 shells closed) | 18 + 17 ms |
| bio-digestive-02 | yes | — | 2 | 0.23 → 3.09 mm | 7 · 0 | 7 | ×0.993 | ✓ · ✓ · ✓ · ✓ (378 shells closed) | 16 + 17 ms |
| bio-dna-01 | yes | — | 2 | 0.64 → 3.13 mm | 5 · 0 | 4 | 1 | ✓ · ✓ · ✓ · ✓ (365 shells closed) | 5 + 15 ms |
| bio-eye-01 | yes | — | 1 | 0.85 → 3.11 mm | 6 · 0 | 7 | 1 | ✓ · ✓ · ✓ · ✓ (866 shells closed) | 6 + 34 ms |
| bio-eye-02 | yes | — | 1 | 2.65 → 3.1 mm | 2 · 0 | 5 | 1 | ✓ · ✓ · ✓ · ✓ (1276 shells closed) | 5 + 47 ms |
| bio-flower-01 | yes | — | 1 | 0.25 → 3.1 mm | 5 · 3 | 7 | 1 | ✓ · ✓ · ✓ · ✓ (286 shells closed) | 7 + 12 ms |
| bio-flower-02 | yes | — | 1 | Infinity → Infinity mm | 1 · 0 | 6 | 1 | ✓ · ✓ · ✓ · ✓ (537 shells closed) | 3 + 24 ms |
| bio-heart-01 | yes | — | 5 | 0.26 → 3.1 mm | 6 · 2 | 4 | 1 | ✓ · ✓ · ✓ · ✓ (399 shells closed) | 39 + 26 ms |
| bio-heart-02 | yes | — | 6 | 1.22 → 3.11 mm | 5 · 0 | 6 | 1 | ✓ · ✓ · ✓ · ✓ (816 shells closed) | 5 + 29 ms |
| bio-neuron-01 | yes | — | 1 | 0.16 → 3.1 mm | 10 · 2 | 5 | 1 | ✓ · ✓ · ✓ · ✓ (621 shells closed) | 14 + 27 ms |
| bio-plantcell-01 | yes | — | 2 | 0.38 → 3.11 mm | 5 · 5 | 11 | 1 | ✓ · ✓ · ✓ · ✓ (652 shells closed) | 9 + 28 ms |
| bio-plantcell-02 | yes | — | 1 | 0 → 3.09 mm | 5 · 4 | 6 | 1 | ✓ · ✓ · ✓ · ✓ (433 shells closed) | 14 + 18 ms |
| bio-respiratory-01 | yes | — | 3 | 8.18 → 8.18 mm | 6 · 0 | 4 | 1 | ✓ · ✓ · ✓ · ✓ (341 shells closed) | 7 + 15 ms |
| chem-distillation-01 | NO | K1 | 2 | 0.74 → 3.11 mm | 6 · 0 | 7 | 1 | ✓ · ✓ · ✓ · ✓ (504 shells closed) | 10 + 19 ms |
| geo-tectonic-01 | yes | — | 5 | 0.56 → 3.13 mm | 10 · 0 | 2 | 1 | ✓ · ✓ · ✓ · ✓ (846 shells closed) | 26 + 41 ms |
| geo-watercycle-01 | yes | — | 3 | 0.18 → 3.09 mm | 13 · 1 | 5 | 1 | ✓ · ✓ · ✓ · ✓ (1146 shells closed) | 27 + 49 ms |
| geo-watercycle-02 | yes | — | 4 | 0.07 → 3.1 mm | 12 · 2 | 4 | 1 | ✓ · ✓ · ✓ · ✓ (1324 shells closed) | 41 + 58 ms |
| math-keplertriangle-01 | yes | — | 7 | 0.53 → 3.1 mm | 6 · 0 | 5 | 1 | ✓ · ✓ · ✓ · ✓ (405 shells closed) | 3 + 16 ms |
| math-parallelogram-01 | yes | — | 3 | 0.05 → 3.11 mm | 4 · 0 | 1 | 1 | ✓ · ✓ · ✓ · ✓ (2008 shells closed) | 3 + 67 ms |
| math-triangleproof-01 | yes | — | 2 | 0.81 → 3.1 mm | 7 · 0 | 3 | 1 | ✓ · ✓ · ✓ · ✓ (755 shells closed) | 7 + 30 ms |
| phy-circuit-schematic-01 | yes | — | 0 | 0.3 → 3.1 mm | 8 · 4 | 4 | 1 | ✓ · ✓ · ✓ · ✓ (1713 shells closed) | 17 + 62 ms |
| phy-pulley-01 | NO | K1 | 4 | 0.09 → 3.09 mm | 9 · 0 | 5 | 1 | ✓ · ✓ · ✓ · ✓ (1330 shells closed) | 19 + 49 ms |

Geometry clean on first run: **23/25**. Every export succeeded on **25/25** figures. End to end (photo in → four files out, no teacher): median **1.3 s**, mean 1.4 s.

## 3. Known failures

- astro-solarsystem-01: label "Sun" not read (closest: "rls")
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
- bio-brain-fr-01: label "Tronc cérébral" not read (closest: "Tronc")
- bio-cellcycle-01: label "(Animal Cells)" not read (closest: "Telophase and Cytokinesis Nuclear membrane reforms nucleoli reappear chromosomes unwind into chromatin")
- bio-cellcycle-01: label "Resting Phase G0" not read (closest: "Resting Phase Cell leaves cycle")
- bio-cellcycle-01: label "Gap I G1" not read (closest: "Gap Cell grows")
- bio-cellcycle-01: label "Gap II G2" not read (closest: "Gap Cell grows")
- bio-digestive-01: label "Jejunum" not read (closest: "Mouth")
- bio-dna-01: label "1" not read (closest: "")
- bio-dna-01: label "2" not read (closest: "")
- bio-dna-01: label "3" not read (closest: "")
- bio-dna-01: label "4" not read (closest: "")
- bio-dna-01: label "5" not read (closest: "")
- bio-dna-01: label "6" not read (closest: "")
- bio-eye-01: label "Ciliary body" not read (closest: "Ciliary bodly")
- bio-eye-02: label "Iris" not read (closest: "Sclera")
- bio-eye-02: label "Optic papilla" not read (closest: "Optic nerve")
- bio-flower-01: label "anther" not read (closest: "Mature flower")
- bio-heart-01: label "Pulmonary Artery" not read (closest: "Pulmonary Art")
- bio-heart-01: label "Left Atrium" not read (closest: "Right trium")
- bio-heart-01: label "Left Ventricle" not read (closest: "Left")
- bio-heart-01: label "Right Ventricle" not read (closest: "Right trium")
- bio-heart-01: label "Pericardium" not read (closest: "Superior Vena Cava")
- bio-neuron-01: label "Mitochondrion" not read (closest: "Microtubule Neurofibrils Neurotransmitter Receptor")
- bio-neuron-01: label "Axon hillock" not read (closest: "hillock")
- bio-plantcell-01: label "Small membranous vesicles" not read (closest: "Small membranous")
- bio-plantcell-02: label "Nucleolus" not read (closest: "Cell wall")
- bio-plantcell-02: label "Mitochondrion" not read (closest: "Cell wall")
- bio-respiratory-01: label "Esophagus" not read (closest: "Capilllary beds")
- bio-respiratory-01: label "Oral cavity" not read (closest: "Nose Nasal cavity Nasal conchae Nasal vestibule")
- bio-respiratory-01: label "Main bronchi" not read (closest: "bronchi")
- bio-respiratory-01: label "Alveolar sacs" not read (closest: "Alveolar")
- chem-distillation-01: label "1" not read (closest: "Sf SS")
- chem-distillation-01: label "2" not read (closest: "Sf SS")
- chem-distillation-01: label "3" not read (closest: "Sf SS")
- chem-distillation-01: label "4" not read (closest: "Sf SS")
- chem-distillation-01: label "5" not read (closest: "Sf SS")
- chem-distillation-01: label "6" not read (closest: "Sf SS")
- chem-distillation-01: label "7" not read (closest: "Sf SS")
- chem-distillation-01: label "8" not read (closest: "Sf SS")
- chem-distillation-01: label "9" not read (closest: "Sf SS")
- chem-distillation-01: label "10" not read (closest: "Sf SS")
- chem-distillation-01: label "11" not read (closest: "Sf SS")
- chem-distillation-01: label "12" not read (closest: "Sf SS")
- chem-distillation-01: label "13" not read (closest: "Sf SS")
- chem-distillation-01: label "14" not read (closest: "Sf SS")
- chem-distillation-01: label "15" not read (closest: "Sf SS")
- chem-distillation-01: label "16" not read (closest: "Sf SS")
- chem-distillation-01: validator K1: braille key (13 entries in 2 columns) needs 17 mm more sheet
- geo-tectonic-01: label "NORTH AMERICAN PLATE" not read (closest: "of AMERICAN")
- geo-tectonic-01: label "JUAN DE FUCA PLATE" not read (closest: "JUAN DE")
- geo-tectonic-01: label "PHILIPPINE PLATE" not read (closest: "PLATE")
- geo-tectonic-01: label "COCOS PLATE" not read (closest: "PLATE")
- geo-tectonic-01: label "ARABIAN PLATE" not read (closest: "PLATE")
- geo-tectonic-01: label "INDIAN PLATE" not read (closest: "PLATE")
- geo-tectonic-01: label "AFRICAN PLATE" not read (closest: "of AMERICAN")
- geo-tectonic-01: label "SOUTH AMERICAN PLATE" not read (closest: "of AMERICAN")
- geo-tectonic-01: label "NAZCA PLATE" not read (closest: "PLATE")
- geo-tectonic-01: label "PACIFIC PLATE" not read (closest: "PLATE")
- geo-tectonic-01: label "SCOTIA PLATE" not read (closest: "PLATE")
- geo-tectonic-01: label "ANTARCTIC PLATE" not read (closest: "PLATE")
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
- geo-watercycle-02: label "SEA ICE" not read (closest: "CLOUDS")
- geo-watercycle-02: label "SNOW, GLACIERS and ICE SHEETS" not read (closest: "SNOW GLACIERS and ICESHEETS")
- geo-watercycle-02: label "EVAPOTRANSPIRATION" not read (closest: "CLOUDS")
- geo-watercycle-02: label "SURFACE RUNOFF" not read (closest: "SURFACE")
- geo-watercycle-02: label "RIVERS and LAKES" not read (closest: "RIVERS and")
- geo-watercycle-02: label "PERCOLATION" not read (closest: "CLOUDS")
- geo-watercycle-02: label "RIVER DISCHARGE" not read (closest: "RIVERS and")
- geo-watercycle-02: label "GROUND-WATER FLOW" not read (closest: "CLOUDS and WATER VAPOR")
- math-keplertriangle-01: label "√φ^(-10) ≈ .090" not read (closest: "VoA(-10)")
- math-keplertriangle-01: label "√φ^(-8) ≈ .145" not read (closest: "VoA(-10)")
- math-keplertriangle-01: label "√φ^(-9) ≈ .114" not read (closest: "VoA(-10)")
- math-keplertriangle-01: label "√φ^(-7) ≈ .185" not read (closest: "VoA(-10)")
- math-keplertriangle-01: label "√φ^(-6) ≈ .236" not read (closest: "VoA(-10)")
- math-keplertriangle-01: label "√φ^(-5) ≈ .300" not read (closest: "VoA(-10)")
- math-keplertriangle-01: label "√φ^(-4) ≈ .381" not read (closest: "VoA(-10)")
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
- math-triangleproof-01: label "A" not read (closest: "")
- math-triangleproof-01: label "B" not read (closest: "")
- math-triangleproof-01: label "C" not read (closest: "")
- math-triangleproof-01: label "D" not read (closest: "")
- math-triangleproof-01: label "E" not read (closest: "")
- math-triangleproof-01: label "F" not read (closest: "")
- math-triangleproof-01: label "A (D)" not read (closest: "")
- math-triangleproof-01: label "C (F)" not read (closest: "")
- phy-circuit-schematic-01: label "1" not read (closest: "AMMETER")
- phy-circuit-schematic-01: label "A" not read (closest: "AMMETER")
- phy-circuit-schematic-01: label "I=4 AMPERES" not read (closest: "AMPERES")
- phy-circuit-schematic-01: label "R=3 OHMS" not read (closest: "OHMS")
- phy-circuit-schematic-01: label "+" not read (closest: "AMMETER")
- phy-circuit-schematic-01: label "V" not read (closest: "AMMETER")
- phy-circuit-schematic-01: label "-" not read (closest: "AMMETER")
- phy-circuit-schematic-01: label "E=12 VOLTS" not read (closest: "VOLTS")
- phy-circuit-schematic-01: label "2" not read (closest: "AMMETER")
- phy-circuit-schematic-01: label "SCHEMATIC OF CIRCUIT" not read (closest: "PICTORIAL DIAGRAM OF CIRCUIT")
- phy-circuit-schematic-01: label "Figure 48. Diagram of a basic electric circuit." not read (closest: "PICTORIAL DIAGRAM OF CIRCUIT")
- phy-pulley-01: label "F_N" not read (closest: "FAF")
- phy-pulley-01: label "F + ΔF" not read (closest: "FAF")
- phy-pulley-01: label "β" not read (closest: "FAF")
- phy-pulley-01: label "F" not read (closest: "FAF")
- phy-pulley-01: label "d" not read (closest: "FAF")
- phy-pulley-01: label "D" not read (closest: "FAF")
- phy-pulley-01: validator K1: braille key (14 entries in 2 columns) needs 1 mm more sheet

## 4. Teacher corrections and the eyes-closed test

Logged by hand in `benchmark/CORRECTIONS.md` (edits and time to "Ready to publish" per figure) and `benchmark/USABILITY.md` (two testers, eyes closed, Wi-Fi off). Those numbers are not in this file until the runs happen.
