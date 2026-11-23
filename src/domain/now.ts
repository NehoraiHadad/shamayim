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
 * When the displayed hour changes, derive the current card from that hour's row.
 * Keep the complete reading at its original time for the world timeline.
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
    observation: forecast.observation ?? forecast.current,
    current: {
      ...forecast.current,
      time: now,
      temperature: row.temperature,
      feelsLike: row.temperature,
      isDay,
      weatherCode: row.weatherCode,
      cloudCover: row.cloudCover,
      thickCloud: row.thickCloud ?? null,
      cloudLow: row.cloudLow ?? null,
      cloudMid: row.cloudMid ?? null,
      cloudHigh: row.cloudHigh ?? null,
      windSpeed: row.windSpeed,
      windGusts: row.windGusts,
      windDirection: row.windDirection ?? forecast.current.windDirection,
      precipitation: row.precipitation,
      visibility: row.visibility ?? null,
      humidity: row.humidity ?? null,
    },
  }
}
