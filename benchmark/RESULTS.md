# Benchmark results — 25 figures

> **Scope:** All 25 figures are identified in their truth metadata as Wikimedia Commons assets or synthetic drawings. This run is not an NCERT-only benchmark.

Measured 2026-10-30 at commit `2dca7ad` (working tree changes present) by `app/scripts/run-pipeline.mjs`: headless Chromium, production build, no network, every figure in `benchmark/raw/` through understand → draft → simplify → validate → exports. Ground truth in `benchmark/truth/*.json`. Two tables on purpose: a figure can pass every geometric rule and still be semantically wrong, so what the pipeline *read* and what it *made* are scored apart.

## 1. Semantic — what the pipeline read

Labels use token similarity (exact for short words, up to two edit operations for words of at least five letters) with one-to-one matching: an OCR result can satisfy at most one printed-label instance. A region counts as named when a region in the redesigned model carries that truth name. Relations: proposed by stroke adjacency; "match truth" is an automatic name-pair check against the truth file (direction ignored), so it under-counts correct proposals that the truth file does not list and never counts a wrong one.

| Figure | Difficulty | Labels read | Regions named | Relations proposed · match truth | Understand |
|---|---|---|---|---|---|
| astro-solarsystem-01 | medium | 2/17 (12%) | 0/4 (0%) | 2 · 0/4 | 4.5 s |
| bio-brain-fr-01 | easy | 0/6 (0%) | 1/6 (17%) | 5 · 0/4 | 4.1 s |
| bio-cellcycle-01 | hard | 30/45 (67%) | 3/9 (33%) | 9 · 0/4 | 6.5 s |
| bio-digestive-01 | hard | 24/30 (80%) | 0/7 (0%) | 4 · 0/4 | 7.1 s |
| bio-digestive-02 | hard | 26/30 (87%) | 2/8 (25%) | 6 · 0/4 | 6.4 s |
| bio-dna-01 | medium | 0/6 (0%) | 0/3 (0%) | 2 · 0/3 | 3.1 s |
| bio-eye-01 | medium | 18/19 (95%) | 1/7 (14%) | 1 · 0/3 | 6.9 s |
| bio-eye-02 | hard | 11/13 (85%) | 0/4 (0%) | 1 · 0/3 | 8.1 s |
| bio-flower-01 | medium | 13/17 (76%) | 1/6 (17%) | 3 · 0/5 | 3.3 s |
| bio-flower-02 | easy | 4/4 (100%) | 0/4 (0%) | 1 · 0/4 | 2.8 s |
| bio-heart-01 | hard | 9/14 (64%) | 1/4 (25%) | 6 · 0/4 | 5.6 s |
| bio-heart-02 | easy | 9/9 (100%) | 4/4 (100%) | 6 · 2/4 | 3.2 s |
| bio-neuron-01 | hard | 25/29 (86%) | 0/6 (0%) | 7 · 0/3 | 6.3 s |
| bio-plantcell-01 | medium | 19/22 (86%) | 2/6 (33%) | 5 · 0/3 | 6.0 s |
| bio-plantcell-02 | easy | 5/8 (63%) | 4/9 (44%) | 1 · 0/2 | 3.0 s |
| bio-respiratory-01 | hard | 32/48 (67%) | 0/7 (0%) | 2 · 0/3 | 7.9 s |
| chem-distillation-01 | medium | 0/16 (0%) | 0/6 (0%) | 2 · 0/3 | 2.7 s |
| geo-tectonic-01 | medium | 4/18 (22%) | 7/7 (100%) | 8 · 0/3 | 5.9 s |
| geo-watercycle-01 | hard | 13/24 (54%) | 0/4 (0%) | 5 · 0/3 | 6.2 s |
| geo-watercycle-02 | hard | 9/19 (47%) | 1/4 (25%) | 6 · 0/4 | 6.6 s |
| math-keplertriangle-01 | hard | 0/15 (0%) | 0/2 (0%) | 7 · 0/2 | 3.9 s |
| math-parallelogram-01 | easy | 0/4 (0%) | 0/2 (0%) | 3 · 0/2 | 2.4 s |
| math-triangleproof-01 | medium | 0/8 (0%) | 0/3 (0%) | 2 · 0/3 | 2.3 s |
| phy-circuit-schematic-01 | hard | 5/16 (31%) | 4/6 (67%) | 1 · 0/3 | 3.6 s |
| phy-pulley-01 | medium | 0/6 (0%) | 0/3 (0%) | 4 · 0/3 | 3.1 s |

