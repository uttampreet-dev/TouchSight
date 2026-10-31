# Standalone TDM exports

Each CLI validates the complete TDM v0.1 document before generating output. It does not import the app or
pipeline, interpret source paths, or fetch URLs from the TDM. Input is limited to 2 MB, 100 regions, 200 lines,
500 relations, 10,000 coordinate pairs, and bounded text and geometry. Generated files stay in the invoking
package's `out/` directory, with a 50 MB output ceiling.

From the repository root:

```bash
npm install
npm run export:svg examples/bio-heart-01.tdm.json
npm run export:stl examples/bio-heart-01.tdm.json
npm run export:braille examples/bio-heart-01.tdm.json
npm run export:alt-text examples/bio-heart-01.tdm.json
npm run test:exports
```

The SVG is an A4, true-millimetre file. STL uses Three.js `ExtrudeGeometry` and `STLExporter`. Braille uses
the available liblouis Node build with UEB Grade 1 and the bundled Bharati Hindi and Punjabi tables; this
published Node binding is asm.js, not WebAssembly. The CLI
writes a TDM copy with filled braille fields and a BRF key. Alt-text follows reading order and then describes
relations. Package output directories are generated artifacts and are git-ignored.

SVG renders braille dots from supplied fields, or translates the key text locally when those fields are empty.
The braille CLI is the separate operation that writes the filled braille fields back into a TDM copy.