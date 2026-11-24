import { addMinutes as shiftMinutes } from './minutes'
import type { LocalDate, LocalTime } from './types'

/**
 * Open-Meteo returns wall-clock strings in the place's timezone ("2026-11-16T14:00").
 * We never pass them to `new Date()` (that would reinterpret them in the device's zone);
 * all logic works on the strings directly. ISO strings of equal format sort lexically.
 */

export function datePart(t: LocalTime): LocalDate {
  return t.slice(0, 10)
}

/** Minutes since local midnight. */
export function minutesOfDay(t: LocalTime): number {
  const h = Number(t.slice(11, 13))
  const m = Number(t.slice(14, 16))
  return h * 60 + m
}

export function hourOf(t: LocalTime): number {
  return Number(t.slice(11, 13))
}

/** "14:05" from a local timestamp. */
export function clockOf(t: LocalTime): string {
  return t.slice(11, 16)
}

/** Fraction of daylight elapsed (0 at sunrise, 1 at sunset); <0 before, >1 after. */
export function daylightFraction(now: LocalTime, sunrise: LocalTime, sunset: LocalTime): number {
  const n = minutesOfDay(now)
  const r = minutesOfDay(sunrise)
  const s = minutesOfDay(sunset)
  return (n - r) / Math.max(1, s - r)
}

/** A local timestamp moved by whole minutes (rounded), kept on the same date (clamped to 00:00–23:59). */
export function addMinutes(t: LocalTime, minutes: number): LocalTime {
  const shifted = shiftMinutes(t, minutes)
  const day = datePart(t)
  if (datePart(shifted) === day) return shifted
  return shifted < t ? `${day}T00:00` : `${day}T23:59`
}

/** Minutes between two local timestamps on the same date; positive when b is later. */
export function minutesBetween(a: LocalTime, b: LocalTime): number {
  return minutesOfDay(b) - minutesOfDay(a)
}

/** Weekday name in Hebrew for a local date. Uses noon UTC to stay date-stable. */
export function weekdayHe(date: LocalDate): string {
  const d = new Date(`${date}T12:00:00Z`)
  return new Intl.DateTimeFormat('he-IL', { weekday: 'long', timeZone: 'UTC' }).format(d)
}

/** "16.11" short date label. */
export function shortDate(date: LocalDate): string {
  return `${Number(date.slice(8, 10))}.${Number(date.slice(5, 7))}`
}
