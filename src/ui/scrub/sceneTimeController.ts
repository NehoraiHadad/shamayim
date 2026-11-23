import { addMinutes, minutesBetweenLocal } from '../../domain/minutes'
import type { LocalTime } from '../../domain/types'

/** A pick or a released scrub holds this long, then time plays back to now. */
const HOLD_MS = 6000
/** Return through the intervening minutes in less than a second. */
const REWIND_MS = 900

export interface SceneTimeState {
  /** The shown moment at minute resolution; null = now. */
  at: LocalTime | null
  /** A finger or pointer is moving time (transitions off, the scene tracks it). */
  scrubbing: boolean
  /** Time is playing back to now. */
  rewinding: boolean
}

export const initialSceneTime: SceneTimeState = { at: null, scrubbing: false, rewinding: false }

interface SceneTimeClock {
  setTimeout: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>
  clearTimeout: (timer: ReturnType<typeof setTimeout> | undefined) => void
  requestFrame: (callback: (timestamp: number) => void) => number
  cancelFrame: (frame: number) => void
  frameTime: () => number
  reducedMotion: () => boolean
}

/** Controls selection and playback with an injected clock. */
export function createSceneTimeController(now: LocalTime, publish: (state: SceneTimeState) => void, clock: SceneTimeClock) {
  let state = initialSceneTime
  let timer: ReturnType<typeof setTimeout> | undefined
  let frame = 0

  const update = (next: SceneTimeState) => {
    if (next.at === state.at && next.scrubbing === state.scrubbing && next.rewinding === state.rewinding) return
    state = next
    publish(state)
  }
  // Only user landings resolve to live. A clock tick leaves an existing preview selected.
  const landing = (time: LocalTime | null) => time === now ? null : time
  const stop = () => {
    clock.clearTimeout(timer)
    clock.cancelFrame(frame)
  }
  const toNow = () => {
    stop()
    update(initialSceneTime)
  }
  const rewind = () => {
    const start = state.at
    stop()
    if (!start || clock.reducedMotion()) return toNow()
    const distance = minutesBetweenLocal(start, now)
    if (distance === 0) return toNow()

    const began = clock.frameTime()
    update({ ...state, rewinding: true })
    const tick = (time: number) => {
      const p = Math.min(1, (time - began) / REWIND_MS)
      const offset = Math.round(distance * (1 - (1 - p) ** 3))
      if (offset === distance) return toNow()
      update({ ...state, at: addMinutes(start, offset) })
      frame = clock.requestFrame(tick)
    }
    frame = clock.requestFrame(tick)
  }
  const hold = () => {
    clock.clearTimeout(timer)
    timer = clock.setTimeout(rewind, HOLD_MS)
  }
  return {
    setNow(time: LocalTime) { now = time },
    pick(time: LocalTime | null) {
      const at = landing(time)
      if (at === null) return toNow()
      stop()
      update({ at, scrubbing: false, rewinding: false })
      hold()
    },
    scrub(time: LocalTime) {
      stop()
      update({ at: landing(time), scrubbing: true, rewinding: false })
    },
    release() {
      update({ ...state, scrubbing: false })
      if (state.at) hold()
    },
    toNow,
    stop,
  }
}
