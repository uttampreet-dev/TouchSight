import { useEffect } from 'react'

/** Adds .in to every [data-rv] once it enters the viewport; a failsafe shows everything after 2 s in case observers never fire. */
export function useReveal(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current
    if (!el) return
    const items = Array.from(el.querySelectorAll<HTMLElement>('[data-rv]'))
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) { items.forEach((i) => i.classList.add('in')); return }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { (e.target as HTMLElement).classList.add('in'); io.unobserve(e.target) } }), { rootMargin: '0px 0px -12% 0px', threshold: 0.08 })
    items.forEach((i) => io.observe(i))
    const t = window.setTimeout(() => items.forEach((i) => i.classList.add('in')), 6000)
    return () => { io.disconnect(); clearTimeout(t) }
  }, [root])
}

/** Which section is in view, for the braille index. */
export function useActiveSection(ids: string[], set: (id: string) => void) {
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    const io = new IntersectionObserver((es) => { const hit = es.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]; if (hit) set(hit.target.id) }, { rootMargin: '-35% 0px -45% 0px', threshold: [0, 0.2, 0.5] })
    ids.forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el) })
    return () => io.disconnect()
  }, [ids, set])
}
