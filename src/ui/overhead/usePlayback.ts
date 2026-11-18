import { useEffect, useRef, useState } from 'react'

const PLAY_MS = 3000

export function usePlayback(count: number, ready: boolean, reduced: boolean) {
  const [selection, setSelection] = useState<number>()
  const started = useRef(false)
  const raf = useRef(0)
  const last = Math.max(0, count - 1)

  useEffect(() => {
    if (!ready || started.current || reduced || last < 1) return
    started.current = true
    const start = performance.now()
    setSelection(0)
    const tick = (time: number) => {
      const index = Math.min(last, Math.floor((time - start) / PLAY_MS * (last + 1)))
      setSelection(index)
      if (index < last) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [ready, reduced, last])

  return {
    at: selection ?? last,
    choose(at: number) {
      cancelAnimationFrame(raf.current)
      started.current = true
      setSelection(at)
    },
  }
}
