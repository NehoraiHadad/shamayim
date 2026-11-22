import type { LayerDesc, LayerKind } from '../model/types'
import type { Surface } from './surface'

/** Cold-start order (§1d): sky, the planes, then the place and its marks, then clouds and weather. */
export const PRIORITY: Record<LayerKind, number> = {
  sky: 0, stars: 1, bodies: 1, loading: 2, plane: 2, water: 3, farCities: 3, outside: 4, marks: 4,
  clouds: 5, flash: 6, shimmer: 6, shafts: 6, fall: 6, mist: 6, grains: 6, rays: 6, smoke: 6, sheen: 6, edge: 6,
  // C10: the sky's life and optics last (small layers; a moment late costs nothing).
  milkyWay: 2, planets: 1, twinkle: 7, meteor: 7, bow: 6, contrail: 7, aircraft: 7, birds: 7,
  // The clothesline in the wear card (its own surface): the rope, then the garments, then their drops.
  wearRope: 0, wearItem: 1, wearDrip: 2,
  // The living light: the cloud's shadows on the land, with the weather.
  cloudShadow: 6,
  // The field's sheets (SPEC §6.0), with the clouds.
  cloudSheet: 5,
  cloudCells: 5,
}

export interface SliceJob { surface: Surface; layers: readonly LayerDesc[] }

export interface SliceReport {
  /** Each slice's paint time (ms). */
  slices: number[]
  /** All slices together (ms). */
  totalMs: number
  painted: number
}

export interface SliceOptions {
  /** Paint time per frame (ms) before yielding; at least one layer is painted per slice. */
  budgetMs?: number
  frame: (cb: () => void) => number
  cancelFrame: (id: number) => void
  now: () => number
  phase?: number
  /** After each slice (the surfaces are composited with what is ready). */
  onSlice?: (ms: number) => void
}

export interface Slicer { done: Promise<SliceReport>; cancel(): void }

/**
 * Paints the stale layers of the surfaces in priority order across frames, each slice under `budgetMs` (8 ms: no long
 * task blocks input), compositing after each slice so the sky shows first. The first slice runs at once.
 */
export function paintSliced(jobs: readonly SliceJob[], options: SliceOptions): Slicer {
  const { budgetMs = 8, frame, cancelFrame, now, phase = 0 } = options
  const queue = jobs.flatMap(({ surface, layers }) => layers.map((desc) => ({ surface, desc })))
    .sort((a, b) => PRIORITY[a.desc.kind] - PRIORITY[b.desc.kind] || a.desc.z - b.desc.z)
  for (const { surface, layers } of jobs) surface.prune(new Set(layers.map((layer) => layer.id)))
  const report: SliceReport = { slices: [], totalMs: 0, painted: 0 }
  let handle: number | null = null
  let cancelled = false
  let resolve: (report: SliceReport) => void = () => {}
  const done = new Promise<SliceReport>((r) => { resolve = r })

  const slice = () => {
    handle = null
    if (cancelled) return
    const start = now()
    let count = 0
    while (queue.length) {
      const { surface, desc } = queue[0]
      if (!surface.fresh(desc)) {
        if (count > 0 && now() - start >= budgetMs) break
        surface.paint(desc, phase)
        count++
        report.painted++
      }
      queue.shift()
    }
    for (const { surface, layers } of jobs) surface.composite(layers, report.slices.length ? undefined : phase)
    const ms = now() - start
    report.slices.push(ms)
    report.totalMs += ms
    options.onSlice?.(ms)
    if (queue.length) handle = frame(slice)
    else resolve(report)
  }
  slice()
  return {
    done,
    cancel() {
      cancelled = true
      if (handle !== null) cancelFrame(handle)
    },
  }
}
