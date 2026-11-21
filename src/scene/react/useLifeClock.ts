import { useEffect, useState } from 'react'
import { utcOf } from '../../astro/utc'
import type { LocalTime } from '../../domain/types'
import type { LifeClock } from '../model/types'
import { reducedMotion, scenePhase } from './useSurface'

export function lifeClockAt(at: LocalTime, selected: LocalTime | null, timezone: string, nowMs: number, laidAt: number): LifeClock {
  return { laidAt, sinceS: selected === null ? (nowMs - utcOf(at, timezone).getTime()) / 1000 : 0 }
}

const MINUTE_S = 60

export const lifeClockKey = (at: LocalTime, selected: LocalTime | null) => `${at}|${selected === null}`

export function scrubMinuteAt(start: number, phase: number) {
  const offsetMinutes = Math.max(0, Math.floor((phase - start) / MINUTE_S))
  return { offsetMinutes, laidAt: start + offsetMinutes * MINUTE_S, sinceS: 0 }
}

export function useLifeClock(at: LocalTime, selected: LocalTime | null, timezone: string) {
  const key = lifeClockKey(at, selected)
  const read = () => ({ key, timezone, start: lifeClockAt(at, selected, timezone, Date.now(), scenePhase()), offsetMinutes: 0 })
  const [saved, setSaved] = useState(read)
  const laid = saved.key === key && saved.timezone === timezone ? saved : read()
  if (laid !== saved) setSaved(laid)

  const { start, offsetMinutes } = laid
  useEffect(() => {
    if (selected === null) return
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      const phase = scenePhase()
      const next = scrubMinuteAt(start.laidAt, phase)
      const offsetMinutes = reducedMotion() ? 0 : next.offsetMinutes
      setSaved((last) => last.start === start && last.offsetMinutes !== offsetMinutes
        ? { ...last, offsetMinutes } : last)
      timer = setTimeout(tick, Math.max(1, (next.laidAt + MINUTE_S - phase) * 1000))
    }
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      clearTimeout(timer)
      tick()
    }
    tick()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [selected, start])

  return { offsetMinutes, laidAt: start.laidAt + offsetMinutes * MINUTE_S, sinceS: start.sinceS }
}
