import type { Forecast, LocalTime } from './types'

/** Current wall-clock time in a timezone, formatted like Open-Meteo ("2026-11-16T14:05"). */
export function nowIn(timezone: string, at = new Date()): LocalTime {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(at)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

/**
 * When a cached forecast is older than an hour, its `current` block is outdated.
 * Re-derive "now" from the hourly row for the present hour instead.
 */
export function rollForward(forecast: Forecast, now: LocalTime): Forecast {
  const hourKey = `${now.slice(0, 13)}:00`
  if (forecast.current.time.slice(0, 13) === now.slice(0, 13)) return forecast
  const row = forecast.hours.find((h) => h.time === hourKey)
  if (!row) return forecast
  const today = forecast.days.find((d) => d.date === now.slice(0, 10))
  const isDay = today ? now >= today.sunrise && now < today.sunset : forecast.current.isDay
  return {
    ...forecast,
    current: {
      ...forecast.current,
      time: now,
      temperature: row.temperature,
      feelsLike: row.temperature,
      isDay,
      weatherCode: row.weatherCode,
      cloudCover: row.cloudCover,
      windSpeed: row.windSpeed,
      windGusts: row.windGusts,
    },
  }
}
