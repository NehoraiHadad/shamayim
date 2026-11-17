import { datePart, daylightFraction } from '../domain/time'
import type { AirPoint, Forecast, LocalTime } from '../domain/types'
import { noonElevation } from '../ui/scene/sunPath'
import type { AirInput } from './airTypes'

/** Sun height in degrees: noon height × sin(π·t), which goes negative before sunrise and after sunset. */
export function sunElevation(forecast: Forecast, at: LocalTime, lat: number): number {
  const day = forecast.days.find((d) => d.date === datePart(at))
  if (!day) return -18
  const t = daylightFraction(at, day.sunrise, day.sunset)
  return Math.max(-18, noonElevation(datePart(at), lat) * Math.sin(Math.PI * t))
}

function airAt(air: AirPoint[] | null, at: LocalTime): AirPoint | undefined {
  const key = `${at.slice(0, 13)}:00`
  return air?.find((a) => a.time === key)
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * The input for "now", or for a selected hour (a preview). A preview takes rain, cloud,
 * wind and temperature from that hour and holds direction, snow and visibility from now.
 */
export function airInput(forecast: Forecast, now: LocalTime, lat: number, selected: LocalTime | null): AirInput {
  const c = forecast.current
  const floor = selected ? `${selected.slice(0, 13)}:00` : null
  const hour = floor ? forecast.hours.find((h) => h.time === floor) : undefined
  const next = hour ? forecast.hours[forecast.hours.indexOf(hour) + 1] : undefined
  const fraction = selected ? Number(selected.slice(14, 16)) / 60 : 0
  const at = hour ? selected! : now
  const a = airAt(forecast.air, at)
  const base = {
    date: datePart(at),
    localHour: Number(at.slice(11, 13)) + Number(at.slice(14, 16)) / 60,
    windDirection: c.windDirection,
    snowfall: c.snowfall,
    visibilityKm: c.visibility === null ? null : c.visibility / 1000,
    pm10: a?.pm10 ?? null,
    dust: a?.dust ?? null,
    sunElevation: sunElevation(forecast, at, lat),
  }
  if (hour) {
    const value = (field: 'temperature' | 'cloudCover' | 'windSpeed' | 'windGusts' | 'precipitation') =>
      next ? lerp(hour[field], next[field], fraction) : hour[field]
    const humidity = hour.humidity === null || next?.humidity === null || !next ? hour.humidity : lerp(hour.humidity, next.humidity, fraction)
    const nearest = fraction < 0.5 || !next ? hour : next
    return {
      ...base,
      temperature: value('temperature'),
      feelsLike: value('temperature'),
      cloudCover: value('cloudCover'),
      windSpeed: value('windSpeed'),
      windGusts: value('windGusts'),
      precipitation: value('precipitation'),
      weatherCode: nearest.weatherCode,
      humidity,
      preview: true,
    }
  }
  return {
    ...base,
    temperature: c.temperature,
    feelsLike: c.feelsLike,
    cloudCover: c.cloudCover,
    windSpeed: c.windSpeed,
    windGusts: c.windGusts,
    // The hourly sum is a true mm/h; current is a 15-minute sum (×4) and only a fallback.
    precipitation: forecast.hours.find((h) => h.time === `${now.slice(0, 13)}:00`)?.precipitation ?? c.precipitation * 4,
    weatherCode: c.weatherCode,
    humidity: c.humidity,
    preview: false,
  }
}
