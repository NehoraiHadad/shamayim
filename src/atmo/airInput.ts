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

/**
 * The input for "now", or for a selected hour (a preview). A preview takes rain, cloud,
 * wind and temperature from that hour and holds direction, snow and visibility from now.
 */
export function airInput(forecast: Forecast, now: LocalTime, lat: number, selected: LocalTime | null): AirInput {
  const c = forecast.current
  const hour = selected ? forecast.hours.find((h) => h.time === selected) : undefined
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
    return {
      ...base,
      temperature: hour.temperature,
      feelsLike: hour.temperature,
      cloudCover: hour.cloudCover,
      windSpeed: hour.windSpeed,
      windGusts: hour.windGusts,
      precipitation: hour.precipitation,
      weatherCode: hour.weatherCode,
      humidity: hour.humidity,
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
