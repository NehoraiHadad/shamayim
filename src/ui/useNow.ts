import { useEffect, useState } from 'react'
import { nowIn } from '../domain/now'
import type { LocalTime } from '../domain/types'
import { pinnedTime } from './devParams'

/** Wall-clock time in the place's timezone, ticking every minute. */
export function useNow(timezone: string): LocalTime {
  const [clock, setClock] = useState(() => ({ timezone, now: pinnedTime() ?? nowIn(timezone) }))
  useEffect(() => {
    if (pinnedTime()) return
    const tick = () => {
      const now = nowIn(timezone)
      setClock((last) => last.timezone === timezone && last.now === now ? last : { timezone, now })
      id = setTimeout(tick, 60_000 - Date.now() % 60_000 + 50)
    }
    // Catch a minute boundary between the initial render and the effect, then follow the wall clock.
    let id = setTimeout(tick, 0)
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      clearTimeout(id)
      tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [timezone])
  return clock.timezone === timezone ? clock.now : pinnedTime() ?? nowIn(timezone)
}