Mean label recall **49%**, mean region recall **20%** over 25 figures with truth; 99 relations proposed, 2 of the 83 in the truth files matched automatically.

## 2. Geometric — what the pipeline made

First-run validator status before any teacher edit. R3 (a detected relation awaiting the teacher) is listed separately because it is the designed stop, not a geometry failure. "Geometry clean" means no S1–S3, T1, K1, M1, R1 or R2 finding.

| Figure | Geometry clean | Blocking by rule | R3 awaiting teacher | Min gap before → after | Regions kept · dropped | Lines kept | Scale | Exports SVG · STL · BRF · alt | Redesign + validate + export |
|---|---|---|---|---|---|---|---|---|---|
| astro-solarsystem-01 | yes | — | 2 | 8.42 → 8.42 mm | 8 · 0 | 5 | 1 | ✓ · ✓ · ✓ · ✓ (352 shells closed) | 64 + 55 ms |
| bio-brain-fr-01 | yes | — | 4 | 0.34 → 3.11 mm | 4 · 0 | 4 | 1 | ✓ · ✓ · ✓ · ✓ (809 shells closed) | 65 + 169 ms |
| bio-cellcycle-01 | yes | — | 8 | 0.05 → 3.09 mm | 15 · 1 | 5 | 1 | ✓ · ✓ · ✓ · ✓ (750 shells closed) | 80 + 107 ms |
| bio-digestive-01 | yes | — | 3 | 0.18 → 3.1 mm | 6 · 4 | 5 | ×0.892 | ✓ · ✓ · ✓ · ✓ (330 shells closed) | 119 + 78 ms |
| bio-digestive-02 | yes | — | 6 | 0.23 → 3.09 mm | 7 · 0 | 6 | ×0.993 | ✓ · ✓ · ✓ · ✓ (366 shells closed) | 87 + 55 ms |
| bio-dna-01 | yes | — | 2 | 0.64 → 3.13 mm | 5 · 0 | 4 | 1 | ✓ · ✓ · ✓ · ✓ (365 shells closed) | 19 + 48 ms |
| bio-eye-01 | yes | — | 1 | 0.85 → 3.11 mm | 6 · 0 | 7 | 1 | ✓ · ✓ · ✓ · ✓ (866 shells closed) | 18 + 108 ms |
| bio-eye-02 | yes | — | 1 | 2.65 → 3.1 mm | 2 · 0 | 4 | 1 | ✓ · ✓ · ✓ · ✓ (1253 shells closed) | 15 + 125 ms |
| bio-flower-01 | yes | — | 1 | 0.25 → 3.1 mm | 5 · 3 | 7 | 1 | ✓ · ✓ · ✓ · ✓ (286 shells closed) | 33 + 38 ms |
| bio-flower-02 | yes | — | 1 | Infinity → Infinity mm | 1 · 0 | 6 | 1 | ✓ · ✓ · ✓ · ✓ (537 shells closed) | 12 + 65 ms |
| bio-heart-01 | yes | — | 4 | 0.26 → 3.1 mm | 6 · 2 | 7 | 1 | ✓ · ✓ · ✓ · ✓ (494 shells closed) | 293 + 100 ms |
| bio-heart-02 | yes | — | 6 | 1.22 → 3.11 mm | 5 · 0 | 6 | 1 | ✓ · ✓ · ✓ · ✓ (816 shells closed) | 37 + 116 ms |
| bio-neuron-01 | yes | — | 3 | 0.16 → 3.1 mm | 10 · 2 | 6 | 1 | ✓ · ✓ · ✓ · ✓ (636 shells closed) | 62 + 83 ms |
| bio-plantcell-01 | yes | — | 2 | 0.38 → 3.11 mm | 5 · 5 | 11 | 1 | ✓ · ✓ · ✓ · ✓ (652 shells closed) | 37 + 82 ms |
| bio-plantcell-02 | yes | — | 1 | 0 → 3.09 mm | 5 · 4 | 6 | 1 | ✓ · ✓ · ✓ · ✓ (433 shells closed) | 81 + 81 ms |
| bio-respiratory-01 | yes | — | 2 | 8.18 → 8.18 mm | 6 · 0 | 4 | 1 | ✓ · ✓ · ✓ · ✓ (342 shells closed) | 23 + 47 ms |
| chem-distillation-01 | NO | K1 | 2 | 0.74 → 3.11 mm | 6 · 0 | 7 | 1 | ✓ · ✓ · ✓ · ✓ (504 shells closed) | 26 + 64 ms |
| geo-tectonic-01 | yes | — | 8 | 0.56 → 3.13 mm | 10 · 0 | 1 | 1 | ✓ · ✓ · ✓ · ✓ (812 shells closed) | 130 + 156 ms |
| geo-watercycle-01 | yes | — | 4 | 0.18 → 3.09 mm | 13 · 1 | 5 | 1 | ✓ · ✓ · ✓ · ✓ (1163 shells closed) | 92 + 155 ms |
| geo-watercycle-02 | yes | — | 5 | 0.07 → 3.1 mm | 12 · 2 | 5 | 1 | ✓ · ✓ · ✓ · ✓ (1356 shells closed) | 158 + 232 ms |
| math-keplertriangle-01 | yes | — | 7 | 0.53 → 3.1 mm | 6 · 0 | 5 | 1 | ✓ · ✓ · ✓ · ✓ (405 shells closed) | 38 + 82 ms |
| math-parallelogram-01 | yes | — | 3 | 0.05 → 3.11 mm | 4 · 0 | 1 | 1 | ✓ · ✓ · ✓ · ✓ (2008 shells closed) | 32 + 544 ms |
| math-triangleproof-01 | yes | — | 2 | 0.81 → 3.1 mm | 7 · 0 | 3 | 1 | ✓ · ✓ · ✓ · ✓ (755 shells closed) | 25 + 103 ms |
| phy-circuit-schematic-01 | yes | — | 0 | 0.3 → 3.1 mm | 8 · 4 | 4 | 1 | ✓ · ✓ · ✓ · ✓ (1713 shells closed) | 60 + 212 ms |
| phy-pulley-01 | NO | K1 | 4 | 0.09 → 3.09 mm | 9 · 0 | 5 | 1 | ✓ · ✓ · ✓ · ✓ (1330 shells closed) | 94 + 171 ms |

