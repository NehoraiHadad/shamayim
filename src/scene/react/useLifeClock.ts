import { useState } from 'react'
import { utcOf } from '../../astro/utc'
import type { LocalTime } from '../../domain/types'
import type { LifeClock } from '../model/types'
import { scenePhase } from './useSurface'

export function lifeClockAt(at: LocalTime, selected: LocalTime | null, timezone: string, nowMs: number, laidAt: number): LifeClock {
  return { laidAt, sinceS: selected === null ? (nowMs - utcOf(at, timezone).getTime()) / 1000 : 0 }
}

export function useLifeClock(at: LocalTime, selected: LocalTime | null, timezone: string): LifeClock {
  const read = () => ({ at, clock: lifeClockAt(at, selected, timezone, Date.now(), scenePhase()) })
  const [laid, setLaid] = useState(read)
  if (laid.at === at) return laid.clock
  const next = read()
  setLaid(next)
  return next.clock
}
