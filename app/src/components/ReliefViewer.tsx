import { useEffect, useRef, useState } from 'react'
import type { Tdm } from '../tdm/types'
import { exportStl } from '../export'

/**
 * The relief as the printer gets it: the STL the exporter writes, lit from a low angle so dots and ridges throw
 * shadows, turning slowly until the hand takes over. three.js loads only when this is on screen.
 */
export function ReliefViewer({ tdm, braille, className = '', autoRotate = true, caption = true }: { tdm: Tdm; braille?: Record<string, string>; className?: string; autoRotate?: boolean; caption?: boolean }) {
  const host = useRef<HTMLDivElement>(null)
  const [facts, setFacts] = useState<string>('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const el = host.current
    if (!el) return
    let alive = true, raf = 0, dispose = () => {}
    ;(async () => {
      const [THREE, { STLLoader }, { OrbitControls }] = await Promise.all([import('three'), import('three/examples/jsm/loaders/STLLoader.js'), import('three/examples/jsm/controls/OrbitControls.js')])
      if (!alive) return
      const { stl, facts: f } = exportStl(tdm, { braille })
      const geo = new STLLoader().parse(stl)
      geo.computeVertexNormals(); geo.computeBoundingBox()
      const bb = geo.boundingBox!
      const size = new THREE.Vector3(); bb.getSize(size)
      const centre = new THREE.Vector3(); bb.getCenter(centre)
      geo.translate(-centre.x, -centre.y, -bb.min.z)

      const scene = new THREE.Scene()
      const w = el.clientWidth || 600, h = el.clientHeight || 420
      const cam = new THREE.PerspectiveCamera(32, w / h, 1, 2000)
      const span = Math.max(size.x, size.y)
      cam.position.set(span * 0.55, -span * 0.95, span * 0.9); cam.up.set(0, 0, 1); cam.lookAt(0, 0, 0)
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.setSize(w, h); renderer.shadowMap.enabled = true
      el.appendChild(renderer.domElement)

      const mat = new THREE.MeshStandardMaterial({ color: 0xf6f2e9, roughness: 0.85, metalness: 0.0 })
      const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = true
      scene.add(mesh)
      const table = new THREE.Mesh(new THREE.PlaneGeometry(span * 4, span * 4), new THREE.ShadowMaterial({ opacity: 0.35 }))
      table.position.z = -0.01; table.receiveShadow = true; scene.add(table)
      scene.add(new THREE.AmbientLight(0xffffff, 0.55))
      const key = new THREE.DirectionalLight(0xfff4e0, 1.6); key.position.set(-span, -span * 0.4, span * 0.5); key.castShadow = true
      key.shadow.mapSize.set(2048, 2048); const sc = key.shadow.camera as unknown as { left: number; right: number; top: number; bottom: number }; sc.left = -span; sc.right = span; sc.top = span; sc.bottom = -span
      scene.add(key)
      const rim = new THREE.DirectionalLight(0x7fd4cb, 0.5); rim.position.set(span, span, span * 0.3); scene.add(rim)

      const controls = new OrbitControls(cam, renderer.domElement)
      controls.enableDamping = true; controls.autoRotate = autoRotate; controls.autoRotateSpeed = 1.2; controls.maxPolarAngle = Math.PI * 0.49; controls.minDistance = span * 0.5; controls.maxDistance = span * 3
      const onResize = () => { const w2 = el.clientWidth, h2 = el.clientHeight; if (!w2 || !h2) return; cam.aspect = w2 / h2; cam.updateProjectionMatrix(); renderer.setSize(w2, h2) }
      const ro = new ResizeObserver(onResize); ro.observe(el)
      const loop = () => { if (!alive) return; controls.update(); renderer.render(scene, cam); raf = requestAnimationFrame(loop) }
      loop()
      setFacts(`${f.bbox.w} × ${f.bbox.h} × ${f.bbox.d} mm · ${f.triangles.toLocaleString()} triangles · ${f.keyDomes} braille domes`)
      setReady(true)
      ;(window as unknown as { __tsRelief?: unknown }).__tsRelief = { triangles: f.triangles, size: [f.bbox.w, f.bbox.h, f.bbox.d] }
      dispose = () => { ro.disconnect(); controls.dispose(); renderer.dispose(); geo.dispose(); mat.dispose(); renderer.domElement.remove() }
    })().catch(() => setFacts('3-D preview unavailable here'))
    return () => { alive = false; cancelAnimationFrame(raf); dispose() }
  }, [tdm, braille, autoRotate])

  return (
    <div className={`rv ${ready ? 'ready' : ''} ${className}`}>
      <div className="rv-stage" ref={host} />
      {caption && <div className="rv-cap mono"><span>relief as it prints · drag to turn</span><span>{facts || 'building the relief…'}</span></div>}
    </div>
  )
}
