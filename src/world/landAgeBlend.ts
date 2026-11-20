import type { LandSource } from '../data/land/types'

/**
 * Age-based exponential blending of satellite/weather observations toward seasonal climatology.
 *
 * Weight of an observation relative to `shownDate`:
 *   `w = exp(-|ageDays| / tau)`
 * where `|ageDays|` is symmetric for shown dates in either the past or future of the observation
 * (e.g. scrubbing to a forecast day or inspecting a historical date).
 *
 * Time constants (`TAU_DAYS`, heuristic physical timescales):
 * - `albedo = 30 d` (half-life ~21 d): canopy/soil surface colour shifts on a multi-week phenological
 *   and harvest timescale; at 10 d w ≈ 0.72, at 45 d w ≈ 0.22, at 120 d w < 0.02 -> climatology.
 * - `ndvi = 25 d` (half-life ~17 d): photosynthetic greenness reacts slightly faster than bulk
 *   surface colour to rain pulses and senescence (16-day MODIS compositing / 2-4 week phenology).
 * - `dryness = 10 d` (half-life ~7 d): top-soil moisture and near-surface dryness respond on a
 *   1-2 week synoptic drying/recharge scale matching the Stage 1 14-day rain window.
 * - `snow = 5 d` (half-life ~3.5 d): snowpack melts or accumulates over days; a two-week-old snow
 *   observation is stale relative to elevation-aware seasonal climatology.
 */
export const TAU_DAYS = {
  albedo: 30,
  ndvi: 25,
  dryness: 10,
  snow: 5,
} as const

/** Below this observation weight (`~3.91 * tau`), snap cleanly to pure climatology (`date: null`). */
export const OBS_WEIGHT_MIN = 0.02
/** At or above this weight (same calendar day, `age = 0`), preserve pure observation provenance. */
export const OBS_WEIGHT_PURE = 0.995

const MS_PER_DAY = 86_400_000

/** Provenance tag for a resolved living-land channel in `WorldState`. */
export type LivingLandSource =
  | LandSource
  | `${LandSource}+climatology`
  | `s2:${string}:no-delight`
  | `s2:${string}:no-delight+climatology`

/** Parses strict `YYYY-MM-DD` to UTC midnight ms without calendar rollover, or null if invalid. */
export function parseIsoDateMs(isoDate: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (!m) return null
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3])
  const ms = Date.UTC(y, mo - 1, d)
  const check = new Date(ms)
  if (check.getUTCFullYear() !== y || check.getUTCMonth() + 1 !== mo || check.getUTCDate() !== d) return null
  return ms
}

/** Calendar month (`1..12`) extracted strictly from `shownDate` (`YYYY-MM-DD`), never from the system clock. */
export function monthFromIsoDate(isoDate: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  const mo = m ? Number(m[2]) : 1
  return mo >= 1 && mo <= 12 ? mo : 1
}

/** Absolute calendar-day age `|shownDate - obsDate|` (handles past and future shown dates symmetrically). */
export function ageDaysBetween(shownDate: string, obsDate: string | null): number | null {
  if (!obsDate) return null
  const a = parseIsoDateMs(shownDate), b = parseIsoDateMs(obsDate)
  if (a === null || b === null) return null
  return Math.abs(a - b) / MS_PER_DAY
}

/** Observation blending weight `[0, 1]` for an observation of `obsDate` when viewing `shownDate`. */
export function observationWeight(shownDate: string, obsDate: string | null, tauDays: number): number {
  if (!obsDate || !(tauDays > 0)) return 0
  const age = ageDaysBetween(shownDate, obsDate)
  if (age === null) return 0
  const w = Math.exp(-age / tauDays)
  if (w < OBS_WEIGHT_MIN) return 0
  return w >= OBS_WEIGHT_PURE ? 1 : w
}

function blendedSource(
  obsSource: LandSource | `s2:${string}:no-delight`,
  weight: number,
): LivingLandSource {
  if (obsSource === 'climatology' || weight <= 0) return 'climatology'
  if (weight >= 1) return obsSource
  return `${obsSource}+climatology` as LivingLandSource
}

export interface BlendedScalar {
  value: number
  source: LivingLandSource
  date: string | null
  weight: number
}

/** Blends one observed scalar with its climatological value according to observation age. */
export function blendScalar(
  obs: number,
  clim: number,
  obsSource: LandSource,
  obsDate: string | null,
  shownDate: string,
  tauDays: number,
): BlendedScalar {
  if (obsSource === 'climatology') return { value: clim, source: 'climatology', date: null, weight: 0 }
  const weight = observationWeight(shownDate, obsDate, tauDays)
  if (weight <= 0) return { value: clim, source: 'climatology', date: null, weight: 0 }
  if (weight >= 1) return { value: obs, source: obsSource, date: obsDate, weight: 1 }
  return {
    value: obs * weight + clim * (1 - weight),
    source: blendedSource(obsSource, weight),
    date: obsDate,
    weight,
  }
}

export interface BlendedRgb {
  rgb: [number, number, number]
  source: LivingLandSource
  date: string | null
  weight: number
}

/** Blends linear observed reflectance RGB with linear climatological reflectance RGB by observation age. */
export function blendLinearRgb(
  obs: readonly [number, number, number],
  clim: readonly [number, number, number],
  obsSource: LandSource | `s2:${string}:no-delight`,
  obsDate: string | null,
  shownDate: string,
  tauDays = TAU_DAYS.albedo,
): BlendedRgb {
  if (obsSource === 'climatology') {
    return { rgb: [clim[0], clim[1], clim[2]], source: 'climatology', date: null, weight: 0 }
  }
  const weight = observationWeight(shownDate, obsDate, tauDays)
  if (weight <= 0) return { rgb: [clim[0], clim[1], clim[2]], source: 'climatology', date: null, weight: 0 }
  if (weight >= 1) return { rgb: [obs[0], obs[1], obs[2]], source: obsSource, date: obsDate, weight: 1 }
  const inv = 1 - weight
  return {
    rgb: [obs[0] * weight + clim[0] * inv, obs[1] * weight + clim[1] * inv, obs[2] * weight + clim[2] * inv],
    source: blendedSource(obsSource, weight),
    date: obsDate,
    weight,
  }
}
