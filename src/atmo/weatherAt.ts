import { utcOf } from '../astro/utc'
import { forecastObservation, readingWeight } from '../domain/forecastRefresh'
import type { AirPoint, Forecast, LocalTime } from '../domain/types'
import { visibilityFromHumidity } from '../world/air'
import { rainRate } from '../world/airParts'
import { layerCovers } from '../world/clouds'
import { isFogCode, nightMinimum } from '../world/mist'
import { fallingSnowAmount, isSnowHour } from '../world/snowLine'
import type { AirInput } from './airTypes'
import { bracketAt } from '../domain/bracket'
import { fieldWeather } from './fieldWeather'
import { cloudMist, mixWeather, type Weather } from './weatherMix'

function weatherEffects({ weatherCode, precipitation, snowfall, temperature, humidity }: PhaseInput, hourlySnow = false, cape = null as number | null) {
  const fallingSnow = fallingSnowAmount(weatherCode, snowfall)
  const rainMmH = hourlySnow ? 0 : rainRate({ weatherCode, precipitation, snowfall, temperature })
  return {
    rainMmH,
    fallingSnow,
    snowCloudRate: fallingSnow > 0 ? Math.max(0.1, snowfall) : 0,
    thunderWeight: Number(weatherCode >= 95),
    showerWeight: hourlySnow ? 0 : Number(weatherCode >= 80 && weatherCode <= 82),
    fieldWeather: fieldWeather(weatherCode, rainMmH, humidity, cape),
  }
}

type PhaseInput = Pick<AirInput, 'weatherCode' | 'precipitation' | 'snowfall' | 'temperature' | 'humidity'>

const airAt = (air: AirPoint[] | null, at: LocalTime) => air?.find((point) => point.time === at)
const clippedThick = (thick: number | null | undefined, total: number) => thick == null ? null : Math.min(thick, total)

/** What one forecast says of a minute. How it took over from an earlier one is `blendForecast`'s alone to weigh. */
export function weatherAt(forecast: Forecast, at: LocalTime, atMs: number, timezone: string,
  forced?: Partial<AirInput> | null): Weather {
  const forcedCloud = forced && ('cloudCover' in forced || 'thickCloud' in forced) ? forced : undefined
  const phase = (source: PhaseInput) => ({
    weatherCode: forced?.weatherCode ?? source.weatherCode,
    precipitation: forced?.precipitation ?? source.precipitation,
    snowfall: forced?.snowfall ?? source.snowfall,
    temperature: forced?.temperature ?? source.temperature,
    humidity: forced && 'humidity' in forced ? forced.humidity ?? null : source.humidity,
  })
  // A forced weather code is a chosen sky: the forecast's CAPE does not weigh it.
  const capeOf = (row?: { cape?: number | null }) => forced?.weatherCode === undefined ? row?.cape ?? null : null
  // A chosen temperature is a chosen air: the forecast's freezing level does not stand over it.
  const freezingOf = (row?: { freezingLevel?: number | null }) => forced?.temperature === undefined ? row?.freezingLevel ?? null : null
  const c = forecastObservation(forecast)
  const { before: hour, after: next, fraction } = bracketAt(forecast.hours, at)
  const backgroundTemp = hour && next ? hour.temperature + (next.temperature - hour.temperature) * fraction : hour?.temperature
  const nightMinTemp = nightMinimum(forecast.hours, at, backgroundTemp) ?? c.temperature

  const hourly = (row: NonNullable<typeof hour>): Weather => {
    const air = airAt(forecast.air, row.time)
    const reportedVisibilityKm = row.visibility == null ? null : row.visibility / 1000
    const { covers, source } = layerCovers({ cloudCover: forcedCloud?.cloudCover ?? row.cloudCover,
      thickCloud: forcedCloud && 'thickCloud' in forcedCloud ? forcedCloud.thickCloud : row.thickCloud, hour: row })
    const sourcePhase = phase({ ...row, snowfall: 0 })
    const snow = isSnowHour(sourcePhase)
    // Open-Meteo's conversion: 10 mm water equivalent gives 7 cm of fresh snow.
    const shown = { ...row, feelsLike: row.temperature,
      snowfall: forced?.snowfall ?? (snow ? 0.7 * sourcePhase.precipitation : 0) }
    return {
      ...shown,
      ...weatherEffects({ ...sourcePhase, snowfall: shown.snowfall }, snow, capeOf(row)),
      freezingLevel: freezingOf(row),
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
        ...cloudMist(covers, source),
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
  const thickCloud = clippedThick(c.thickCloud, c.cloudCover)
  const { covers, source } = forcedCloud && background ? { covers: background.covers, source: background.cloudSource }
    : layerCovers({ cloudCover: forcedCloud?.cloudCover ?? c.cloudCover,
      thickCloud: forcedCloud && 'thickCloud' in forcedCloud ? forcedCloud.thickCloud : thickCloud, hour: c })
  // Open-Meteo's current precipitation and snowfall are 15-minute totals. The scene uses hourly rates.
  const shown = { ...c, precipitation: c.precipitation * 4, snowfall: c.snowfall * 4 }
  const observation: Weather = {
    ...shown, thickCloud, covers,
    cloudSource: source,
    ...weatherEffects(phase(shown), false, capeOf(hour)),
    freezingLevel: background?.freezingLevel ?? freezingOf(hour),
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
      ...cloudMist(covers, source),
      nightMinTemp,
    },
  }
  if (!background) return observation

  const minutesOff = (atMs - utcOf(c.time, timezone).getTime()) / 60_000
  const weight = readingWeight(minutesOff)
  return weight === 0 ? background : mixWeather(background, observation, weight)
}
