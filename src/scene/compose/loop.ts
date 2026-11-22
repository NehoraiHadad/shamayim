import type { LayerDesc } from '../model/types'

export interface LoopDeps {
  frame: (cb: (t: number) => void) => number
  cancelFrame: (id: number) => void
  /** The page is shown (the loop stops while it is hidden; the shell restarts it). */
  visible: () => boolean
  /** `prefers-reduced-motion` or save-data: one still frame, no loop. */
  still: () => boolean
}

export const animates = (layers: readonly LayerDesc[]) => layers.some((layer) => layer.animated ||
  ((layer.kind === 'plane' || layer.kind === 'canopy') && layer.cloudShadow?.speed))

/**
 * The one animation loop (§1d): runs only while a layer is animated and the page is visible, capped at `fps` (30);
 * `tick` gets the phase in seconds since the loop started (never the clock). Reduced motion draws one frame at phase 0,
 * or, while the land is arriving (C8: `settle` > 0, the end of its fades), runs until then with `still` set, so the
 * arrival's simple fade plays and nothing else moves. With an `epoch` (C8: the page's scene epoch, on the frame callback's
 * timeline) the phase runs from it rather than from the loop's start, so it carries on through a new model (a scrub, a
 * world part arriving, the land's reveal): one clock for every loop.
 */
export function makeLoop(tick: (phase: number, still: boolean) => void, deps: LoopDeps, fps = 30, settle = 0, epoch?: number) {
  let handle: number | null = null
  let origin: number | null = null
  let last = -Infinity
  let still = false
  const step = 1000 / fps
  const run = (t: number) => {
    handle = null
    if (!deps.visible()) { origin = null; return }
    origin ??= epoch ?? t
    const phase = (t - origin) / 1000
    // A small slack keeps a 60 Hz display at every second frame rather than drifting.
    if (t - last >= step - 2) {
      last = t
      tick(still ? Math.min(phase, settle) : phase, still)
      if (still && phase >= settle) return
    }
    handle = deps.frame(run)
  }
  return {
    start() {
      if (handle !== null) return
      still = deps.still()
      if (still && settle <= 0) { tick(0, true); return }
      handle = deps.frame(run)
    },
    stop() {
      // Called unbound: a host may pass the browser's own `cancelAnimationFrame`, which throws if `this` is `deps`.
      if (handle !== null) { const { cancelFrame } = deps; cancelFrame(handle) }
      handle = null
      origin = null
      last = -Infinity
    },
    get running() { return handle !== null },
  }
}