Geometry clean on first run: **23/25**. Every export succeeded on **25/25** figures. End to end (photo in → four files out, no teacher): median **4.6 s**, mean 5.1 s.

## 3. Known failures

- astro-solarsystem-01: labels 2/17; regions named 0/4; relations matched 0/4
  - label "Sun" not read (closest: "Pluto")
  - label "Mercury" not read (closest: "Pluto")
  - label "Venus" not read (closest: "Pluto")
  - label "Earth" not read (closest: "Pluto")
  - label "Moon" not read (closest: "Pluto")
  - label "Mars" not read (closest: "Pluto")
  - label "Asteroid Belt" not read (closest: "Pluto")
  - label "Ceres" not read (closest: "Pluto")
  - label "Jupiter" not read (closest: "Pluto")
  - label "Saturn" not read (closest: "Pluto")
  - label "Uranus" not read (closest: "Pluto")
  - label "Neptune" not read (closest: "Pluto")
  - label "Eris" not read (closest: "Pluto")
  - label "Kuiper Belt Objects" not read (closest: "Pluto")
  - label "Makemake" not read (closest: "Pluto")
- bio-brain-fr-01: labels 0/6; regions named 1/6; relations matched 0/4
  - label "Lobe frontal" not read (closest: "ofe par tal")
  - label "Lobe pariétal" not read (closest: "ofe par tal")
  - label "Lobe temporal" not read (closest: "ofe par tal")
  - label "Lobe occipital" not read (closest: "ofe par tal")
  - label "Cervelet" not read (closest: "ofe par tal")
  - label "Tronc cérébral" not read (closest: "Tronc")
