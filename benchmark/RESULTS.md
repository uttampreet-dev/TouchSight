# Understand stage — label recall on the benchmark set

Measured by `app/scripts/run-understand.mjs` (headless Chromium, production build, no network) and scored by `app/scripts/score.mjs`
against `benchmark/truth/*.json`. A label counts as read when every word matches within one dropped or misread character.

| Figure | Difficulty | Labels read | Spurious | Regions found | Strokes | Time |
|---|---|---|---|---|---|---|
| bio-digestive-01 | hard | 29/30 (97%) | 5 | 10 | 275 | 1948 ms |
| bio-eye-01 | medium | 18/19 (95%) | 4 | 6 | 290 | 1845 ms |
| bio-flower-01 | medium | 16/17 (94%) | 1 | 8 | 264 | 936 ms |
| bio-heart-01 | hard | 9/14 (64%) | 6 | 9 | 265 | 1446 ms |
| bio-heart-02 | easy | 9/9 (100%) | 0 | 5 | 184 | 712 ms |
| bio-plantcell-01 | medium | 21/22 (95%) | 4 | 10 | 269 | 1614 ms |
| bio-plantcell-02 | easy | 6/8 (75%) | 1 | 9 | 181 | 660 ms |
| geo-watercycle-01 | hard | 11/24 (46%) | 7 | 14 | 239 | 1759 ms |

Mean label recall: **83%** over 8 figures. Clean line-art and flat-colour figures: 5/8 at or above 85%.

## Known failures
- bio-digestive-01: "Jejunum" not read (closest: "Mouth")
- bio-eye-01: "Ciliary body" not read (closest: "Ciliary bodly")
- bio-flower-01: "anther" not read (closest: "Mature flower")
- bio-heart-01: "Pulmonary Artery" not read (closest: "Pulmonary Art")
- bio-heart-01: "Left Atrium" not read (closest: "Right trium")
- bio-heart-01: "Left Ventricle" not read (closest: "Left")
- bio-heart-01: "Right Ventricle" not read (closest: "Right trium")
- bio-heart-01: "Pericardium" not read (closest: "Superior Vena Cava")
- bio-plantcell-01: "Small membranous vesicles" not read (closest: "Small membranous")
- bio-plantcell-02: "Nucleolus" not read (closest: "Cell wall")
- bio-plantcell-02: "Mitochondrion" not read (closest: "Cell wall")
- geo-watercycle-01: "The Water Cycle" not read (closest: "The")
- geo-watercycle-01: "Ice and snow" not read (closest: "Ice and")
- geo-watercycle-01: "Fog drip" not read (closest: "The")
- geo-watercycle-01: "Surface runoff" not read (closest: "Surface")
- geo-watercycle-01: "Snowmelt runoff" not read (closest: "The")
- geo-watercycle-01: "Dew" not read (closest: "The")
- geo-watercycle-01: "Infiltration" not read (closest: "The")
- geo-watercycle-01: "Streamflow" not read (closest: "The")
- geo-watercycle-01: "Seepage" not read (closest: "The")
- geo-watercycle-01: "Spring" not read (closest: "The")
- geo-watercycle-01: "Plant uptake" not read (closest: "The")
- geo-watercycle-01: "Freshwater" not read (closest: "The")
- geo-watercycle-01: "Groundwater flow" not read (closest: "flow")
