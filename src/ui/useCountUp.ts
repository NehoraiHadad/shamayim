import { useEffect, useRef, useState } from 'react'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Shows `target` at once on first render; when it later changes (after a refresh),
 * counts from the old value to the new one.
 */
export function useCountUp(target: number, durationMs = 400): number {
  const [value, setValue] = useState(target)
  const shown = useRef(target)
  const reduced = prefersReducedMotion()

  useEffect(() => {
    if (reduced || shown.current === target) return
    const start = performance.now()
    const begin = shown.current
    let raf = 0
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs)
      const v = Math.round(begin + (target - begin) * (1 - (1 - p) ** 3))
      shown.current = v
      setValue(v)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs, reduced])

  return reduced ? target : value
}