- bio-cellcycle-01: labels 30/45; regions named 3/9; relations matched 0/4
  - label "(Animal Cells)" not read (closest: "Telophase and Cytokinesis Nuclear membrane reforms nucleoli reappear chromosomes unwind into chromatin")
  - label "Resting Phase G0" not read (closest: "Resting Phase Cell leaves cycle")
  - label "Gap I G1" not read (closest: "Gap Cell grows")
  - label "S-Phase" not read (closest: "DNA Synthesis Phase S-Phase")
  - label "Gap II G2" not read (closest: "Gap Cell grows")
  - label "Chromosomes line up along metaphase plate (imaginary plane)" not read (closest: "Metaphase Chromosomes line up along metaphase plate (imaginary plane)")
  - label "Chromosomes break at centromeres, and sister chromatids move to opposite ends of the cell" not read (closest: "Anaphase Chromosomes break at centromeres and sister chromatids move to opposite ends of the cell")
  - label "Nuclear membrane reforms, nucleoli reappear, chromosomes unwind into chromatin" not read (closest: "Telophase and Cytokinesis Nuclear membrane reforms nucleoli reappear chromosomes unwind into chromatin")
  - label "Myosin II and actin filament ring contract to cleave cell in two" not read (closest: "Myosin It and actin filament ring contract to cleave cell in two Contractile ring")
  - label "Sister chromatids" not read (closest: "Anaphase Chromosomes break at centromeres and sister chromatids move to opposite ends of the cell")
  - label "Sister chromatid" not read (closest: "Anaphase Chromosomes break at centromeres and sister chromatids move to opposite ends of the cell")
  - label "Centromere" not read (closest: "Anaphase Chromosomes break at centromeres and sister chromatids move to opposite ends of the cell")
  - label "Nuclear membrane" not read (closest: "Telophase and Cytokinesis Nuclear membrane reforms nucleoli reappear chromosomes unwind into chromatin")
  - label "Nucleolus" not read (closest: "Telophase and Cytokinesis Nuclear membrane reforms nucleoli reappear chromosomes unwind into chromatin")
  - label "Chromosome" not read (closest: "Telophase and Cytokinesis Nuclear membrane reforms nucleoli reappear chromosomes unwind into chromatin")
- bio-digestive-01: labels 24/30; regions named 0/7; relations matched 0/4
  - label "Tongue" not read (closest: "Palate Uvula Tongue Teeth")
  - label "Teeth" not read (closest: "Palate Uvula Tongue Teeth")
  - label "Submandibular" not read (closest: "Sublingual- Submandibular Parotid")
  - label "Common bile duct" not read (closest: "Gallbladder Common bile duct")
  - label "Jejunum" not read (closest: "Mouth")
  - label "Descending colon" not read (closest: "Descendi escending colon")
- bio-digestive-02: labels 26/30; regions named 2/8; relations matched 0/4
  - label "Teeth" not read (closest: "Mouth Palate Uvula Tongue Teeth")
  - label "Submandibular" not read (closest: "Sublingual- Submandibular Parotid")
  - label "Ileum" not read (closest: "Jejunum lleum")
  - label "Sigmoid colon" not read (closest: "Ascending Cecum Descending colon Sigmoid colon")
