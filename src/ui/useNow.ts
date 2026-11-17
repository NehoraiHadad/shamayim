import { useEffect, useState } from 'react'
import { nowIn } from '../domain/now'
import type { LocalTime } from '../domain/types'
import { pinnedTime } from './devParams'

/** Wall-clock time in the place's timezone, ticking every minute. */
export function useNow(timezone: string): LocalTime {
  const [clock, setClock] = useState(() => ({ timezone, now: pinnedTime() ?? nowIn(timezone) }))
  useEffect(() => {
    if (pinnedTime()) return
    const id = setInterval(() => setClock({ timezone, now: nowIn(timezone) }), 60_000)
    return () => clearInterval(id)
  }, [timezone])
  return clock.timezone === timezone ? clock.now : pinnedTime() ?? nowIn(timezone)
}
