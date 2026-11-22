import { utcOf } from '../astro/utc'
import { forecastArrivalProgress, forecastObservation } from '../domain/forecastRefresh'
import { minutesBetweenLocal } from '../domain/minutes'
import { smoothstep } from '../domain/smoothstep'
import type { AirPoint, Forecast, LocalTime } from '../domain/types'
import { visibilityFromHumidity } from '../world/air'
import { rainRate } from '../world/airParts'
import { layerCovers } from '../world/clouds'
import { blockingCloudCover, isFogCode, nightMinimum } from '../world/mist'
import { fallingSnowAmount, isSnowHour } from '../world/snowLine'
import type { AirInput } from './airTypes'
import { mixWeather, type Weather } from './weatherMix'

export function weatherEffects({ weatherCode, precipitation, snowfall, temperature }:
  Pick<AirInput, 'weatherCode' | 'precipitation' | 'snowfall' | 'temperature'>) {
  const fallingSnow = fallingSnowAmount(weatherCode, snowfall)
  return {
    rainMmH: rainRate({ weatherCode, precipitation, snowfall, temperature }),
    fallingSnow,
    snowCloudRate: fallingSnow > 0 ? Math.max(0.1, snowfall) : 0,
    thunderWeight: Number(weatherCode >= 95),
    showerWeight: Number(weatherCode >= 80 && weatherCode <= 82),
  }
}

const airAt = (air: AirPoint[] | null, at: LocalTime) => air?.find((point) => point.time === at)
const clippedThick = (thick: number | null | undefined, total: number) => thick == null ? null : Math.min(thick, total)

/** Bracket the viewed minute, holding the nearest sample outside the available range. */
function bracketAt<T extends { time: LocalTime }>(points: readonly T[], at: LocalTime) {
  const following = points.findIndex((point) => point.time > at)
  const before = following < 0 ? points.at(-1) : points[Math.max(0, following - 1)]
  const after = following > 0 ? points[following] : undefined
  const fraction = before && after ? minutesBetweenLocal(before.time, at) / minutesBetweenLocal(before.time, after.time) : 0
  return { before, after, fraction }
}

