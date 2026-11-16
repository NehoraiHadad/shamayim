import { useEffect, useState } from 'react'
import { nowIn } from '../domain/now'
import type { LocalTime } from '../domain/types'

/** Dev-only: `?at=2026-11-17T13:00` pins the clock, to preview day/night themes and sentences. */
function pinnedTime(): LocalTime | null {
  if (!import.meta.env.DEV) return null
  const at = new URLSearchParams(window.location.search).get('at')
  return at && /^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(at) ? at : null
}

/** Wall-clock time in the place's timezone, ticking every minute. */
export function useNow(timezone: string): LocalTime {
  const [now, setNow] = useState(() => pinnedTime() ?? nowIn(timezone))
  useEffect(() => {
    if (pinnedTime()) return
    const id = setInterval(() => setNow(nowIn(timezone)), 60_000)
    return () => clearInterval(id)
  }, [timezone])
  return now
}
