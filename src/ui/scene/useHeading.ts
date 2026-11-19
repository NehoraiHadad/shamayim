import { useCallback, useEffect, useRef, useState } from 'react'

const wrap = (deg: number) => ((deg % 360) + 360) % 360
/** Shortest way round from a to b (deg, −180..180). */
const turnFrom = (a: number, b: number) => ((((b - a) % 360) + 540) % 360) - 180
const GLIDE_MS = 520
const ease = (t: number) => 1 - (1 - t) ** 3

/**
 * The heading of a turning view. `drag` follows the finger at once (one update a frame); `glide` turns softly to a
 * heading (the arrows, the sun mark), the short way round.
 */
export function useHeading(initial = 180) {
  const [heading, setHeading] = useState(initial)
  const current = useRef(initial)
  const frame = useRef<number | null>(null)
  const pending = useRef<number | null>(null)
  const stop = () => { if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null }
  useEffect(() => stop, [])

  const drag = useCallback((next: number) => {
    pending.current = wrap(next)
    if (frame.current !== null) return
    frame.current = requestAnimationFrame(() => {
      frame.current = null
      if (pending.current === null) return
      current.current = pending.current
      pending.current = null
      setHeading(current.current)
    })
  }, [])

  const glide = useCallback((target: number) => {
    stop()
    pending.current = null
    const from = current.current
    const by = turnFrom(from, target)
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / GLIDE_MS)
      current.current = wrap(from + by * ease(t))
      setHeading(current.current)
      frame.current = t < 1 ? requestAnimationFrame(step) : null
    }
    frame.current = requestAnimationFrame(step)
  }, [])

  return { heading, drag, glide }
}
