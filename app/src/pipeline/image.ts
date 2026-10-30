/** Image loading and the pixel → millimetre mapping onto the sheet. */

export interface Prepared {
  image: ImageData
  canvas: HTMLCanvasElement
  width: number
  height: number
  /** original pixels per prepared pixel */
  downscale: number
}

export const MAX_SIDE = 1600

export async function loadImage(src: Blob | string): Promise<HTMLImageElement> {
  const url = typeof src === 'string' ? src : URL.createObjectURL(src)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return img
  } finally {
    if (typeof src !== 'string') setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }
}

export function prepare(img: HTMLImageElement): Prepared {
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.round(img.naturalWidth * scale)
  const h = Math.round(img.naturalHeight * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)
  return { image: ctx.getImageData(0, 0, w, h), canvas, width: w, height: h, downscale: 1 / scale }
}

export interface SheetFit {
  /** mm per prepared pixel */
  mmPerPx: number
  /** mm offset of the image's top-left on the sheet */
  ox: number
  oy: number
}

/** Fit the diagram inside the sheet margins, leaving room for the braille key below. */
export function fitToSheet(width: number, height: number, sheet: { w: number; h: number; margin: number }, keyHeightMm = 60): SheetFit {
  const availW = sheet.w - 2 * sheet.margin
  const availH = sheet.h - 2 * sheet.margin - keyHeightMm
  const mmPerPx = Math.min(availW / width, availH / height)
  const ox = sheet.margin + (availW - width * mmPerPx) / 2
  const oy = sheet.margin
  return { mmPerPx, ox, oy }
}

export const toMm = (fit: SheetFit, p: [number, number]): [number, number] => [
  +(fit.ox + p[0] * fit.mmPerPx).toFixed(2),
  +(fit.oy + p[1] * fit.mmPerPx).toFixed(2),
]
