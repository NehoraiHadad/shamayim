import { climatologyAt, type ClimatologySample } from '../data/land/climatology'
import { MIN_CELL_VALID } from '../data/land/coverMeans'
import type { FarSample } from '../data/land/gibs'
import type { CoverSource } from '../data/land/landData'
import type { PreparedLandSampler } from '../data/land/sampleLand'
import type { LandSource } from '../data/land/types'
import {
  blendLinearRgb, blendScalar, coverMeanWindow, modisNdviWindow, modisSrWindow,
  NEAR_PRIORITY_MIN_WEIGHT, singleDayWindow, TAU_DAYS, windowWeight,
  type LivingLandSource, type ObservationWindow,
} from './landAgeBlend'
import { linearRgbToSrgb, tciRgbToReflectance } from './landRadiometry'
import { farRgbToReflectance, type FarGain } from './landReflectance'
import type { RGB } from './types'

/**
 * One living-land sample: per-channel date-aware source selection (`near S2 -> far GIBS -> s2-mean ->
 * climatology`), unified reflectance scaling (`landReflectance.ts`), and causal as-of age blending
 * (`landAgeBlend.ts`). Operational Sentinel-2 L2A is already DEM terrain-corrected by Sen2Cor
 * (`landRadiometry.ts`), so no second Lambertian de-lighting is applied.
 */
export interface LivingLandSample {
  /** WorldCover class index (`1..10`), or null where unknown / outside loaded coverage. */
  cover: number | null
  /** WorldCover product vintage and winning layer (`worldcover-2021:*` or `unknown`). */
  coverSource: CoverSource
  /** Surface albedo in sRGB `0..1` (IEC 61966-2-1 encoding of linear BOA reflectance). */
  albedo: RGB; albedoSource: LivingLandSource; albedoDate: string | null
  ndvi: number; ndviSource: LivingLandSource; ndviDate: string | null
  dryness: number; drynessSource: LivingLandSource; drynessDate: string | null
  snow: number; snowSource: LivingLandSource; snowDate: string | null
}

interface Candidate<T> { value: T; source: LandSource; win: ObservationWindow }
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

/** Picks the winning candidate per channel lazily, skipping far/mean when near weight >= 1/e. */
function pickCandidate<T>(
  near: Candidate<T> | null, getFar: () => Candidate<T> | null, getMean: () => Candidate<T> | null,
  shownUtcDate: string, tau: number,
): Candidate<T> | null {
  const wNear = near ? windowWeight(shownUtcDate, near.win, tau) : 0
  if (wNear >= NEAR_PRIORITY_MIN_WEIGHT) return near

  const far = getFar()
  const wFar = far ? windowWeight(shownUtcDate, far.win, tau) : 0
  let best: Candidate<T> | null = null, bestW = 0
  if (wNear > 0 && wNear >= wFar) { best = near; bestW = wNear }
  else if (wFar > 0) { best = far; bestW = wFar }
  if (bestW >= NEAR_PRIORITY_MIN_WEIGHT) return best

  const mean = getMean()
  return (mean ? windowWeight(shownUtcDate, mean.win, tau) : 0) > bestW ? mean : best
}

/** What sees one point; the far grid and the cover's mean are read only when asked. */
function observersAt(sampler: PreparedLandSampler, lat: number, lon: number, cover: number | null) {
  let farLoaded = false, farVal: FarSample | null = null
  let meanLoaded = false, meanVal: ReturnType<PreparedLandSampler['coverMeanAt']> = null
  return {
    near: sampler.nearAt(lat, lon),
    far: () => (farLoaded ? farVal : ((farLoaded = true), (farVal = sampler.farAt(lat, lon)))),
    mean: () => (meanLoaded ? meanVal : ((meanLoaded = true), (meanVal = cover !== null ? sampler.coverMeanAt(cover) : null))),
  }
}

function albedoOf(seen: ReturnType<typeof observersAt>, shownUtcDate: string, farGain: FarGain, clim: () => ClimatologySample) {
  const { near, far, mean } = seen
  const choice = pickCandidate<RGB>(
    near?.rgb && near.rgbValid >= MIN_CELL_VALID && near.rgbSource && near.rgbDate
      ? { value: near.rgb, source: near.rgbSource, win: singleDayWindow(near.rgbDate, 'utc') } : null,
    () => {
      const f = far(), win = f?.rgb && f.rgbSource && f.rgbDate ? modisSrWindow(f.rgbDate) : null
      return win ? { value: f!.rgb!, source: f!.rgbSource!, win } : null
    },
    () => {
      const m = mean()
      if (!m?.mean.rgb) return null
      const [lo, hi] = m.mean.rgbDateRange ?? [m.mean.rgbDate ?? m.tableDate, m.mean.rgbDate ?? m.tableDate]
      return { value: m.mean.rgb, source: `s2-mean:${lo}`, win: coverMeanWindow(lo, hi) }
    },
    shownUtcDate, TAU_DAYS.albedo,
  )
  if (!choice) return { rho: tciRgbToReflectance(clim().rgb), source: 'climatology' as LivingLandSource, date: null }
  const obsRho = choice.source.startsWith('gibs:') ? farRgbToReflectance(choice.value, farGain) : tciRgbToReflectance(choice.value)
  const climRho = windowWeight(shownUtcDate, choice.win, TAU_DAYS.albedo) < 1 ? tciRgbToReflectance(clim().rgb) : obsRho
  const { rgb, source, date } = blendLinearRgb(obsRho, climRho, choice.source, choice.win, shownUtcDate, TAU_DAYS.albedo)
  return { rho: rgb, source, date }
}

