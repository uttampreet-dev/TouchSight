import { useEffect, useRef, useState } from 'react'
import { TdmCanvas } from '../../components/TdmCanvas'
import type { Tdm } from '../../tdm/types'

/**
 * The tactile sheet as a relief: the plate, then the raised parts built from stacked copies of the same model, so the
 * walls read as real height. Idle, it turns slowly; under the pointer it follows the hand; on scroll-in it rises.
 */
const LAYERS = 7, STEP = 1.7

export function Relief3D({ tdm, highlight = [] }: { tdm: Tdm; highlight?: string[] }) {
  const host = useRef<HTMLDivElement>(null)
  const [rot, setRot] = useState<{ x: number; y: number }>({ x: 16, y: -12 })
  const [up, setUp] = useState(false)
  const hand = useRef<{ at: number; x: number; y: number }>({ at: -1e9, x: 0, y: 0 })

  useEffect(() => {
    const el = host.current
    if (!el) return
    if (!('IntersectionObserver' in window)) { setUp(true); return }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setUp(true); io.disconnect() } }, { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const t0 = performance.now()
    const tick = () => {
      const now = performance.now()
      if (now - hand.current.at < 120) setRot({ x: hand.current.x, y: hand.current.y })
      else { const t = (now - t0) / 1000; setRot({ x: 16 + Math.sin(t * 0.55) * 5, y: -12 + Math.sin(t * 0.38) * 14 }) }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const onMove = (e: React.PointerEvent) => {
    const r = host.current!.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height
    hand.current = { at: performance.now(), x: (0.5 - py) * 34 + 6, y: (px - 0.5) * 44 }
  }

  return (
    <div className={`r3 ${up ? 'up' : ''}`} ref={host} onPointerMove={onMove}>
      <div className="r3-stage" style={{ transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)` }}>
        <div className="r3-shadow" />
        <div className="r3-plate" />
        {Array.from({ length: LAYERS }, (_, i) => (
          <div key={i} className={`r3-layer ${i === LAYERS - 1 ? 'top' : 'wall'}`} style={{ ['--z' as string]: `${(i + 1) * STEP}px` }}>
            <TdmCanvas tdm={tdm} showRefs={i === LAYERS - 1} paper="transparent" ink={i === LAYERS - 1 ? '#10292b' : '#2a4648'} highlight={i === LAYERS - 1 ? highlight : []} accent="#e2573f" />
          </div>
        ))}
        <div className="r3-label mono" style={{ ['--z' as string]: `${(LAYERS + 2) * STEP}px` }}>2 mm plate · 1 mm walls · braille 0.5 mm domes</div>
      </div>
    </div>
  )
}
