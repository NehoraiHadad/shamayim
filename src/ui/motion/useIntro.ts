import { useLayoutEffect, useRef, useState } from 'react'

const INTRO_MS = 1600

/**
 * True for the first ~1.6 s after data is first on screen. The root gets an `intro` class
 * that plays the one load sequence (intro.css). It never replays, even on theme changes.
 */
export function useIntro(ready: boolean): boolean {
  const [playing, setPlaying] = useState(false)
  const started = useRef(false)

  useLayoutEffect(() => {
    if (!ready || started.current) return
    started.current = true
    setPlaying(true)
    // Not cleared on cleanup: StrictMode re-runs effects, and the sequence must still end.
    setTimeout(() => setPlaying(false), INTRO_MS)
  }, [ready])

  return playing
}
