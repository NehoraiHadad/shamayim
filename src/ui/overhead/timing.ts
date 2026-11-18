import { addMinutes } from '../../domain/minutes'
import { RADAR_STALE_MIN } from '../../domain/outlookNow'
import type { HourPoint, LocalTime } from '../../domain/types'

type RainHour = Pick<HourPoint, 'time' | 'precipitation' | 'precipProb'>

/** The first hour within three hours that the forecast calls rainy. */
export function firstRainHour(hours: readonly RainHour[], now: LocalTime): RainHour | undefined {
  const end = addMinutes(now, 180)
  return hours.find(({ time, precipitation, precipProb }) =>
    time >= now && time <= end && (precipitation >= 0.1 || (precipProb ?? 0) >= 50))
}

export const rainWithinThreeHours = (hours: readonly RainHour[], now: LocalTime) => Boolean(firstRainHour(hours, now))

/** The place's clock `minutes` from now, rounded to five minutes ("15:40"). */
export function clockIn(now: LocalTime, minutes: number): string {
  const past = Number(now.slice(14, 16))
  return addMinutes(now, Math.round((past + minutes) / 5) * 5 - past).slice(11, 16)
}

const minutesOld = (time: number, now: number) => Math.max(0, Math.floor((now - time) / 60_000))

export function frameAge(time: number | null, now: number): string {
  if (time === null) return '—'
  const minutes = minutesOld(time, now)
  return minutes < 1 ? 'עכשיו' : `לפני ${minutes} דק׳`
}

export const frameIsStale = (time: number | null, now: number) =>
  time !== null && now - time > RADAR_STALE_MIN * 60_000
