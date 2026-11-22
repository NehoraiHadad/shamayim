import { useCallback, useEffect, useRef, useState } from 'react'
import { addMinutes, minutesBetweenLocal } from '../../domain/minutes'
import type { LocalTime } from '../../domain/types'

/** A pick or a released scrub holds this long, then time plays back to now. */
const HOLD_MS = 6000
const REWIND_MS = 900
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

export interface SceneTime {
  /** The shown moment at minute resolution; null = now. */
  at: LocalTime | null
  /** A finger or pointer is moving time (transitions off, the scene tracks it). */
  scrubbing: boolean
  /** Time is playing back to now. */
  rewinding: boolean
  /** Tap or keys on the strip: show that hour, hold, then rewind. null = back to now at once. */
  pick: (time: LocalTime | null) => void
  /** Live drag: no timer while the finger is down. */
  scrub: (time: LocalTime) => void
  /** The finger lifted: start the hold. */
  release: () => void
  /** The "עכשיו" chip / Escape: back to now at once. */
  toNow: () => void
}

/** The moment the valley shows: now, a picked hour, or a minute dragged to; it always finds its way back to now. */
export function useSceneTime(now: LocalTime): SceneTime {
  const [at, setAtState] = useState<LocalTime | null>(null)
  const [scrubbing, setScrubbing] = useState(false)
  const [rewinding, setRewinding] = useState(false)
  // Timers and the rewind read the latest values without re-subscribing.
  const atRef = useRef<LocalTime | null>(null)
  const nowRef = useRef(now)
  useEffect(() => { nowRef.current = now }, [now])
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const frame = useRef(0)
  const setAt = (t: LocalTime | null) => { atRef.current = t; setAtState(t) }

  const stop = useCallback(() => { clearTimeout(timer.current); cancelAnimationFrame(frame.current); setRewinding(false) }, [])
  const toNow = useCallback(() => { stop(); setScrubbing(false); setAt(null) }, [stop])

  // A real rewind through the minutes (sun, light and air travel back), eased out; reduced motion cuts.
  const rewind = useCallback(() => {
    const start = atRef.current
    stop()
    if (!start || reducedMotion()) return toNow()
    const distance = minutesBetweenLocal(start, nowRef.current)
    if (distance === 0) return toNow()
    const began = performance.now()
    setRewinding(true)
    const tick = (time: number) => {
      const p = Math.min(1, (time - began) / REWIND_MS)
      const offset = Math.round(distance * (1 - (1 - p) ** 3))
      if (offset === distance) return toNow()
      setAt(addMinutes(start, offset))
      frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
  }, [stop, toNow])

  const hold = useCallback(() => { clearTimeout(timer.current); timer.current = setTimeout(rewind, HOLD_MS) }, [rewind])
  const pick = useCallback((time: LocalTime | null) => {
    if (!time) return toNow()
    stop(); setScrubbing(false); setAt(time); hold()
  }, [hold, stop, toNow])
  const scrub = useCallback((time: LocalTime) => { stop(); setScrubbing(true); setAt(time) }, [stop])
  const release = useCallback(() => { setScrubbing(false); if (atRef.current) hold() }, [hold])
  useEffect(() => () => { clearTimeout(timer.current); cancelAnimationFrame(frame.current) }, [])
  return { at, scrubbing, rewinding, pick, scrub, release, toNow }
}