- bio-dna-01: labels 0/6; regions named 0/3; relations matched 0/3
  - label "1" not read (closest: "")
  - label "2" not read (closest: "")
  - label "3" not read (closest: "")
  - label "4" not read (closest: "")
  - label "5" not read (closest: "")
  - label "6" not read (closest: "")
- bio-eye-01: labels 18/19; regions named 1/7; relations matched 0/3
  - label "Ciliary body" not read (closest: "Ciliary bodly")
- bio-eye-02: labels 11/13; regions named 0/4; relations matched 0/3
  - label "Iris" not read (closest: "Sclera")
  - label "Optic nerve" not read (closest: "nerve")
- bio-flower-01: labels 13/17; regions named 1/6; relations matched 0/5
  - label "anther" not read (closest: "Mature flower")
  - label "sepal/calyx" not read (closest: "petal/corolla sepal/calyx perianth")
  - label "perianth" not read (closest: "petal/corolla sepal/calyx perianth")
  - label "filament" not read (closest: "microsporangium filament")
- bio-flower-02: regions named 0/4; relations matched 0/4
- bio-heart-01: labels 9/14; regions named 1/4; relations matched 0/4
  - label "Pulmonary Artery" not read (closest: "Pulmonary Art")
  - label "Left Atrium" not read (closest: "Right trium")
  - label "Left Ventricle" not read (closest: "Left")
  - label "Right Ventricle" not read (closest: "Right trium")
  - label "Pericardium" not read (closest: "Superior Vena Cava")
- bio-heart-02: relations matched 2/4
- bio-neuron-01: labels 25/29; regions named 0/6; relations matched 0/3
  - label "Neurotransmitter" not read (closest: "Microtubule Neurofibrils Neurotransmitter Receptor")
  - label "Mitochondrion" not read (closest: "Microtubule Neurofibrils Neurotransmitter Receptor")
  - label "Synaptic vesicles" not read (closest: "Synaptic vesicles Synapse Synaptic cleft ING Vaxonal")
  - label "Axon hillock" not read (closest: "hillock")
- bio-plantcell-01: labels 19/22; regions named 2/6; relations matched 0/3
  - label "Small membranous vesicles" not read (closest: "Small membranous")
  - label "Thylakoid membrane" not read (closest: "Chloroplast Thylakoid membrane")
  - label "Mitochondrion (mitochondria)" not read (closest: "Tonoplast Mitochondrion (mitochondria)")
- bio-plantcell-02: labels 5/8; regions named 4/9; relations matched 0/2
  - label "Nucleolus" not read (closest: "Cell wall")
  - label "Mitochondrion" not read (closest: "Cell wall")
  - label "Chloroplast" not read (closest: "Chloroplast")
- bio-respiratory-01: labels 32/48; regions named 0/7; relations matched 0/3
  - label "Sphenoid" not read (closest: "Paranasal sinuses Frontal Sphenoid")
  - label "Nasal cavity" not read (closest: "Nose Nasal cavity Nasal conchae Nasal vestibule")
  - label "Nasal conchae" not read (closest: "Nose Nasal cavity Nasal conchae Nasal vestibule")
  - label "Nasal vestibule" not read (closest: "Nose Nasal cavity Nasal conchae Nasal vestibule")
  - label "Larynx" not read (closest: "Pharynx Larynx Epiglottis Thyroid cartilage Cricoid cartilage")
  - label "Epiglottis" not read (closest: "Pharynx Larynx Epiglottis Thyroid cartilage Cricoid cartilage")
  - label "Thyroid cartilage" not read (closest: "Pharynx Larynx Epiglottis Thyroid cartilage Cricoid cartilage")
  - label "Cricoid cartilage" not read (closest: "Pharynx Larynx Epiglottis Thyroid cartilage Cricoid cartilage")
  - label "Carina of trachea" not read (closest: "Carina of trachea")
  - label "Esophagus" not read (closest: "Capilllary beds")
  - label "Oral cavity" not read (closest: "Nose Nasal cavity Nasal conchae Nasal vestibule")
  - label "Main bronchi" not read (closest: "bronchi")
  - label "Cardiac notch" not read (closest: "Oblique fissure Cardiac notch Lingula of lung Inferior lobe")
  - label "Lingula of lung" not read (closest: "Oblique fissure Cardiac notch Lingula of lung Inferior lobe")
  - label "Alveolar sacs" not read (closest: "Alveolar")
  - label "Pulmonary vein" not read (closest: "Pulmonary artery Pulmonary vein")
