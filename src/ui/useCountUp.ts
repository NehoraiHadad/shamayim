import { useEffect, useRef, useState } from 'react'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Animate an integer from its previous value (or value − 8 on first render). */
export function useCountUp(target: number, durationMs = 600): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : target - 8))
  const from = useRef(value)

  const reduced = prefersReducedMotion()

  useEffect(() => {
    if (reduced) return
    const start = performance.now()
    const begin = from.current
    let raf = 0
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs)
      const eased = 1 - (1 - p) ** 3
      const v = Math.round(begin + (target - begin) * eased)
      setValue(v)
      if (p < 1) raf = requestAnimationFrame(step)
      else from.current = target
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs, reduced])

  return reduced ? target : value
}
