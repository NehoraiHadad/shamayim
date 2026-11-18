import { addMinutes } from '../../domain/minutes'
import { nowIn } from '../../domain/now'
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

/** The place's clock ("14:40") at an epoch time. */
export const clockAt = (time: number, timezone: string) => nowIn(timezone, new Date(time)).slice(11, 16)

/**
 * How old a picture is, rounded the way people say it: "עכשיו", "לפני 20 דק׳", "לפני שעה ורבע", "לפני שעתיים".
 * `spoken` spells it out for screen readers ("לפני 20 דקות").
 */
export function agoText(minutes: number, spoken = false): string {
  if (minutes < 5) return 'עכשיו'
  if (minutes < 53) return `לפני ${Math.round(minutes / 5) * 5} ${spoken ? 'דקות' : 'דק׳'}`
  if (minutes < 68) return 'לפני שעה'
  if (minutes < 83) return 'לפני שעה ורבע'
  if (minutes < 105) return 'לפני שעה וחצי'
  if (minutes < 135) return 'לפני שעתיים'
  return 'לפני יותר משעתיים'
}

/** A frame's age in words, from its epoch time; "—" when there is none. */
export function frameAge(time: number | null, now: number, spoken = false): string {
  return time === null ? '—' : agoText(minutesOld(time, now), spoken)
}

export const frameIsStale = (time: number | null, now: number) =>
  time !== null && now - time > RADAR_STALE_MIN * 60_000