export function weatherAt(forecast: Forecast, at: LocalTime, atMs: number, nowMs: number, timezone: string,
  forcedCloud?: Partial<Pick<AirInput, 'cloudCover' | 'thickCloud'>>): Weather {
  const c = forecastObservation(forecast)
  const { before: hour, after: next, fraction } = bracketAt(forecast.hours, at)
  const backgroundTemp = hour && next ? hour.temperature + (next.temperature - hour.temperature) * fraction : hour?.temperature
  const nightMinTemp = nightMinimum(forecast.hours, at, backgroundTemp) ?? c.temperature

  const hourly = (row: NonNullable<typeof hour>): Weather => {
    const air = airAt(forecast.air, row.time)
    const reportedVisibilityKm = row.visibility == null ? null : row.visibility / 1000
    const { covers, source } = layerCovers({ cloudCover: forcedCloud?.cloudCover ?? row.cloudCover,
      thickCloud: forcedCloud && 'thickCloud' in forcedCloud ? forcedCloud.thickCloud : row.thickCloud, hour: row })
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
      visibilityKm: reportedVisibilityKm ?? visibilityFromHumidity(row.humidity ?? 0),
      pm10: air?.pm10 ?? null,
      opticalPm10: air?.pm10 ?? 0,
      dust: air?.dust ?? null,
      dustConcentration: air?.dust ?? air?.pm10 ?? 0,
      cruise: row.cruise ?? null,
      mist: {
        humidityWeight: Number(row.humidity != null),
        weightedHumidity: row.humidity ?? 0,
        visibilityWeight: Number(reportedVisibilityKm != null),
        weightedVisibilityKm: reportedVisibilityKm ?? 0,
        fogCodeWeight: Number(reportedVisibilityKm == null && isFogCode(row.weatherCode)),
        lowCloudPct: row.cloudLow ?? 0,
        midCloudPct: row.cloudMid ?? 0,
        rawLayerWeight: Number(row.cloudLow != null || row.cloudMid != null),
        blockingCloudPct: blockingCloudCover(row.cloudLow, row.cloudMid, row.thickCloud ?? row.cloudCover),
        nightMinTemp,
      },
      covers,
      cloudSource: source,
      directionSource: row.windDirection != null ? 'hour' : 'current',
      visibilitySource: row.visibility != null ? 'hour' : row.humidity != null ? 'humidity' : 'default',
    }
  }

  const first = hour && hourly(hour)
  const background = first && next ? mixWeather(first, hourly(next), fraction) : first
  const aerosol = background ? null : bracketAt(forecast.air ?? [], at)
  const aerosolValue = (read: (point: AirPoint | undefined) => number) => {
    const before = read(aerosol?.before)
    return aerosol?.after ? before + (read(aerosol.after) - before) * aerosol.fraction : before
  }
  const hourlyMist = background?.mist
  const reportedVisibilityKm = c.visibility == null ? null : c.visibility / 1000
  const visibilityWeight = reportedVisibilityKm != null ? 1 : hourlyMist?.visibilityWeight ?? 0
  const lowCloudPct = c.cloudLow ?? hourlyMist?.lowCloudPct ?? 0
  const midCloudPct = c.cloudMid ?? hourlyMist?.midCloudPct ?? 0
  const rawLayerWeight = c.cloudLow != null || c.cloudMid != null ? 1 : hourlyMist?.rawLayerWeight ?? 0
  const blockingCloudPct = rawLayerWeight > 0
    ? rawLayerWeight * blockingCloudCover(lowCloudPct / rawLayerWeight, midCloudPct / rawLayerWeight, 0) : 0

  const thickCloud = clippedThick(c.thickCloud, c.cloudCover)
  const { covers, source } = forcedCloud && background ? { covers: background.covers, source: background.cloudSource }
    : layerCovers({ cloudCover: forcedCloud?.cloudCover ?? c.cloudCover,
      thickCloud: forcedCloud && 'thickCloud' in forcedCloud ? forcedCloud.thickCloud : thickCloud })
  // Open-Meteo's current precipitation and snowfall are 15-minute totals. The scene uses hourly rates.
  const shown = { ...c, precipitation: c.precipitation * 4, snowfall: c.snowfall * 4 }
  const observation: Weather = {
    ...shown, thickCloud, covers,
    cloudSource: source,
    ...weatherEffects(shown),
    directionSource: 'current',
    windAloft: background?.windAloft ?? { low: null, mid: null, high: null },
    visibilitySource: c.visibility != null ? 'current' : background?.visibilitySource ?? (c.humidity == null ? 'default' : 'humidity'),
    visibilityKm: reportedVisibilityKm ?? background?.visibilityKm ?? visibilityFromHumidity(c.humidity ?? 0),
    humidity: c.humidity,
    snowDepth: background?.snowDepth ?? 0,
    pm10: background?.pm10 ?? aerosol?.before?.pm10 ?? aerosol?.after?.pm10 ?? null,
    opticalPm10: background?.opticalPm10 ?? aerosolValue((point) => point?.pm10 ?? 0),
    dust: background?.dust ?? aerosol?.before?.dust ?? null,
    dustConcentration: background?.dustConcentration ?? aerosolValue((point) => point?.dust ?? point?.pm10 ?? 0),
    cruise: background?.cruise ?? null,
    mist: {
      humidityWeight: Number(c.humidity != null),
      weightedHumidity: c.humidity ?? 0,
      visibilityWeight,
      weightedVisibilityKm: reportedVisibilityKm ?? hourlyMist?.weightedVisibilityKm ?? 0,
      fogCodeWeight: isFogCode(c.weatherCode) ? 1 - visibilityWeight : 0,
      lowCloudPct, midCloudPct, rawLayerWeight,
      blockingCloudPct: blockingCloudPct + (1 - rawLayerWeight) * (thickCloud ?? c.cloudCover),
      nightMinTemp,
    },
  }
  if (!background) return observation

  const age = Math.abs(atMs - utcOf(c.time, timezone).getTime()) / 60_000
  const ageWeight = 1 - smoothstep(15, 45, age)
  const weight = ageWeight * forecastArrivalProgress(forecast, nowMs)
  return weight === 0 ? background : mixWeather(background, observation, weight)
}
