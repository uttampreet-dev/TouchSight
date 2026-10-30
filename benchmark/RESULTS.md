# Understand stage — label recall on the benchmark set

Measured by `app/scripts/run-understand.mjs` (headless Chromium, production build, no network) and scored by `app/scripts/score.mjs`
against `benchmark/truth/*.json`. A label counts as read when every word matches within one dropped or misread character.

| Figure | Difficulty | Labels read | Spurious | Regions found | Strokes | Time |
|---|---|---|---|---|---|---|
| bio-plantcell-02 | undefined | 6/8 (75%) | 1 | 9 | 181 | 829 ms |

Mean label recall: **75%** over 1 figures. Clean line-art and flat-colour figures: 0/1 at or above 85%.

## Known failures
- bio-plantcell-02: "Nucleolus" not read (closest: "Cell wall")
- bio-plantcell-02: "Mitochondrion" not read (closest: "Cell wall")
