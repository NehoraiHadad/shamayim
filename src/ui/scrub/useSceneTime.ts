import { useLayoutEffect, useState } from 'react'
import type { LocalTime } from '../../domain/types'
import { createSceneTimeController, initialSceneTime, type SceneTimeState } from './sceneTimeController'

export interface SceneTime extends SceneTimeState {
  /** Tap or keys on the strip: show that hour, hold, then rewind. null = back to now at once. */
  pick: (time: LocalTime | null) => void
  /** Live drag: no timer while the finger is down. */
  scrub: (time: LocalTime) => void
  /** The finger lifted: start the hold if a preview is selected. */
  release: () => void
  /** The "עכשיו" chip / Escape: back to now at once. */
  toNow: () => void
}

/** The moment the valley shows: now, a picked hour, or a minute dragged to; it always finds its way back to now. */
export function useSceneTime(now: LocalTime): SceneTime {
  const [state, setState] = useState(initialSceneTime)
  const [controller] = useState(() => createSceneTimeController(now, setState, {
    setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
    clearTimeout: (timer) => clearTimeout(timer),
    requestFrame: (callback) => requestAnimationFrame(callback),
    cancelFrame: (frame) => cancelAnimationFrame(frame),
    frameTime: () => performance.now(),
    reducedMotion: () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  }))
  // Input after this commit must land against this minute, even before passive effects run.
  useLayoutEffect(() => { controller.setNow(now) }, [controller, now])
  useLayoutEffect(() => controller.stop, [controller])
  const { pick, scrub, release, toNow } = controller
  return { ...state, pick, scrub, release, toNow }
}
