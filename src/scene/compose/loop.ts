import type { LayerDesc } from '../model/types'

export interface LoopDeps {
  frame: (cb: (t: number) => void) => number
  cancelFrame: (id: number) => void
  /** The page is shown (the loop stops while it is hidden; the shell restarts it). */
  visible: () => boolean
  /** `prefers-reduced-motion` or save-data: one still frame, no loop. */
  still: () => boolean
}

export const animates = (layers: readonly LayerDesc[]) => layers.some((layer) => layer.animated)

/**
 * The one animation loop (§1d): runs only while a layer is animated and the page is visible, capped at `fps` (30);
 * `tick` gets the phase in seconds since the loop started (never the clock). Reduced motion draws one frame at phase 0.
 */
export function makeLoop(tick: (phase: number) => void, deps: LoopDeps, fps = 30) {
  let handle: number | null = null
  let origin: number | null = null
  let last = -Infinity
  const step = 1000 / fps
  const run = (t: number) => {
    handle = null
    if (!deps.visible()) { origin = null; return }
    origin ??= t
    // A small slack keeps a 60 Hz display at every second frame rather than drifting.
    if (t - last >= step - 2) {
      last = t
      tick((t - origin) / 1000)
    }
    handle = deps.frame(run)
  }
  return {
    start() {
      if (handle !== null) return
      if (deps.still()) { tick(0); return }
      handle = deps.frame(run)
    },
    stop() {
      if (handle !== null) deps.cancelFrame(handle)
      handle = null
      origin = null
      last = -Infinity
    },
    get running() { return handle !== null },
  }
}
