import type { WindVector } from '../domain/types'
import type { Covers } from '../world/clouds'
import type { WorldSources } from '../world/types'
import { ALOFT_FACTOR } from '../world/wind'
import type { AirInput } from './airTypes'

export type Weather = Omit<AirInput, 'date' | 'localHour' | 'sunElevation' | 'preview' | 'cloudsSeen' | 'fallingSnow' | 'snowCloudRate' | 'thunderWeight' | 'showerWeight'> & {
  rainMmH: number
  fallingSnow: number
  snowCloudRate: number
  thunderWeight: number
  showerWeight: number
  covers: Covers
  windAloft: { low: WindVector | null; mid: WindVector | null; high: WindVector | null }
  cloudSource: WorldSources['cloudLayers']
  visibilitySource: WorldSources['visibility']
  directionSource: WorldSources['windDirection']
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Shortest arc in degrees, so 350° → 10° passes through north. */
function lerpDirection(a: number, b: number, t: number): number {
  const delta = ((b - a + 540) % 360) - 180
  return (a + delta * t + 360) % 360
}

const mixKnown = (a: number | null, b: number | null, t: number) => a === null || b === null ? a ?? b : lerp(a, b, t)

export function mixWeather(a: Weather, b: Weather, t: number): Weather {
  const nearest = t < 0.5 ? a : b
  const aloft = (level: keyof Weather['windAloft']): WindVector | null => {
    if (!a.windAloft[level] && !b.windAloft[level]) return null
    const from = a.windAloft[level] ?? { speed: a.windSpeed * ALOFT_FACTOR[level], fromDeg: a.windDirection }
    const to = b.windAloft[level] ?? { speed: b.windSpeed * ALOFT_FACTOR[level], fromDeg: b.windDirection }
    return { speed: lerp(from.speed, to.speed, t), fromDeg: lerpDirection(from.fromDeg, to.fromDeg, t) }
  }
  return {
    weatherCode: nearest.weatherCode,
    cloudSource: nearest.cloudSource,
    visibilitySource: nearest.visibilitySource,
    directionSource: nearest.directionSource,
    temperature: lerp(a.temperature, b.temperature, t),
    feelsLike: lerp(a.feelsLike, b.feelsLike, t),
    cloudCover: lerp(a.cloudCover, b.cloudCover, t),
    thickCloud: lerp(a.thickCloud ?? a.cloudCover, b.thickCloud ?? b.cloudCover, t),
    windSpeed: lerp(a.windSpeed, b.windSpeed, t),
    windGusts: lerp(a.windGusts, b.windGusts, t),
    windDirection: lerpDirection(a.windDirection, b.windDirection, t),
    windAloft: { low: aloft('low'), mid: aloft('mid'), high: aloft('high') },
    precipitation: lerp(a.precipitation, b.precipitation, t),
    rainMmH: lerp(a.rainMmH, b.rainMmH, t),
    fallingSnow: lerp(a.fallingSnow, b.fallingSnow, t),
    snowCloudRate: lerp(a.snowCloudRate, b.snowCloudRate, t),
    thunderWeight: lerp(a.thunderWeight, b.thunderWeight, t),
    showerWeight: lerp(a.showerWeight, b.showerWeight, t),
    snowfall: lerp(a.snowfall, b.snowfall, t),
    snowDepth: lerp(a.snowDepth, b.snowDepth, t),
    visibilityKm: lerp(a.visibilityKm ?? 40, b.visibilityKm ?? 40, t),
    humidity: mixKnown(a.humidity, b.humidity, t),
    pm10: mixKnown(a.pm10, b.pm10, t),
    dust: mixKnown(a.dust, b.dust, t),
    covers: { low: lerp(a.covers.low, b.covers.low, t), mid: lerp(a.covers.mid, b.covers.mid, t),
      high: lerp(a.covers.high, b.covers.high, t) },
  }
}
