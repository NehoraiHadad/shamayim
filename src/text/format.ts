import { shortDate, weekdayHe } from '../domain/time'
import type { LocalDate } from '../domain/types'

/** Rounded temperature with a true minus sign (U+2212) and an optional degree mark. */
export function formatTemp(t: number, withDegree = true): string {
  const n = Math.round(t)
  const body = n < 0 ? `−${Math.abs(n)}` : String(n)
  return withDegree ? `${body}°` : body
}

/** "היום", "מחר", or the weekday name. */
export function dayName(date: LocalDate, today: LocalDate, tomorrow: LocalDate | undefined): string {
  if (date === today) return 'היום'
  if (date === tomorrow) return 'מחר'
  return weekdayHe(date).replace(/^יום\s+/, '')
}

export { shortDate }

/** Rain probability rounded to the nearest 10%. */
export function formatProb(p: number): string {
  return `${Math.round(p / 10) * 10}%`
}

/** UV index → Hebrew band (WHO scale). */
export function uvLabel(uv: number): string {
  const n = Math.round(uv)
  if (n <= 2) return `נמוכה (${n})`
  if (n <= 5) return `בינונית (${n})`
  if (n <= 7) return `גבוהה (${n})`
  if (n <= 10) return `גבוהה מאוד (${n})`
  return `קיצונית (${n})`
}

/** PM10 (µg/m³) → air description, using the dust thresholds. */
export function airLabel(pm10: number, light: number, heavy: number): string {
  if (pm10 >= heavy) return 'אובך כבד'
  if (pm10 >= light) return 'אובך'
  if (pm10 >= light / 2) return 'סביר'
  return 'נקי'
}
