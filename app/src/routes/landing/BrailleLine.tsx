import { useEffect, useState } from 'react'
import { BrailleCells } from '../../components/BrailleCells'
import { toBraille } from '../../student/braille'

/** A heading's braille, from the same translator the key uses, drawn as dot cells under the print. */
export function BrailleLine({ text, max = 34, scale = 0.95, className = '' }: { text: string; max?: number; scale?: number; className?: string }) {
  const [cells, setCells] = useState<string | null>(null)
  useEffect(() => { let alive = true; toBraille(text, 'en').then((b) => { if (alive) setCells(b) }); return () => { alive = false } }, [text])
  if (!cells) return <span className={`ld-brl ${className}`} aria-hidden />
  return <span className={`ld-brl ${className}`} aria-hidden title={cells}><BrailleCells text={cells} ink="currentColor" guide="rgba(16,41,43,.10)" scale={scale} max={max} /></span>
}

/** A count that runs up when it scrolls into view. */
export function Count({ to, decimals = 0, suffix = '', duration = 1400 }: { to: number; decimals?: number; suffix?: string; duration?: number }) {
  const [v, setV] = useState(0)
  const [el, setEl] = useState<HTMLElement | null>(null)
  useEffect(() => {
    if (!el) return
    let raf = 0
    const run = () => { const t0 = performance.now(); const tick = () => { const k = Math.min(1, (performance.now() - t0) / duration); setV(to * (1 - Math.pow(1 - k, 3))); if (k < 1) raf = requestAnimationFrame(tick) }; raf = requestAnimationFrame(tick) }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) { setV(to); return }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { run(); io.disconnect() } }, { threshold: 0.4 })
    io.observe(el)
    const t = window.setTimeout(() => { setV(to); io.disconnect() }, 7000)
    return () => { io.disconnect(); cancelAnimationFrame(raf); clearTimeout(t) }
  }, [el, to, duration])
  return <span ref={setEl} className="ld-num">{v.toFixed(decimals)}{suffix}</span>
}
