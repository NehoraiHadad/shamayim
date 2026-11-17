import { useCallback, useEffect, useRef, useState } from 'react'
import { addMinutes, minutesBetweenLocal } from '../../domain/minutes'
import type { LocalTime } from '../../domain/types'

const HOLD_MS = 6000
const REWIND_MS = 900

export function useSceneTime(now: LocalTime) {
  const [at, setAt] = useState<LocalTime | null>(null)
  const [scrubbing, setScrubbing] = useState(false)
  const [rewinding, setRewinding] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const frame = useRef(0)
  const clear = useCallback(() => { clearTimeout(timer.current); cancelAnimationFrame(frame.current) }, [])
  const toNow = useCallback(() => { clear(); setScrubbing(false); setRewinding(false); setAt(null) }, [clear])
  const rewind = useCallback(() => {
    clear()
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return toNow()
    setScrubbing(false)
    setRewinding(true)
    setAt((start) => {
      if (!start) return null
      const distance = minutesBetweenLocal(start, now)
      const began = performance.now()
      const tick = (time: number) => {
        const p = Math.min(1, (time - began) / REWIND_MS)
        const eased = 1 - (1 - p) ** 3
        setAt(p === 1 ? null : addMinutes(start, distance * eased))
        if (p === 1) setRewinding(false)
        if (p < 1) frame.current = requestAnimationFrame(tick)
      }
      frame.current = requestAnimationFrame(tick)
      return start
    })
  }, [clear, now, toNow])
  const hold = useCallback(() => { clearTimeout(timer.current); timer.current = setTimeout(rewind, HOLD_MS) }, [rewind])
  const pick = useCallback((time: LocalTime | null) => { setScrubbing(false); setRewinding(false); setAt(time); if (time) hold(); else toNow() }, [hold, toNow])
  const scrub = useCallback((time: LocalTime) => { clear(); setRewinding(false); setScrubbing(true); setAt(time) }, [clear])
  const release = useCallback(() => { setScrubbing(false); if (at) hold() }, [at, hold])
  useEffect(() => clear, [clear])
  return { at, scrubbing, rewinding, pick, scrub, release, toNow }
}