/** The albedo of a cell of known cover alone (linear), with the climatology the caller gives for its class. */
export const albedoAt = (
  sampler: PreparedLandSampler, lat: number, lon: number, cover: number, shownUtcDate: string, farGain: FarGain, clim: () => ClimatologySample,
) => albedoOf(observersAt(sampler, lat, lon, cover), shownUtcDate, farGain, clim)

function blendChoice(choice: Candidate<number> | null, shownDate: string, tau: number, clim: () => number) {
  if (!choice) return { value: clim(), source: 'climatology' as const, date: null }
  const needsClim = windowWeight(shownDate, choice.win, tau) < 1
  return blendScalar(choice.value, needsClim ? clim() : choice.value, choice.source, choice.win, shownDate, tau)
}

/** Samples, selects per-channel by age, scales and blends the land at one point for `(shownDate, shownUtcDate)`. */
export function samplePoint(
  sampler: PreparedLandSampler, lat: number, lon: number, elevationM: number,
  shownDate: string, shownUtcDate: string, month: number, farGain: FarGain,
): LivingLandSample {
  const { cover, source: coverSource } = sampler.coverAt(lat, lon)
  const seen = observersAt(sampler, lat, lon, cover), { near } = seen
  let clim: ClimatologySample | null = null
  const getClim = () => (clim ??= climatologyAt(lat, lon, elevationM, month, cover ?? 0))
  const albedo = albedoOf(seen, shownUtcDate, farGain, getClim)

  const nearNdvi: Candidate<number> | null =
    near && near.ndvi !== null && near.ndviValid >= MIN_CELL_VALID && near.ndviSource && near.ndviDate
      ? { value: near.ndvi, source: near.ndviSource, win: singleDayWindow(near.ndviDate, 'utc') } : null
  const ndviChoice = pickCandidate(
    nearNdvi,
    () => {
      const f = seen.far(), win = f && f.ndvi !== null && f.ndviSource && f.ndviDate ? modisNdviWindow(f.ndviDate) : null
      return win ? { value: f!.ndvi!, source: f!.ndviSource!, win } : null
    },
    () => {
      const m = seen.mean()
      if (!m || m.mean.ndvi === null) return null
      const [lo, hi] = m.mean.ndviDateRange ?? [m.mean.ndviDate ?? m.tableDate, m.mean.ndviDate ?? m.tableDate]
      return { value: m.mean.ndvi, source: `s2-mean:${lo}`, win: coverMeanWindow(lo, hi) }
    },
    shownUtcDate, TAU_DAYS.ndvi,
  )
  const ndvi = blendChoice(ndviChoice, shownUtcDate, TAU_DAYS.ndvi, () => getClim().ndvi)
  const wx = sampler.weather
  const dry = blendChoice(
    wx ? { value: wx.dryness, source: wx.source, win: singleDayWindow(wx.date, 'local') } : null,
    shownDate, TAU_DAYS.dryness, () => getClim().dryness,
  )
  const snowChoice: Candidate<number> | null =
    near && near.snow !== null && near.valid >= MIN_CELL_VALID && near.snowSource && near.snowDate
      ? { value: near.snow, source: near.snowSource, win: singleDayWindow(near.snowDate, 'utc') } : null
  const snow = blendChoice(snowChoice, shownUtcDate, TAU_DAYS.snow, () => getClim().snowProb)

  return {
    cover, coverSource, albedo: linearRgbToSrgb(albedo.rho), albedoSource: albedo.source, albedoDate: albedo.date,
    ndvi: clamp(ndvi.value, -1, 1), ndviSource: ndvi.source, ndviDate: ndvi.date,
    dryness: clamp(dry.value, 0, 1), drynessSource: dry.source, drynessDate: dry.date,
    snow: clamp(snow.value, 0, 1), snowSource: snow.source, snowDate: snow.date,
  }
}