- chem-distillation-01: labels 0/16; regions named 0/6; relations matched 0/3; validator findings 1
  - label "1" not read (closest: "Sf SS")
  - label "2" not read (closest: "Sf SS")
  - label "3" not read (closest: "Sf SS")
  - label "4" not read (closest: "Sf SS")
  - label "5" not read (closest: "Sf SS")
  - label "6" not read (closest: "Sf SS")
  - label "7" not read (closest: "Sf SS")
  - label "8" not read (closest: "Sf SS")
  - label "9" not read (closest: "Sf SS")
  - label "10" not read (closest: "Sf SS")
  - label "11" not read (closest: "Sf SS")
  - label "12" not read (closest: "Sf SS")
  - label "13" not read (closest: "Sf SS")
  - label "14" not read (closest: "Sf SS")
  - label "15" not read (closest: "Sf SS")
  - label "16" not read (closest: "Sf SS")
  - validator K1: braille key (13 entries in 2 columns) needs 17 mm more sheet
- geo-tectonic-01: labels 4/18; relations matched 0/3
  - label "NORTH AMERICAN PLATE" not read (closest: "of AMERICAN")
  - label "JUAN DE FUCA PLATE" not read (closest: "JUAN DE")
  - label "PHILIPPINE PLATE" not read (closest: "PLATE")
  - label "COCOS PLATE" not read (closest: "PLATE")
  - label "ARABIAN PLATE" not read (closest: "PLATE")
  - label "INDIAN PLATE" not read (closest: "PLATE")
  - label "AFRICAN PLATE" not read (closest: "of AMERICAN")
  - label "SOUTH AMERICAN PLATE" not read (closest: "of AMERICAN")
  - label "NAZCA PLATE" not read (closest: "PLATE")
  - label "PACIFIC PLATE" not read (closest: "PLATE")
  - label "SCOTIA PLATE" not read (closest: "PLATE")
  - label "AUSTRALIAN PLATE" not read (closest: "AUSTRALIAN PLATE")
  - label "ANTARCTIC PLATE" not read (closest: "PLATE")
  - label "EURASIAN PLATE" not read (closest: "EURASIAN PLATE")
- geo-watercycle-01: labels 13/24; regions named 0/4; relations matched 0/3
  - label "The Water Cycle" not read (closest: "The")
  - label "Ice and snow" not read (closest: "Ice and")
  - label "Fog drip" not read (closest: "The")
  - label "Surface runoff" not read (closest: "Surface")
  - label "Snowmelt runoff" not read (closest: "The")
  - label "Infiltration" not read (closest: "The")
  - label "Streamflow" not read (closest: "The")
  - label "Seepage" not read (closest: "The")
  - label "Plant uptake" not read (closest: "The")
  - label "Freshwater" not read (closest: "The")
  - label "Groundwater flow" not read (closest: "flow")
- geo-watercycle-02: labels 9/19; regions named 1/4; relations matched 0/4
  - label "SEA ICE" not read (closest: "CLOUDS")
  - label "TRANSPORT" not read (closest: "CLOUDS")
  - label "SNOW, GLACIERS and ICE SHEETS" not read (closest: "SNOW GLACIERS and ICESHEETS")
  - label "PRECIPITATION" not read (closest: "PRECIPITATION")
  - label "EVAPOTRANSPIRATION" not read (closest: "CLOUDS")
  - label "SURFACE RUNOFF" not read (closest: "SURFACE")
  - label "RIVERS and LAKES" not read (closest: "RIVERS and")
  - label "PERCOLATION" not read (closest: "CLOUDS")
  - label "RIVER DISCHARGE" not read (closest: "RIVERS and")
  - label "GROUND-WATER FLOW" not read (closest: "CLOUDS and WATER VAPOR")
