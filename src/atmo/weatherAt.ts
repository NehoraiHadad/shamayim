import { utcOf } from '../astro/utc'
import { forecastArrivalProgress, forecastObservation } from '../domain/forecastRefresh'
import { minutesBetweenLocal } from '../domain/minutes'
import { smoothstep } from '../domain/smoothstep'
import type { AirPoint, Forecast, LocalTime } from '../domain/types'
import { visibilityFromHumidity } from '../world/air'
import { rainRate } from '../world/airParts'
import { layerCovers } from '../world/clouds'
import { fallingSnowAmount, isSnowHour } from '../world/snowLine'
import type { AirInput } from './airTypes'
import { mixWeather, type Weather } from './weatherMix'

export function weatherEffects(shown: Pick<AirInput, 'weatherCode' | 'precipitation' | 'snowfall' | 'temperature'>) {
  const fallingSnow = fallingSnowAmount(shown.weatherCode, shown.snowfall)
  return {
    rainMmH: rainRate(shown),
    fallingSnow,
    snowCloudRate: fallingSnow > 0 ? Math.max(0.1, shown.snowfall) : 0,
    thunderWeight: Number(shown.weatherCode >= 95),
    showerWeight: Number(shown.weatherCode >= 80 && shown.weatherCode <= 82),
  }
}

const airAt = (air: AirPoint[] | null, at: LocalTime) => air?.find((point) => point.time === at)
const clippedThick = (thick: number | null | undefined, total: number) => thick == null ? null : Math.min(thick, total)

export function weatherAt(forecast: Forecast, at: LocalTime, atMs: number, nowMs: number, timezone: string): Weather {
  const c = forecastObservation(forecast)
  const floor = `${at.slice(0, 13)}:00`
  const following = forecast.hours.findIndex((h) => h.time > at)
  const hour = following < 0 ? forecast.hours.at(-1) : forecast.hours[Math.max(0, following - 1)]
  const next = following > 0 ? forecast.hours[following] : undefined
  const fraction = hour && next ? minutesBetweenLocal(hour.time, at) / minutesBetweenLocal(hour.time, next.time) : 0

  const hourly = (row: NonNullable<typeof hour>): Weather => {
    const air = airAt(forecast.air, row.time)
    const { covers, source } = layerCovers({ cloudCover: row.cloudCover, thickCloud: row.thickCloud, hour: row })
    const snow = isSnowHour(row)
    // Open-Meteo's conversion: 10 mm water equivalent gives 7 cm of fresh snow.
    const shown = { ...row, feelsLike: row.temperature, snowfall: snow ? 0.7 * row.precipitation : 0 }
    return {
      ...shown,
      ...weatherEffects(shown),
      ...(snow ? { rainMmH: 0, showerWeight: 0 } : {}),
      thickCloud: clippedThick(row.thickCloud, row.cloudCover),
      snowDepth: row.snowDepth,
      windDirection: row.windDirection ?? c.windDirection,
      windAloft: row.windAloft ?? { low: null, mid: null, high: null },
      visibilityKm: row.visibility != null ? row.visibility / 1000 : visibilityFromHumidity(row.humidity ?? 0),
      pm10: air?.pm10 ?? null,
      dust: air?.dust ?? null,
      covers,
      cloudSource: source,
      directionSource: row.windDirection != null ? 'hour' : 'current',
      visibilitySource: row.visibility != null ? 'hour' : row.humidity != null ? 'humidity' : 'default',
    }
  }

  const a = airAt(forecast.air, floor)
  const first = hour && hourly(hour)
  const background = first && next ? mixWeather(first, hourly(next), fraction) : first

  const thickCloud = clippedThick(c.thickCloud, c.cloudCover)
  const { covers, source } = layerCovers({ cloudCover: c.cloudCover, thickCloud })
  // Open-Meteo's current precipitation and snowfall are 15-minute totals. The scene uses hourly rates.
  const shown = { ...c, precipitation: c.precipitation * 4, snowfall: c.snowfall * 4 }
  const observation: Weather = {
    ...shown, thickCloud, covers,
    cloudSource: source,
    ...weatherEffects(shown),
    directionSource: 'current',
    windAloft: background?.windAloft ?? { low: null, mid: null, high: null },
    visibilitySource: c.visibility != null ? 'current' : background?.visibilitySource ?? (c.humidity == null ? 'default' : 'humidity'),
    visibilityKm: c.visibility != null ? c.visibility / 1000 : background?.visibilityKm ?? visibilityFromHumidity(c.humidity ?? 0),
    humidity: c.humidity,
    snowDepth: background?.snowDepth ?? 0,
    pm10: background?.pm10 ?? a?.pm10 ?? null,
    dust: background?.dust ?? a?.dust ?? null,
  }
  if (!background) return observation

  const age = Math.abs(atMs - utcOf(c.time, timezone).getTime()) / 60_000
  const ageWeight = 1 - smoothstep(15, 45, age)
  const weight = ageWeight * forecastArrivalProgress(forecast, nowMs)
  return weight === 0 ? background : mixWeather(background, observation, weight)
}
