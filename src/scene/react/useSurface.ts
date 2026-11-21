import { useEffect, useRef } from 'react'
import { animates, makeLoop } from '../compose/loop'
import { settleEnd } from '../model/anim'
import { paintSliced } from '../compose/schedule'
import { makeStats, type SceneStats } from '../compose/stats'
import { Surface } from '../compose/surface'
import { paintWorker, warmPaintWorkers } from '../compose/worker'
import type { LayerDesc } from '../model/types'

/** The page's scene timings (`compose/stats.ts`), left on `window.__sceneStats` for the perf runner and the HUD. */
export const SCENE_STATS: SceneStats = makeStats()
if (typeof window !== 'undefined') (window as Window & { __sceneStats?: SceneStats }).__sceneStats = SCENE_STATS

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  || Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData)

/**
 * The scene's one animation clock (C8): every loop's phase runs from here (`performance.now()` when the scene's code
 * loaded, the frame callback's timeline), so a motion carries on through a new model, and the land's clock
 * (`useLandClock`) names its moments as phases of it.
 */
export const SCENE_EPOCH = typeof performance === 'undefined' ? 0 : performance.now()

/** The scene clock's phase now (s). */
export const scenePhase = () => (performance.now() - SCENE_EPOCH) / 1000

/**
 * The scene harness lays its stills itself (a frame at a given phase, `window.__sceneStill`): no loop then, not even the
 * arrival's settling one under reduced motion, which would lay its own phase over the still.
 */
const harnessStill = () => typeof window !== 'undefined' && (window as Window & { __sceneStill?: boolean }).__sceneStill === true

/** `?paint=main` keeps the painting on the main thread (to compare; the perf runner's `--paint=main`). */
const offThread = () => typeof location === 'undefined' || new URLSearchParams(location.search).get('paint') !== 'main'

// The sky's, the land's and the wear card's workers start as the scene's code loads, so their script is in by the time the
// first world is built (a worker started with its surface took ~100 ms more to show the first layer, CPU ×4).
if (typeof window !== 'undefined' && offThread()) warmPaintWorkers(3)

export interface SurfaceSize { width: number; height: number; dpr: number }

/**
 * A visible canvas and its compositor (§1e). With the paint worker (where the browser has one) every layer is painted
 * there: a cold start asks for them all at once and lays each batch as it arrives, a scrub frame asks for the stale light
 * and lays what it has. Without it a cold start paints the layers sliced across frames (sky first, ≤ 8 ms each), and a
 * change of model (a scrub frame) repaints what is stale in one synchronous frame. Animated layers run the one loop
 * while the page is visible. `onReady` fires once every layer is painted and composited.
 *
 * Timings (`SCENE_STATS`): `firstPaint.<name>` is the main thread's time for the cold start (its slices; with the
 * worker, asking and laying the arrivals), `firstShown.<name>` the time until every layer shows, `arrive.<name>` and
 * `latency.<name>` each batch's laying and wait.
 */
export function useSurface(name: string, layers: readonly LayerDesc[], size: SurfaceSize, onReady?: () => void,
  onLaid?: (phase: number, still: boolean, canvas: HTMLCanvasElement) => void) {
  const ref = useRef<HTMLCanvasElement>(null)
  const surfaceRef = useRef<Surface | null>(null)
  const ready = useRef(onReady)
  /** The main thread's time laying the worker's arrivals since the last cold start. */
  const arrived = useRef(0)
  const laid = useRef(onLaid)
  useEffect(() => { ready.current = onReady }, [onReady])
  useEffect(() => { laid.current = onLaid }, [onLaid])
  const { width, height, dpr } = size

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || width <= 0 || height <= 0) return
    const surface = (surfaceRef.current ??= new Surface(canvas, { stats: SCENE_STATS, worker: offThread() ? paintWorker : undefined,
      onArrive: ({ ms, latency, workerMs }) => {
        SCENE_STATS.record(`worker.${name}`, workerMs)
        arrived.current += ms
        SCENE_STATS.record(`arrive.${name}`, ms)
        SCENE_STATS.record(`latency.${name}`, latency)
        SCENE_STATS.memory[name] = surface.bytes()
      } }))
    surface.resize(width, height, dpr)
    surface.still = reducedMotion()
    const phase = harnessStill() ? 0 : scenePhase()
    const done = () => {
      SCENE_STATS.memory[name] = surface.bytes()
      ready.current?.()
    }
    let cancel = () => {}
    const cold = layers.some((layer) => !surface.peek(layer.id))
    if (cold && surface.remote) {
      let live = true
      const start = performance.now()
      arrived.current = 0
      SCENE_STATS.time(`ask.${name}`, () => surface.render(layers, phase))
      const asked = performance.now() - start
      void surface.settled().then(() => {
        if (!live) return
        SCENE_STATS.record(`firstPaint.${name}`, asked + arrived.current)
        SCENE_STATS.record(`firstShown.${name}`, performance.now() - start)
        done()
      })
      cancel = () => { live = false }
    } else if (cold) {
      const slicer = paintSliced([{ surface, layers }], { frame: (cb) => requestAnimationFrame(cb), cancelFrame: (id) => cancelAnimationFrame(id),
        now: () => performance.now(), phase, onSlice: (ms) => SCENE_STATS.record(`slice.${name}`, ms) })
      slicer.done.then((report) => {
        SCENE_STATS.record(`firstPaint.${name}`, report.totalMs)
        done()
      })
      cancel = slicer.cancel
    } else {
      SCENE_STATS.time(`frame.${name}`, () => surface.render(layers, phase))
      done()
    }
    laid.current?.(phase, surface.still, canvas)
    if (!animates(layers) || harnessStill()) return cancel
    const loop = makeLoop((phase, still) => {
      SCENE_STATS.time(`anim.${name}`, () => surface.render(layers, phase, still))
      laid.current?.(phase, still, canvas)
    }, {
      frame: (cb) => requestAnimationFrame(cb), cancelFrame: (id) => cancelAnimationFrame(id),
      visible: () => document.visibilityState === 'visible', still: reducedMotion }, 30, settleEnd(layers.map((layer) => layer.animated)),
    SCENE_EPOCH)
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
