import type { AirInput } from '../atmo/airTypes'
import type { Weather } from '../atmo/weatherMix'
import { dustShare, haze, heat, rainRate, visibilityKm } from './airParts'
import { blockingCloudCover, isFogCode, mistOf, NO_MIST } from './mist'
import type { Air, Body, RGB, WorldSources } from './types'

/** sRGB 0–1 of a `#rrggbb` colour. */
export const rgbOf = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as unknown as RGB

/** How much dust and haze flatten the sun into a pale coin. */
export const coinOf = ({ dustWeight, farFade }: Pick<Air, 'dustWeight' | 'farFade'>) => dustWeight * farFade

/** Koschmieder: the extinction that leaves 2 % contrast at the visibility, per km. */
const KOSCHMIEDER = 3.912

/**
 * Visibility (km) from relative humidity when the forecast gives none (a marked fallback): clear dry air ~40 km; moist
 * air swells the haze particles, ~18 km at 75 %, ~8 km at 90 %, 4 km saturated.
 */
export function visibilityFromHumidity(humidity: number): number {
  return 40 * 10 ** -((Math.max(0, humidity - 50) / 50) ** 1.5)
}

export interface AirSourceInput {
  /** The blended air at the live or selected minute. */
  shown: AirInput
  visibilitySource: WorldSources['visibility']
  /** `?wx=vis:…` set the visibility. */
  forcedVisibility: boolean
  /** Diurnal and dynamical context for mist (`mist.ts`); omitted where mist is unused (returns `NO_MIST`). */
  mist?: {
    sun: Pick<Body, 'altitude' | 'azimuth'>
    windMs: number
    weather: Pick<Weather['mist'], 'humidityWeight' | 'weightedHumidity' | 'visibilityWeight' | 'weightedVisibilityKm' | 'fogCodeWeight'
      | 'lowCloudPct' | 'blockingCloudPct' | 'nightMinTemp'>
    forced?: Partial<AirInput> | null
    forcedLayers?: { low: number; mid: number; high: number } | null
  }
}

/** The visibility the world uses (km, before dust) and where it came from. */
export function chooseVisibility(input: AirSourceInput): { km: number; source: WorldSources['visibility'] } {
  const { shown, visibilitySource, forcedVisibility } = input
  if (shown.visibilityKm !== null) return { km: shown.visibilityKm, source: forcedVisibility ? 'forced' : visibilitySource }
  if (shown.humidity !== null) return { km: visibilityFromHumidity(shown.humidity), source: 'humidity' }
  return { km: 40, source: 'default' }
}

/** Raw low/mid cloud cover (0–100) for mist: never the renderer's rescaled `covers`. */
function rawCloudLayers(m: NonNullable<AirSourceInput['mist']>, shown: AirInput) {
  if (m.forcedLayers) {
    const lowCloudPct = m.forcedLayers.low * 100
    return { lowCloudPct, blockingCloudPct: blockingCloudCover(lowCloudPct, m.forcedLayers.mid * 100, 0) }
  }
  if (m.forced && ('cloudCover' in m.forced || 'thickCloud' in m.forced)) {
    return { lowCloudPct: 0, blockingCloudPct: m.forced.thickCloud ?? m.forced.cloudCover ?? shown.cloudCover }
  }
  return { lowCloudPct: m.weather.lowCloudPct, blockingCloudPct: m.weather.blockingCloudPct, totalCloudPct: shown.cloudCover }
}

/** The air: visibility and haze, the aerial perspective every plane fades by, the horizon band and heat shimmer. */
export function airOf(input: AirSourceInput): { air: Air; source: WorldSources['visibility'] } {
  const { km, source } = chooseVisibility(input)
  const shown = { ...input.shown, visibilityKm: km }
  const r = rainRate(shown)
  const hot = heat(shown, r)
  const h = haze(shown, r, hot.bloom > 0)
  const v = visibilityKm(shown)
  const dustWeight = dustShare(shown)
  const tint = rgbOf(h.color)
  const m = input.mist
  const forcedVisibility = input.forcedVisibility && input.shown.visibilityKm !== null
  const visibilityWeight = forcedVisibility ? 1 : m?.weather.visibilityWeight ?? 0
  const forcedHumidity = m?.forced && 'humidity' in m.forced
  const humidityWeight = forcedHumidity ? Number(shown.humidity != null) : m?.weather.humidityWeight ?? 0
  const mist = m ? mistOf({
    humidity: forcedHumidity || humidityWeight === 0 ? shown.humidity : m.weather.weightedHumidity / humidityWeight,
    humidityWeight,
    visibilityKm: !forcedVisibility && visibilityWeight > 0 ? m.weather.weightedVisibilityKm / visibilityWeight : km,
    visibilityWeight,
    fogCodeWeight: forcedVisibility ? 0 : m.forced && 'weatherCode' in m.forced
      ? Number(isFogCode(shown.weatherCode)) * (1 - visibilityWeight) : m.weather.fogCodeWeight,
    dustWeight,
    rainRateMmH: r,
    ...rawCloudLayers(m, shown),
    windMs: m.windMs,
    sunAltitude: m.sun.altitude,
    sunRising: m.sun.azimuth < 180,
    temperature: shown.temperature,
    nightMinTemp: m.weather.nightMinTemp,
  }) : NO_MIST
  return {
    source,
    air: {
      visibilityKm: v,
      humidity: shown.humidity,
      dustWeight,
      haze: tint,
      fade: (distanceKm: number) => 1 - Math.exp(-KOSCHMIEDER * Math.max(0, distanceKm) / v),
      farFade: h.farFade,
      nearFade: h.nearFade,
      horizonBand: { rgb: tint, alpha: Math.min(0.7, 0.12 + 0.5 * h.farFade) },
      mist,
      heat: hot.amplitude,
    },
  }
}
