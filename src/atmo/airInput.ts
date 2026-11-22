import { sunPosition } from '../astro/sun'
import { utcOf } from '../astro/utc'
import { blendForecast } from '../domain/forecastRefresh'
import { correctCloudCover, type CloudObservation } from '../domain/observedCloud'
import { datePart } from '../domain/time'
import type { Forecast, LocalTime } from '../domain/types'
import { layerCovers, unionOf } from '../world/clouds'
import type { AirInput } from './airTypes'
import { weatherAt, weatherEffects } from './weatherAt'
import { mixWeather, type Weather } from './weatherMix'

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

export interface AirTimeline {
  /** Receipt clock for a pinned scene; ordinary live and scrub use the app's current minute. */
  arrivalMs?: number
  observedCloud?: CloudObservation | null
}

function correctedWeather(weather: Weather, cover: number): Weather {
  if (cover === weather.cloudCover) return weather
  const { low, mid, high } = weather.covers
  const thickCloud = weather.thickCloud == null ? null : Math.min(cover, weather.thickCloud)
  const union = unionOf(weather.covers)
  const correctedUnion = Math.max(0, Math.min(100, union * 100 + cover - weather.cloudCover))
  const { covers } = layerCovers({ cloudCover: correctedUnion, thickCloud, hour: union > 0
    ? { cloudLow: low * 100, cloudMid: mid * 100, cloudHigh: high * 100 } : undefined })
  return { ...weather, cloudCover: cover, thickCloud, covers }
}

/** Sample live or scrub weather at the viewed minute and evaluate arrivals at the app's current minute. */
export function airInput(forecast: Forecast, now: LocalTime, site: SkySite, selected: LocalTime | null,
  forced?: Partial<AirInput> | null, { arrivalMs, observedCloud }: AirTimeline = {}): AirInput & Weather {
  const at = selected ?? now
  const instant = utcOf(at, site.timezone)
  const nowInstant = at === now ? instant : utcOf(now, site.timezone)
  const nowMs = arrivalMs ?? nowInstant.getTime()
  const forcedCloud = forced && ('cloudCover' in forced || 'thickCloud' in forced) ? forced : undefined
  const sample = (minute: LocalTime, ms: number) =>
    blendForecast(forecast, nowMs, (source) => weatherAt(source, minute, ms, nowMs, site.timezone, forcedCloud), mixWeather)
  const weather = sample(at, instant.getTime())
  const cover = observedCloud
    ? correctCloudCover(observedCloud, now, at, nowMs, (at === now ? weather : sample(now, nowInstant.getTime())).cloudCover,
      weather.cloudCover)
    : weather.cloudCover
  const shown = {
    ...(forcedCloud ? { ...weather, cloudCover: cover } : correctedWeather(weather, cover)),
    date: datePart(at),
    localHour: Number(at.slice(11, 13)) + Number(at.slice(14, 16)) / 60,
    sunElevation: Math.max(-18, sunPosition(instant, site.lat, site.lon).altitude),
    preview: selected !== null,
    ...forced,
  }
  if (forced && ('dust' in forced || 'pm10' in forced)) shown.dustConcentration = shown.dust ?? shown.pm10 ?? 0
  if (forced && 'pm10' in forced) shown.opticalPm10 = shown.pm10 ?? 0
  if (forced && ('weatherCode' in forced || 'precipitation' in forced || 'snowfall' in forced || 'temperature' in forced)) {
    return { ...shown, ...weatherEffects(shown) }
  }
  return shown
}
