import type { LandSource } from '../data/land/types'

/**
 * Causal as-of age blending of satellite/weather observations toward seasonal climatology.
 *
 * Date & causality policy:
 * - Satellite products carry UTC date labels (`basis: 'utc'`) and are compared strictly against the
 *   shown instant's UTC calendar date (`shownUtcDate` via `utcOf(at, timezone)`). Local weather
 *   summaries (`open-meteo:*`) carry completed local calendar dates (`basis: 'local'`) and are
 *   compared against the place's shown local calendar date (`shownDate`).
 * - As-of causality: observations or multi-day composites whose window ends AFTER the shown day
 *   (`shownMs < endMs`) are strictly ineligible (`weight = 0`) so future data never enters an as-of
 *   view.
 * - Multi-day composites: NASA MOD09A1 8-day SR (`MODIS_Terra_L3_SurfaceReflectance_Bands143_8Day`,
 *   https://modarch.gsfc.nasa.gov/data/dataprod/mod09.php) selects each pixel independently across
 *   `[start, start + 7 d]`; GIBS rolling 8-day NDVI covers `[end - 7 d, end]`. Both require
 *   `shownUtcDate >= end` and weight from the composite midpoint `(start + end) / 2`, preserving
 *   the full ISO 8601 interval `start/end` as provenance. Mixed-date S2 cover means require
 *   `shownUtcDate >= newest` and weight conservatively from `oldest`.
 * - Exponential decay: `w = exp(-ageDays / tau)` with heuristic timescales (`TAU_DAYS`):
 *   albedo 30 d, NDVI 25 d, dryness 10 d, snow 5 d. Below `OBS_WEIGHT_MIN = 0.02`, snaps cleanly
 *   to climatology.
 */
export const TAU_DAYS = { albedo: 30, ndvi: 25, dryness: 10, snow: 5 } as const
export const OBS_WEIGHT_MIN = 0.02
export const OBS_WEIGHT_PURE = 0.995
/** Near-vs-far priority threshold (`e^-1 ≈ 0.368`, 1 decay timescale `tau`): fresher GIBS supersedes older near S2. */
export const NEAR_PRIORITY_MIN_WEIGHT = Math.exp(-1)
export const MS_PER_DAY = 86_400_000

export type DateBasis = 'utc' | 'local'
export interface ObservationWindow { start: string; end: string; basis: DateBasis; weightDate?: string }
export type LivingLandSource = LandSource | `${LandSource}+climatology`

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

/** Shifts a strict `YYYY-MM-DD` string by `deltaDays`, returning `null` on invalid input. */
export function addIsoDays(isoDate: string, deltaDays: number): string | null {
  const ms = parseIsoDateMs(isoDate)
  return ms === null ? null : new Date(ms + deltaDays * MS_PER_DAY).toISOString().slice(0, 10)
}

/** Calendar month (`1..12`) extracted strictly from `shownDate` (`YYYY-MM-DD`), never from the system clock. */
export function monthFromIsoDate(isoDate: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  const mo = m ? Number(m[2]) : 1
  return mo >= 1 && mo <= 12 ? mo : 1
}

export const singleDayWindow = (date: string, basis: DateBasis = 'utc'): ObservationWindow => ({ start: date, end: date, basis })

/** MOD09A1 8-day surface reflectance composite `[start, start + 7 d]` (UTC). */
export function modisSrWindow(startDate: string): ObservationWindow | null {
  const end = addIsoDays(startDate, 7)
  return end ? { start: startDate, end, basis: 'utc' } : null
}

/** GIBS rolling 8-day MODIS NDVI composite `[end - 7 d, end]` (UTC). */
export function modisNdviWindow(endDate: string): ObservationWindow | null {
  const start = addIsoDays(endDate, -7)
  return start ? { start, end: endDate, basis: 'utc' } : null
}

/** Mixed-date S2 cover mean `[oldest, newest]` (UTC): requires `shown >= newest`, weighted conservatively from `oldest`. */
export const coverMeanWindow = (oldest: string, newest: string): ObservationWindow =>
  ({ start: oldest, end: newest, basis: 'utc', weightDate: oldest })

