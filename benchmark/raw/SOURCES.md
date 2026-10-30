# Benchmark image provenance

The current corpus has 25 figures: the eight original development figures and 17 newly sourced public-domain or CC0 diagrams. **It is not an NCERT-only corpus**; no result from it should be presented as NCERT performance. The source and licence for each figure are recorded below. CC0 is identified as CC0, not relabelled as a public-domain work.

## Original development figures

| File | Source | Author | Licence |
|---|---|---|---|
| bio-heart-01.png | [Diagram of the human heart (cropped).svg](https://commons.wikimedia.org/wiki/File:Diagram_of_the_human_heart_(cropped).svg) | Wapcaplet | CC BY-SA 3.0 |
| bio-plantcell-01.png | [Plant cell structure-en.svg](https://commons.wikimedia.org/wiki/File:Plant_cell_structure-en.svg) | LadyofHats | Public domain |
| geo-watercycle-01.jpg | [Watercyclesummary.jpg](https://commons.wikimedia.org/wiki/File:Watercyclesummary.jpg) | John Evans, Howard Perlman (USGS) | Public domain |
| bio-digestive-01.png | [Digestive system diagram en.svg](https://commons.wikimedia.org/wiki/File:Digestive_system_diagram_en.svg) | Mariana Ruiz, Jmarchn | Public domain |
| bio-eye-01.png | [Schematic diagram of the human eye en.svg](https://commons.wikimedia.org/wiki/File:Schematic_diagram_of_the_human_eye_en.svg) | Rhcastilhos, Jmarchn | CC BY-SA 3.0 |
| bio-flower-01.png | [Mature flower diagram.svg](https://commons.wikimedia.org/wiki/File:Mature_flower_diagram.svg) | Mariana Ruiz (LadyofHats) | Public domain |
| bio-heart-02.png | Synthetic clean line-art heart drawn for the benchmark | — | — |
| bio-plantcell-02.png | Synthetic clean line-art plant cell, `benchmark/scripts/draw-plantcell-02.py` | — | — |

## Newly sourced public-domain and CC0 figures

| File | Source | Author / creator | Licence |
|---|---|---|---|
| bio-respiratory-01.png | [Respiratory system complete en.svg](https://commons.wikimedia.org/wiki/File:Respiratory_system_complete_en.svg) | LadyofHats, Jmarchn | Public domain |
| bio-eye-02.jpg | [Diagram of an eye (GN04130).jpg](https://commons.wikimedia.org/wiki/File:Diagram_of_an_eye(GN04130).jpg), cropped to the labelled figure | South Australian government photographer | CC0 |
| bio-flower-02.png | [Flower Anatomy (PSF).png](https://commons.wikimedia.org/wiki/File:Flower_Anatomy_(PSF).png) | Pearson Scott Foresman | Public domain |
| bio-digestive-02.png | [Digestive system diagram en.svg](https://commons.wikimedia.org/wiki/File:Digestive_system_diagram_en.svg) | Mariana Ruiz, Jmarchn | Public domain |
| bio-cellcycle-01.png | [Animal cell cycle-en.svg](https://commons.wikimedia.org/wiki/File:Animal_cell_cycle-en.svg) | Kelvinsong | CC0 |
| bio-neuron-01.png | [Complete neuron cell diagram en.svg](https://commons.wikimedia.org/wiki/File:Complete_neuron_cell_diagram_en.svg) | LadyofHats | Public domain |
| bio-dna-01.png | [DNA structure formula numbered.svg](https://commons.wikimedia.org/wiki/File:DNA_structure_formula_numbered.svg) | William Crochot; SVG by Medium69 | Public domain |
| geo-tectonic-01.png | [Tectonic plates.png](https://commons.wikimedia.org/wiki/File:Tectonic_plates.png) | Map by Muriel Gottrop | Public domain |
| geo-watercycle-02.png | [The Water Cycle (SVS30580).png](https://commons.wikimedia.org/wiki/File:The_Water_Cycle_(SVS30580).png) | NASA Scientific Visualization Studio | Public domain |
| astro-solarsystem-01.png | [Solar System graphic by NASA.png](https://commons.wikimedia.org/wiki/File:Solar_System_graphic_by_NASA.png) | NASA | Public domain |
| chem-distillation-01.png | [Simple distillation apparatus.svg](https://commons.wikimedia.org/wiki/File:Simple_distillation_apparatus.svg) | Original PNG by Quantockgoblin; SVG adaptation by Slashme | Public domain |
| math-parallelogram-01.png | [Parallelogram-triangle-area.svg](https://commons.wikimedia.org/wiki/File:Parallelogram-triangle-area.svg) | MartinThoma | CC0 |
| math-triangleproof-01.png | [Diagram of proof of congruence condition of right triangle.svg](https://commons.wikimedia.org/wiki/File:Diagram_of_proof_of_congruence_condition_of_right_triangle.svg) | See Commons file page | CC0 |
| phy-pulley-01.png | [Pulley11-2.svg](https://commons.wikimedia.org/wiki/File:Pulley11-2.svg) | Derivative by Gauner 1 from Pulley11.svg by Mpfiz | Public domain |
| bio-brain-fr-01.png | [Brain diagram fr.svg](https://commons.wikimedia.org/wiki/File:Brain_diagram_fr.svg) | Mysid; French translation by JDifool | Public domain |
| phy-circuit-schematic-01.png | [Circuit diagram – pictorial and schematic.png](https://commons.wikimedia.org/wiki/File:Circuit_diagram_%E2%80%93_pictorial_and_schematic.png) | United States Department of the Air Force | Public domain |
| math-keplertriangle-01.png | [Kepler triangle labeled in terms of sqrt(phi).svg](https://commons.wikimedia.org/wiki/File:Kepler_triangle_labeled_in_terms_of_sqrt(phi).svg) | Croppy Peace Sign | CC0 |

## Accessibility and preparation

The sourced originals are raster images in `benchmark/raw/`; ARIA attributes cannot be attached to a standalone JPEG or PNG. The companion [accessible image catalog](../accessibility/index.html) wraps each newly sourced image in HTML with a descriptive `alt` and explicit `aria-label`. Those descriptions are added by this project and are **not claimed to be source-authored ARIA metadata**. The Commons source pages were used to verify licence and attribution; original SVG ARIA metadata was not used as a selection criterion.

Transparent SVG thumbnails were composited onto white for legible raster labels. The solar-system graphic intentionally keeps its black background. The horse-eye image is a crop of the CC0 source page. Image derivatives preserve their source file's listed licence; check the linked Commons page for full terms and attribution requirements before redistribution.

Each figure has a matching file in `../truth/`. Transcribe printed labels exactly and keep `labelsPrinted` equal to `labels.length`. The truth records describe the diagram actually shown; they do not imply that it came from a textbook.
