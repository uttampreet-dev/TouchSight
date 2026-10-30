# Known limits (kept honest, goes on the limits slide)

- **This is not an NCERT benchmark.** The 25-figure set combines the eight original development figures with 17 Wikimedia Commons public-domain/CC0 diagrams. The results describe this development corpus only.
- **Semantic performance remains weak.** In the 25-figure run, mean label recall was 49%, mean region recall was 20%, and only 2 of 83 truth relations matched automatically. The complete figure-by-figure failures are in `RESULTS.md`.
- **Dense or small printed text merges into OCR groups.** For example, the new cell-cycle diagram read 30/45 labels and the respiratory diagram read 32/48. A grouped OCR result counts for at most one printed-label instance; this prevents repeated labels from inflating recall but can expose OCR grouping misses.
- **Symbolic and numeric labels are not reliably recognized.** The DNA formula (0/6), distillation apparatus (0/16), parallelogram (0/4), triangle proof (0/8), Kepler triangle (0/15), and ball-bearing figure (0/6) all had zero label recall in this run.
- **Non-English labels are not supported reliably.** The French brain diagram returned 0/6 labels. Its English accessible description is a project-authored aid, not a translation of the printed labels.
- **Region segmentation is the weakest measured stage.** Only 20% mean region recall across the corpus; the detector often follows enclosed color/white pockets rather than anatomical or geographic entities. In the new flower diagram it named 0/4 regions despite reading all four printed labels.
- **Relations remain advisory and seldom match the truth.** They are proposed from stroke adjacency and need teacher confirmation; the automated name-pair check matched only 2/83 truth relations.
- **Geometry is not universally clean.** The latest run was geometry-clean on 23/25 figures. The distillation and ball-bearing figures each had a K1 finding; R3 relations remain teacher-review stops.
- **Exports succeeded on 25/25 figures**, but a successful export is not evidence that the exported content is semantically correct or usable by a student.
- **ARIA is provided through a project-authored HTML catalog.** PNG/JPEG files do not themselves carry ARIA; the catalog adds descriptive `alt` and `aria-label` attributes. These are not source-authored metadata.
- **Image preparation may alter visual appearance.** Transparent vector previews were composited onto white; the solar-system graphic keeps its original black background. The horse-eye image is cropped from a larger CC0 scan.
- **No real-phone eyes-closed trial has been run.** `USABILITY.md` contains only the protocol and blank sheets. No tester outcomes or seconds are claimed.
- **Teacher corrections are not recorded yet.** Record any corrected labels, regions, or relations in `CORRECTIONS.md` and rerun before claiming improved scores.
