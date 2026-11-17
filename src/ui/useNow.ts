import { useEffect, useState } from 'react'
import { nowIn } from '../domain/now'
import type { LocalTime } from '../domain/types'
import { pinnedTime } from './devParams'

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
