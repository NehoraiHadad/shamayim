import { useEffect, useRef } from 'react'
import { animates, makeLoop } from '../compose/loop'
import { paintSliced } from '../compose/schedule'
import { makeStats, type SceneStats } from '../compose/stats'
import { Surface } from '../compose/surface'
import type { LayerDesc } from '../model/types'

/** The page's scene timings (`compose/stats.ts`), left on `window.__sceneStats` for the perf runner and the HUD. */
export const SCENE_STATS: SceneStats = makeStats()
if (typeof window !== 'undefined') (window as Window & { __sceneStats?: SceneStats }).__sceneStats = SCENE_STATS

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  || Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData)

export interface SurfaceSize { width: number; height: number; dpr: number }

/**
 * A visible canvas and its compositor (§1e). A cold start paints the layers sliced across frames (sky first, ≤ 8 ms
 * each); after that a change of model (a scrub frame) repaints what is stale in one synchronous frame. Animated layers
 * run the one loop while the page is visible. `onReady` fires once every layer is painted and composited.
 */
export function useSurface(name: string, layers: readonly LayerDesc[], size: SurfaceSize, onReady?: () => void) {
  const ref = useRef<HTMLCanvasElement>(null)
  const surfaceRef = useRef<Surface | null>(null)
  const ready = useRef(onReady)
  useEffect(() => { ready.current = onReady }, [onReady])
  const { width, height, dpr } = size

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || width <= 0 || height <= 0) return
    const surface = (surfaceRef.current ??= new Surface(canvas, { stats: SCENE_STATS }))
    surface.resize(width, height, dpr)
    const done = () => {
      SCENE_STATS.memory[name] = surface.bytes()
      ready.current?.()
    }
    let cancel = () => {}
    const cold = layers.some((layer) => !surface.cache.peek(layer.id))
    if (cold) {
      const slicer = paintSliced([{ surface, layers }], { frame: (cb) => requestAnimationFrame(cb), cancelFrame: cancelAnimationFrame,
        now: () => performance.now(), onSlice: (ms) => SCENE_STATS.record(`slice.${name}`, ms) })
      slicer.done.then((report) => {
        SCENE_STATS.record(`firstPaint.${name}`, report.totalMs)
        done()
      })
      cancel = slicer.cancel
    } else {
      SCENE_STATS.time(`frame.${name}`, () => surface.render(layers))
      done()
    }
    if (!animates(layers)) return cancel
    const loop = makeLoop((phase) => SCENE_STATS.time(`anim.${name}`, () => surface.render(layers, phase)), {
      frame: (cb) => requestAnimationFrame(cb), cancelFrame: cancelAnimationFrame,
      visible: () => document.visibilityState === 'visible', still: reducedMotion })
    loop.start()
    const onVisible = () => (document.visibilityState === 'visible' ? loop.start() : loop.stop())
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancel()
      loop.stop()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [name, layers, width, height, dpr])

  return { ref, surface: surfaceRef }
}
