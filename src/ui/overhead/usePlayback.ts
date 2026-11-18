import { useEffect, useRef, useState } from 'react'
import { nextStep } from './playbackPlan'

/**
 * The selected radar frame and the movie through them (see `playbackPlan.ts`). A timer chain, not an animation
 * loop: the map idles between frames. Pauses when the page is hidden or the person touches the rail.
 */
export function usePlayback(count: number, ready: boolean, reduced: boolean) {
  const [selection, setSelection] = useState<number>()
  const [run, setRun] = useState<{ loop: number; looping: boolean } | null>(null)
  const started = useRef(false)
  const last = Math.max(0, count - 1)
  const at = Math.min(selection ?? last, last)

  useEffect(() => {
    if (!ready || started.current || reduced || last < 1) return
    started.current = true
    setSelection(0)
    setRun({ loop: 0, looping: false })
  }, [ready, reduced, last])

  const next = run ? nextStep(at, run.loop, last, { reduced, looping: run.looping }) : null
  const [nextAt, nextLoop, delay] = next ? [next.at, next.loop, next.delay] : [null, 0, 0]
  // Keyed on plain values, so other renders (the clock, tiles loading) do not restart the timer.
  useEffect(() => {
    if (!run || nextAt === null) return
    const id = setTimeout(() => {
      setSelection(nextAt)
      // Stop here when this was the last step, so the button shows play again.
      if (!nextStep(nextAt, nextLoop, last, { reduced, looping: run.looping })) setRun(null)
      else if (nextLoop !== run.loop) setRun({ ...run, loop: nextLoop })
    }, delay)
    return () => clearTimeout(id)
  }, [run, nextAt, nextLoop, delay, last, reduced])

  useEffect(() => {
    const hide = () => { if (document.hidden) setRun(null) }
    document.addEventListener('visibilitychange', hide)
    return () => document.removeEventListener('visibilitychange', hide)
  }, [])

  return {
    at,
    playing: next !== null,
    choose(frame: number) {
      started.current = true
      setRun(null)
      setSelection(frame)
    },
    toggle() {
      started.current = true
      if (next) return setRun(null)
      if (at === last) setSelection(0)
      setRun({ loop: 0, looping: true })
    },
  }
}