/** ISO 8601 date (`YYYY-MM-DD`) for single days or interval (`start/end`) for multi-day composites. */
export const formatWindowDate = (win: ObservationWindow): string =>
  (win.start === win.end ? win.start : `${win.start}/${win.end}`)

/** Causal age in days for `win` as of `shownDate` on `win.basis`, or null if future/incomplete/invalid. */
export function windowAgeDays(shownDate: string, win: ObservationWindow | null): number | null {
  if (!win) return null
  const shownMs = parseIsoDateMs(shownDate), startMs = parseIsoDateMs(win.start), endMs = parseIsoDateMs(win.end)
  if (shownMs === null || startMs === null || endMs === null || endMs < startMs) return null
  if (shownMs < endMs) return null // future observation or incomplete composite: ineligible
  const repMs = win.weightDate ? parseIsoDateMs(win.weightDate) : (startMs + endMs) / 2
  if (repMs === null || repMs > shownMs) return null
  return (shownMs - repMs) / MS_PER_DAY
}

/** Observation blending weight `[0, 1]` for `win` as of `shownDate` (0 if future, incomplete, or expired). */
export function windowWeight(shownDate: string, win: ObservationWindow | null, tauDays: number): number {
  if (!win || !(tauDays > 0)) return 0
  const age = windowAgeDays(shownDate, win)
  if (age === null || age < 0) return 0
  const w = Math.exp(-age / tauDays)
  if (w < OBS_WEIGHT_MIN) return 0
  return w >= OBS_WEIGHT_PURE ? 1 : w
}

/** Single-day observation weight convenience wrapper (rejects future observations). */
export const observationWeight = (shownDate: string, obsDate: string | null, tauDays: number): number =>
  (obsDate ? windowWeight(shownDate, singleDayWindow(obsDate), tauDays) : 0)

function blendedSource(obsSource: LandSource, weight: number): LivingLandSource {
  if (obsSource === 'climatology' || weight <= 0) return 'climatology'
  return weight >= 1 ? obsSource : (`${obsSource}+climatology` as LivingLandSource)
}

export interface BlendedScalar { value: number; source: LivingLandSource; date: string | null; weight: number }
export interface BlendedRgb { rgb: [number, number, number]; source: LivingLandSource; date: string | null; weight: number }

/** Blends one observed scalar with its climatological value according to causal observation window weight. */
export function blendScalar(
  obs: number, clim: number, obsSource: LandSource, win: ObservationWindow | null, shownDate: string, tauDays: number,
): BlendedScalar {
  if (obsSource === 'climatology' || !win) return { value: clim, source: 'climatology', date: null, weight: 0 }
  const weight = windowWeight(shownDate, win, tauDays)
  if (weight <= 0) return { value: clim, source: 'climatology', date: null, weight: 0 }
  const date = formatWindowDate(win)
  if (weight >= 1) return { value: obs, source: obsSource, date, weight: 1 }
  return { value: obs * weight + clim * (1 - weight), source: blendedSource(obsSource, weight), date, weight }
}

/** Blends linear observed reflectance RGB with linear climatological reflectance RGB by window weight. */
export function blendLinearRgb(
  obs: readonly [number, number, number], clim: readonly [number, number, number],
  obsSource: LandSource, win: ObservationWindow | null, shownDate: string, tauDays = TAU_DAYS.albedo,
): BlendedRgb {
  if (obsSource === 'climatology' || !win) {
    return { rgb: [clim[0], clim[1], clim[2]], source: 'climatology', date: null, weight: 0 }
  }
  const weight = windowWeight(shownDate, win, tauDays)
  if (weight <= 0) return { rgb: [clim[0], clim[1], clim[2]], source: 'climatology', date: null, weight: 0 }
  const date = formatWindowDate(win)
  if (weight >= 1) return { rgb: [obs[0], obs[1], obs[2]], source: obsSource, date, weight: 1 }
  const inv = 1 - weight
  return {
    rgb: [obs[0] * weight + clim[0] * inv, obs[1] * weight + clim[1] * inv, obs[2] * weight + clim[2] * inv],
    source: blendedSource(obsSource, weight), date, weight,
  }
}
