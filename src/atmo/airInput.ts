import { sunPosition } from '../astro/sun'
import { utcOf } from '../astro/utc'
import { datePart } from '../domain/time'
import type { AirPoint, Forecast, LocalTime } from '../domain/types'
import type { AirInput } from './airTypes'

/** Where the sky is computed: the place's coordinates and its wall-clock zone. */
export interface SkySite {
  lat: number
  lon: number
  timezone: string
}

/** True sun altitude in degrees at a wall-clock minute (twilight depth included, floored at −18 = full night). */
export function sunElevation(at: LocalTime, site: SkySite): number {
  return Math.max(-18, sunPosition(utcOf(at, site.timezone), site.lat, site.lon).altitude)
}

function airAt(air: AirPoint[] | null, at: LocalTime): AirPoint | undefined {
  const key = `${at.slice(0, 13)}:00`
  return air?.find((a) => a.time === key)
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * The input for "now", or for a selected hour (a preview). A preview takes rain, cloud,
 * wind, temperature and lying snow from that hour and holds direction, falling snow and visibility from now.
 */
export function airInput(forecast: Forecast, now: LocalTime, site: SkySite, selected: LocalTime | null): AirInput {
  const c = forecast.current
  const floor = selected ? `${selected.slice(0, 13)}:00` : null
  const hour = floor ? forecast.hours.find((h) => h.time === floor) : undefined
  const next = hour ? forecast.hours[forecast.hours.indexOf(hour) + 1] : undefined
  const fraction = selected ? Number(selected.slice(14, 16)) / 60 : 0
  const at = hour ? selected! : now
  const a = airAt(forecast.air, at)
  const ground = hour ?? forecast.hours.find((h) => h.time === `${now.slice(0, 13)}:00`)
  const base = {
    date: datePart(at),
    localHour: Number(at.slice(11, 13)) + Number(at.slice(14, 16)) / 60,
    windDirection: c.windDirection,
    snowfall: c.snowfall,
    snowDepth: ground?.snowDepth ?? 0,
    visibilityKm: c.visibility === null ? null : c.visibility / 1000,
    pm10: a?.pm10 ?? null,
    dust: a?.dust ?? null,
    sunElevation: sunElevation(at, site),
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
