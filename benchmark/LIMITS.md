# Known limits (kept honest, goes on the limits slide)

- **3-D shaded colour figures** (heart): in-figure labels drawn over gradients are read partially ("Right trium", "Left") — 64 % label recall. Teacher review fixes the rest.
- **Photo-realistic paintings at low resolution** (USGS water cycle, 729 px wide): text over imagery, 46 % recall. Out of scope for the first release; a scan at ≥1400 px helps.
- **Region shapes on complex line art** (digestive system): enclosed-area regions follow white pockets between organs, not the organs themselves. Simplify (Stage 3) and teacher split/merge are the mitigation; the figure count is right, the outlines are coarse.
- **Split words**: a long word can come back as two fragments ("Pulmonary Art" + "ery"); counted as a miss.
- **Naming regions on colour figures is the weak link (measured 2026-10-30: region recall 35 % across 8 figures, 100 % on clean line art).** Labels are read well (83 %) but tying a label to the right enclosed area fails when a label sits over a gradient, a leader line is broken, or the segmenter follows a white pocket instead of the organ. The teacher renames in the console; the count of such edits is logged in `CORRECTIONS.md`.
- **Relations are proposed from stroke adjacency only** (a stroke ending at two parts). They are often wrong (a septum stroke proposes "right ventricle connects left atrium"), which is why rule R3 blocks every one until a teacher confirms it. Automatic match against the truth files: 3 of 28.
- **Hand-drawn chalk on a blackboard** is not supported. Clean printed, photocopied or projected figures are the target.
