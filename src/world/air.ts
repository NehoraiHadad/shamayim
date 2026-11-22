import type { AirInput } from '../atmo/airTypes'
import type { CurrentWeather, HourPoint, LocalTime } from '../domain/types'
import { haze, heat, rainRate, visibilityKm } from './airParts'
import { mistOf, nightMinimum, NO_MIST } from './mist'
import type { Air, Body, RGB, WorldSources } from './types'

/** sRGB 0–1 of a `#rrggbb` colour. */
export const rgbOf = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as unknown as RGB

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
  /** The shown air (now's, or the picked hour's), as `airInput` reduces it. */
  shown: AirInput
  /** The picked hour's own visibility (m), when the forecast gives it. */
  hourVisibilityM?: number | null
  preview: boolean
  /** `?wx=vis:…` set the visibility. */
  forcedVisibility: boolean
  /** Diurnal and dynamical context for mist (`mist.ts`); omitted where mist is unused (returns `NO_MIST`). */
  mist?: {
    sun: Pick<Body, 'altitude' | 'azimuth'>
    windMs: number
    current?: Pick<CurrentWeather, 'cloudLow' | 'cloudMid'> | null
    hour?: Pick<HourPoint, 'cloudLow' | 'cloudMid'> | null
    forced?: Partial<AirInput> | null
    forcedLayers?: { low: number; mid: number; high: number } | null
    hours?: readonly Pick<HourPoint, 'time' | 'temperature'>[]
    at?: LocalTime
  }
}

/** The visibility the world uses (km, before dust) and where it came from. */
export function chooseVisibility(input: AirSourceInput): { km: number; source: WorldSources['visibility'] } {
  const { shown, hourVisibilityM, preview, forcedVisibility } = input
  if (forcedVisibility && shown.visibilityKm !== null) return { km: shown.visibilityKm, source: 'forced' }
  if (!preview && shown.visibilityKm !== null) return { km: shown.visibilityKm, source: 'current' }
  if (hourVisibilityM != null) return { km: hourVisibilityM / 1000, source: 'hour' }
  if (shown.humidity !== null) return { km: visibilityFromHumidity(shown.humidity), source: 'humidity' }
  return { km: 40, source: 'default' }
}

/** Raw low/mid cloud cover (0–100) for mist: never the renderer's rescaled `covers`. */
function rawCloudLayers(m: NonNullable<AirSourceInput['mist']>, preview: boolean, shown: AirInput) {
  if (m.forcedLayers) return { lowCloudPct: m.forcedLayers.low * 100, midCloudPct: m.forcedLayers.mid * 100, thickCloudPct: null }
  if (m.forced && ('cloudCover' in m.forced || 'thickCloud' in m.forced)) {
    return { lowCloudPct: null, midCloudPct: null, thickCloudPct: m.forced.thickCloud ?? m.forced.cloudCover ?? shown.cloudCover }
  }
  const totalCloudPct = shown.cloudCover
  const lowCloudPct = preview ? (m.hour?.cloudLow ?? null) : (m.current?.cloudLow ?? m.hour?.cloudLow ?? null)
  const midCloudPct = preview ? (m.hour?.cloudMid ?? null) : (m.current?.cloudMid ?? m.hour?.cloudMid ?? null)
  return { lowCloudPct, midCloudPct, thickCloudPct: shown.thickCloud ?? shown.cloudCover, totalCloudPct }
}

/** The air: visibility and haze, the aerial perspective every plane fades by, the horizon band and heat shimmer. */
export function airOf(input: AirSourceInput): { air: Air; source: WorldSources['visibility'] } {
  const { km, source } = chooseVisibility(input)
  const shown = { ...input.shown, visibilityKm: km }
  const r = rainRate(shown)
  const hot = heat(shown, r)
  const h = haze(shown, r, hot.bloom > 0)
  const v = visibilityKm(shown)
  const dust = (shown.dust ?? shown.pm10 ?? 0) >= 50
  const tint = rgbOf(h.color)
  const mist = input.mist ? mistOf({
    humidity: shown.humidity,
    visibilityKm: km,
    visibilitySource: source,
    weatherCode: shown.weatherCode,
    dust,
    rainRateMmH: r,
    ...rawCloudLayers(input.mist, input.preview, shown),
    windMs: input.mist.windMs,
    sunAltitude: input.mist.sun.altitude,
    sunRising: input.mist.sun.azimuth < 180,
    temperature: shown.temperature,
    nightMinTemp: input.mist.hours && input.mist.at ? nightMinimum(input.mist.hours, input.mist.at) : null,
  }) : NO_MIST
  return {
    source,
    air: {
      visibilityKm: v,
      humidity: shown.humidity,
      dust,
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
