import type cvNS from '@techstark/opencv-js'

export type CV = typeof cvNS

declare global {
  interface Window {
    cv?: unknown
  }
}

let cvp: Promise<CV> | null = null

/**
 * OpenCV.js (~10 MB) is served from this origin as a plain script and resolved from the global, because the
 * bundler's module wrapper turns its Promise export into an empty object. Loaded once, lazily.
 */
export function loadCv(): Promise<CV> {
  if (!cvp) {
    cvp = new Promise<CV>((resolve, reject) => {
      const settle = () => {
        const g = window.cv as (CV & { onRuntimeInitialized?: () => void; then?: unknown }) | undefined
        if (!g) return reject(new Error('OpenCV global missing after script load'))
        if (typeof g.then === 'function') return (g as unknown as Promise<CV>).then(resolve, reject)
        if ((g as { Mat?: unknown }).Mat) return resolve(g)
        g.onRuntimeInitialized = () => resolve(g)
      }
      if (window.cv) return settle()
      const s = document.createElement('script')
      s.src = '/vendor/opencv.js'
      s.async = true
      s.onload = settle
      s.onerror = () => reject(new Error('failed to load /vendor/opencv.js'))
      document.head.appendChild(s)
    })
  }
  return cvp
}
