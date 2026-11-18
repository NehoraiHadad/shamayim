import { addMinutes } from '../../domain/minutes'
import type { HourPoint, LocalTime } from '../../domain/types'

type RainHour = Pick<HourPoint, 'time' | 'precipitation' | 'precipProb'>

export function rainWithinThreeHours(hours: readonly RainHour[], now: LocalTime): boolean {
  const end = addMinutes(now, 180)
  return hours.some(({ time, precipitation, precipProb }) =>
    time >= now && time <= end && (precipitation >= 0.1 || (precipProb ?? 0) >= 50))
}

const minutesOld = (time: number, now: number) => Math.max(0, Math.floor((now - time) / 60_000))

export function frameAge(time: number | null, now: number): string {
  if (time === null) return '—'
  const minutes = minutesOld(time, now)
  return minutes < 1 ? 'עכשיו' : `לפני ${minutes} דק׳`
}

export const frameIsStale = (time: number | null, now: number) =>
  time !== null && now - time > 45 * 60_000