- math-keplertriangle-01: labels 0/15; regions named 0/2; relations matched 0/2
  - label "√φ^(-10) ≈ .090" not read (closest: "VoA(-10)")
  - label "√φ^(-8) ≈ .145" not read (closest: "VoA(-10)")
  - label "√φ^(-9) ≈ .114" not read (closest: "VoA(-10)")
  - label "√φ^(-7) ≈ .185" not read (closest: "VoA(-10)")
  - label "√φ^(-6) ≈ .236" not read (closest: "VoA(-10)")
  - label "√φ^(-5) ≈ .300" not read (closest: "VoA(-10)")
  - label "√φ^(-4) ≈ .381" not read (closest: "VoA(-10)")
  - label "√φ^(-3) ≈ .485" not read (closest: "VoA(-10)")
  - label "√φ^(-3) ≈ .485" not read (closest: "VoA(-10)")
  - label "√φ^(-2) ≈ .618" not read (closest: "VoA(-10)")
  - label "√φ^(-2) ≈ .618" not read (closest: "VoA(-10)")
  - label "√φ^(-1) ≈ .786" not read (closest: "VoA(-10)")
  - label "√φ^(0) =1." not read (closest: "VoA(-10)")
  - label "√φ^(1) ≈1.272" not read (closest: "VoA(-10)")
  - label "√φ^(2) ≈1.618" not read (closest: "VoA(-10)")
- math-parallelogram-01: labels 0/4; regions named 0/2; relations matched 0/2
  - label "a" not read (closest: "")
  - label "b" not read (closest: "")
  - label "h" not read (closest: "")
  - label "γ" not read (closest: "")
- math-triangleproof-01: labels 0/8; regions named 0/3; relations matched 0/3
  - label "A" not read (closest: "")
  - label "B" not read (closest: "")
  - label "C" not read (closest: "")
  - label "D" not read (closest: "")
  - label "E" not read (closest: "")
  - label "F" not read (closest: "")
  - label "A (D)" not read (closest: "")
  - label "C (F)" not read (closest: "")
- phy-circuit-schematic-01: labels 5/16; regions named 4/6; relations matched 0/3
  - label "1" not read (closest: "AMMETER")
  - label "A" not read (closest: "AMMETER")
  - label "I=4 AMPERES" not read (closest: "AMPERES")
  - label "R=3 OHMS" not read (closest: "OHMS")
  - label "+" not read (closest: "AMMETER")
  - label "V" not read (closest: "AMMETER")
  - label "-" not read (closest: "AMMETER")
  - label "E=12 VOLTS" not read (closest: "VOLTS")
  - label "2" not read (closest: "AMMETER")
  - label "SCHEMATIC OF CIRCUIT" not read (closest: "PICTORIAL DIAGRAM OF CIRCUIT")
  - label "Figure 48. Diagram of a basic electric circuit." not read (closest: "PICTORIAL DIAGRAM OF CIRCUIT")
- phy-pulley-01: labels 0/6; regions named 0/3; relations matched 0/3; validator findings 1
  - label "F_N" not read (closest: "FAF")
  - label "F + ΔF" not read (closest: "FAF")
  - label "β" not read (closest: "FAF")
  - label "F" not read (closest: "FAF")
  - label "d" not read (closest: "FAF")
  - label "D" not read (closest: "FAF")
  - validator K1: braille key (14 entries in 2 columns) needs 1 mm more sheet

## 4. Teacher corrections and the eyes-closed test

Teacher corrections are not yet recorded in `benchmark/CORRECTIONS.md`. The real-phone eyes-closed usability test has not been run; `benchmark/USABILITY.md` contains the protocol and blank recording sheets, not observations.
