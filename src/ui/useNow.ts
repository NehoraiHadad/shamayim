import { useCallback, useEffect, useState } from 'react'
import { utcOf } from '../astro/utc'
import { nowIn } from '../domain/now'
import type { LocalTime } from '../domain/types'
import { pinnedTime } from './devParams'

const MINUTE_MS = 60_000

/** A pinned view holds the weather sample still while its receipt clock advances from the pin. */
export function sceneClock(timezone: string, pinned: LocalTime | null, startedAt: number, wallMs: number) {
  const minute = Math.floor(wallMs / MINUTE_MS) * MINUTE_MS
  if (!pinned) return { now: nowIn(timezone, new Date(minute)), arrivalMs: minute }
  const elapsed = Math.floor((wallMs - startedAt) / MINUTE_MS) * MINUTE_MS
  return { now: pinned, arrivalMs: utcOf(pinned, timezone).getTime() + elapsed }
}

export function useNow(timezone: string) {
  const [startedAt] = useState(Date.now)
  const [wallMs, setWallMs] = useState(startedAt)
  const pinned = pinnedTime()
  const read = useCallback((wallMs: number) => sceneClock(timezone, pinned, startedAt, wallMs), [timezone, pinned, startedAt])
  const receiptTime = useCallback(() => read(Date.now()).arrivalMs, [read])
  useEffect(() => {
    const tick = () => {
      const wallMs = Date.now()
      setWallMs(wallMs)
      const elapsed = pinned ? wallMs - startedAt : wallMs
      id = setTimeout(tick, MINUTE_MS - elapsed % MINUTE_MS + 50)
    }
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
  }, [pinned, startedAt])
  return { ...read(wallMs), receiptTime }
}
