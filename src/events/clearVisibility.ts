import type { HourPoint } from '../domain/types'

/** Use the forecast's transparency only in hours coded clear or cloudy, with no precipitation. */
export function clearVisibility(hour: HourPoint | null): number | null {
  if (!hour || hour.weatherCode > 3 || hour.precipitation > 0 || hour.visibility == null) return null
  return hour.visibility / 1000
}
