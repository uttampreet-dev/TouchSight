/** Textbook figures shipped with the console, so the whole compile can be seen without a photo in hand. Served from /samples. */
export interface Figure { file: string; title: string; short: string; chapter: string; note: string }

export const FIGURES: Figure[] = [
  { file: 'bio-heart-02.png', title: 'The human heart', short: 'Heart', chapter: 'Biology · Class 10 · Life processes', note: '9 labels' },
  { file: 'bio-plantcell-02.png', title: 'A plant cell', short: 'Plant cell', chapter: 'Biology · Class 9 · The fundamental unit of life', note: '8 labels' },
  { file: 'phy-circuit-schematic-01.png', title: 'A basic electric circuit', short: 'Circuit', chapter: 'Physics · Class 10 · Electricity', note: '16 labels' },
  { file: 'bio-neuron-01.png', title: 'A neuron', short: 'Neuron', chapter: 'Biology · Class 10 · Control and coordination', note: '29 labels' },
  { file: 'geo-tectonic-01.png', title: 'Tectonic plates', short: 'Plates', chapter: 'Geography · Class 9 · The Earth', note: '18 labels' },
]

export const figureByFile = (file: string) => FIGURES.find((f) => f.file === file || f.file.replace(/\.[^.]+$/, '') === file)

/** The figure as a File, exactly as if it had been dropped on the console. */
export async function loadFigure(f: Figure): Promise<File> {
  const res = await fetch(`/samples/${f.file}`)
  if (!res.ok) throw new Error(`sample ${f.file}: ${res.status}`)
  const blob = await res.blob()
  return new File([blob], f.file, { type: blob.type || 'image/png' })
}
