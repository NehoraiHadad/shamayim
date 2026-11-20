import { climatologyAt, type ClimatologySample } from '../data/land/climatology'
import type { PreparedLandSampler } from '../data/land/sampleLand'
import type { LandSample, LandSource } from '../data/land/types'
import { blendLinearRgb, blendScalar, observationWeight, TAU_DAYS, type LivingLandSource } from './landAgeBlend'
import { delightReflectance, linearRgbToSrgb, tciRgbToReflectance, type DelightStatus, type Vec3 } from './landDelight'
import { farRgbToReflectance, type FarGain } from './landReflectance'
import type { RGB } from './types'

/**
 * One living-land sample: the data side's lazy fallback chain (`sampleLand.ts`), put on one reflectance scale
 * (`landReflectance.ts`), de-lit where the geometry allows (`landDelight.ts`) and age-blended toward the shown date's
 * climatology (`landAgeBlend.ts`). Pure; reads only coordinates, elevation, dates and data.
 */
export interface LivingLandSample {
  /** WorldCover class index (`1..10`), or null where unknown / outside loaded coverage. */
  cover: number | null
  /** Light-free surface albedo in sRGB `0..1` (IEC 61966-2-1 encoding of de-lit linear BOA reflectance). */
  albedo: RGB; albedoSource: LivingLandSource; albedoDate: string | null
  /** Whether topographic de-lighting was applied to the RGB observation or why it was skipped. */
  delit: DelightStatus
  ndvi: number; ndviSource: LivingLandSource; ndviDate: string | null
  dryness: number; drynessSource: LivingLandSource; drynessDate: string | null
  snow: number; snowSource: LivingLandSource; snowDate: string | null
}

type ObservedSource = LandSource | `s2:${string}:no-delight`
interface Observed { rho: [number, number, number]; source: ObservedSource; delit: DelightStatus }

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

/** The observed RGB as linear BOA reflectance on one scale; only direct near S2 cells are de-lit. */
function observedReflectance(raw: LandSample, normal: Vec3 | null, farGain: FarGain): Observed {
  if (raw.rgbSource.startsWith('s2:')) {
    const dl = delightReflectance(tciRgbToReflectance(raw.rgb), raw.rgbSunElevation, raw.rgbSunAzimuth, normal)
    const source = dl.status === 'lambert' ? raw.rgbSource : (`${raw.rgbSource}:no-delight` as `s2:${string}:no-delight`)
    return { rho: dl.rho, source, delit: dl.status }
  }
  if (raw.rgbSource.startsWith('gibs:')) return { rho: farRgbToReflectance(raw.rgb, farGain), source: raw.rgbSource, delit: 'none' }
  // `s2-mean:` per-cover means of near TCI over many slopes: the terrain illumination averages out, so not de-lit.
  return { rho: tciRgbToReflectance(raw.rgb), source: raw.rgbSource, delit: 'none' }
}

function albedoOf(raw: LandSample, clim: () => ClimatologySample, shownDate: string, normal: Vec3 | null, farGain: FarGain) {
  if (raw.rgbSource === 'climatology') {
    return { albedo: linearRgbToSrgb(tciRgbToReflectance(raw.rgb)), albedoSource: 'climatology' as const, albedoDate: null, delit: 'none' as const }
  }
  const obs = observedReflectance(raw, normal, farGain)
  const w = observationWeight(shownDate, raw.rgbDate, TAU_DAYS.albedo)
  const climRho = w < 1 ? tciRgbToReflectance(clim().rgb) : obs.rho
  const b = blendLinearRgb(obs.rho, climRho, obs.source, raw.rgbDate, shownDate, TAU_DAYS.albedo)
  return { albedo: linearRgbToSrgb(b.rgb), albedoSource: b.source, albedoDate: b.date, delit: b.weight > 0 ? obs.delit : 'none' }
}

/** Blends one scalar channel; climatology is evaluated only when the observation is not fully current. */
function channelOf(obs: number, source: LandSource, date: string | null, tau: number, shownDate: string, clim: () => number) {
  const needsClim = source !== 'climatology' && observationWeight(shownDate, date, tau) < 1
  return blendScalar(obs, needsClim ? clim() : obs, source, date, shownDate, tau)
}

/** Samples, scales, de-lights and age-blends the land at one point for `shownDate` (season = its `month`). */
export function samplePoint(
  sampler: PreparedLandSampler, lat: number, lon: number, elevationM: number,
  shownDate: string, month: number, normal: Vec3 | null, farGain: FarGain,
): LivingLandSample {
  const raw = sampler.sampleAt(lat, lon, month, elevationM)
  let clim: ClimatologySample | null = null
  const getClim = () => (clim ??= climatologyAt(lat, lon, elevationM, month, raw.cover ?? 0))
  const a = albedoOf(raw, getClim, shownDate, normal, farGain)
  const ndvi = channelOf(raw.ndvi, raw.ndviSource, raw.ndviDate, TAU_DAYS.ndvi, shownDate, () => getClim().ndvi)
  const dry = channelOf(raw.dryness, raw.drynessSource, raw.drynessDate, TAU_DAYS.dryness, shownDate, () => getClim().dryness)
  const snow = channelOf(raw.snowProb, raw.snowSource, raw.snowDate, TAU_DAYS.snow, shownDate, () => getClim().snowProb)
  return {
    cover: raw.cover, ...a,
    ndvi: clamp(ndvi.value, -1, 1), ndviSource: ndvi.source, ndviDate: ndvi.date,
    dryness: clamp(dry.value, 0, 1), drynessSource: dry.source, drynessDate: dry.date,
    snow: clamp(snow.value, 0, 1), snowSource: snow.source, snowDate: snow.date,
  }
}
