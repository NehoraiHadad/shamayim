import { MIN_CELL_VALID } from '../data/land/coverMeans'
import { farCellAt } from '../data/land/gibs'
import { nearCellCenter } from '../data/land/nearGrid'
import type { LandData } from '../data/land/types'
import {
  modisSrWindow, MS_PER_DAY, parseIsoDateMs, singleDayWindow, TAU_DAYS, windowWeight,
} from './landAgeBlend'
import { S2_TCI_MAX_REFLECTANCE, tciByteToReflectance } from './landRadiometry'

/**
 * One reflectance scale for every albedo source, so the near/far seam and the age blend do not jump.
 *
 * - Near Sentinel-2 `visual` TCI and per-cover means: linear BOA reflectance (`landRadiometry.ts`,
 *   0..0.25 -> 0..255).
 * - Climatology palette (`climatology.ts`): heuristic bytes authored on the same TCI display scale.
 * - Far GIBS `MODIS_Terra_L3_SurfaceReflectance_Bands143_8Day` JPEG: 8-bit display of MOD09A1 surface
 *   reflectance whose stretch GIBS does not publish per layer. Cross-calibrated per channel by pairing
 *   near S2 reflectance means with **distinct** far cells (`farIdx`) whose near acquisition dates are
 *   both as-of eligible (`windowWeight > 0`) and within `MAX_CALIBRATION_DATE_GAP_DAYS` (21 d) of the
 *   MOD09A1 composite midpoint: `gain_c = Σ_j mean(rho_S2,j,c) / Σ_j (GIBS_j,c / 255)` (equal-weighted
 *   across distinct far cells). Falls back to `assumed-tci` (`0.25`) if spatial, temporal or
 *   radiometric support is insufficient.
 */
export interface FarGain {
  /** Per-channel `rho / (byte / 255)` for the far RGB. */
  rgb: [number, number, number]
  source: 'near-overlap' | 'assumed-tci'
  /** Distinct far cells the gain was measured on (0 when assumed). */
  cells: number
}

export const FAR_GAIN_ASSUMED: FarGain = {
  rgb: [S2_TCI_MAX_REFLECTANCE, S2_TCI_MAX_REFLECTANCE, S2_TCI_MAX_REFLECTANCE], source: 'assumed-tci', cells: 0,
}
/** Fewest distinct far cells for a measured gain (≥ 16 km² on the 2 km production far grid; heuristic). */
export const MIN_GAIN_FAR_CELLS = 4
/** Fewest total matched near S2 probes across those distinct far cells (heuristic). */
export const MIN_GAIN_NEAR_CELLS = 16
/** Maximum days between a near S2 pass and the MOD09A1 composite midpoint (~albedo half-life; heuristic). */
export const MAX_CALIBRATION_DATE_GAP_DAYS = 21
/** Minimum mean far unit value per channel so dark shadow/water pixels cannot destabilize the ratio. */
export const MIN_FAR_UNIT = 0.02
/** Plausible gain bounds: a linear display saturating between 0.12 and 0.6 reflectance (heuristic guard). */
export const FAR_GAIN_RANGE = [0.12, 0.6] as const
const PROBES_PER_AXIS = 25
const SATURATED_BYTE = 250

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

interface FarBucket {
  rhoR: number; rhoG: number; rhoB: number; count: number
  farR: number; farG: number; farB: number
}

/** Measures the far-to-near reflectance gain across distinct far cells with date-comparable S2 overlap. */
export function farGainOf(data: LandData, shownUtcDate: string): FarGain {
  const { near, far } = data
  if (!near || !far?.rgb || !far.rgbDate) return FAR_GAIN_ASSUMED
  const farWin = modisSrWindow(far.rgbDate)
  if (!farWin || windowWeight(shownUtcDate, farWin, TAU_DAYS.albedo) <= 0) return FAR_GAIN_ASSUMED
  const farStartMs = parseIsoDateMs(farWin.start), farEndMs = parseIsoDateMs(farWin.end)
  if (farStartMs === null || farEndMs === null) return FAR_GAIN_ASSUMED
  const farMidMs = (farStartMs + farEndMs) / 2

  const dateOk = new Map<string, boolean>()
  const isNearDateUsable = (d: string): boolean => {
    let ok = dateOk.get(d)
    if (ok !== undefined) return ok
    const ms = parseIsoDateMs(d)
    ok = ms !== null
      && windowWeight(shownUtcDate, singleDayWindow(d, 'utc'), TAU_DAYS.albedo) > 0
      && Math.abs(ms - farMidMs) / MS_PER_DAY <= MAX_CALIBRATION_DATE_GAP_DAYS
    dateOk.set(d, ok)
    return ok
  }

  const stride = Math.max(1, Math.ceil(near.size / PROBES_PER_AXIS))
  const byFar = new Map<number, FarBucket>()
  let nearCount = 0

  for (let row = stride >> 1; row < near.size; row += stride) {
    for (let col = stride >> 1; col < near.size; col += stride) {
      const i = row * near.size + col
      if (!(near.rgbValid[i] >= MIN_CELL_VALID)) continue
      const r = near.rgb[i * 3], g = near.rgb[i * 3 + 1], b = near.rgb[i * 3 + 2]
      if (r <= 0 || g <= 0 || b <= 0 || r >= SATURATED_BYTE || g >= SATURATED_BYTE || b >= SATURATED_BYTE) continue
      const acqIdx = near.acqIndex[i]
      const nearDate = acqIdx < near.acquisitions.length ? near.acquisitions[acqIdx].date : near.date
      if (!isNearDateUsable(nearDate)) continue
      const c = nearCellCenter(near, row, col)
      const f = farCellAt(far, c.lat, c.lon)
      if (!f?.rgb) continue
      const [fr, fg, fb] = f.rgb
      if (fr <= 0 || fg <= 0 || fb <= 0 || fr >= SATURATED_BYTE || fg >= SATURATED_BYTE || fb >= SATURATED_BYTE) continue
      let bucket = byFar.get(f.idx)
      if (!bucket) {
        bucket = { rhoR: 0, rhoG: 0, rhoB: 0, count: 0, farR: fr / 255, farG: fg / 255, farB: fb / 255 }
        byFar.set(f.idx, bucket)
      }
      bucket.rhoR += tciByteToReflectance(r)
      bucket.rhoG += tciByteToReflectance(g)
      bucket.rhoB += tciByteToReflectance(b)
      bucket.count++
      nearCount++
    }
  }

  if (byFar.size < MIN_GAIN_FAR_CELLS || nearCount < MIN_GAIN_NEAR_CELLS) return FAR_GAIN_ASSUMED
  const rho = [0, 0, 0], unit = [0, 0, 0]
  for (const b of byFar.values()) {
    rho[0] += b.rhoR / b.count; rho[1] += b.rhoG / b.count; rho[2] += b.rhoB / b.count
    unit[0] += b.farR; unit[1] += b.farG; unit[2] += b.farB
  }
  const nFar = byFar.size
  if (unit[0] / nFar < MIN_FAR_UNIT || unit[1] / nFar < MIN_FAR_UNIT || unit[2] / nFar < MIN_FAR_UNIT) {
    return FAR_GAIN_ASSUMED
  }
  const gain = (k: number) => clamp(rho[k] / unit[k], FAR_GAIN_RANGE[0], FAR_GAIN_RANGE[1])
  return { rgb: [gain(0), gain(1), gain(2)], source: 'near-overlap', cells: nFar }
}

/** Far GIBS display bytes -> linear surface reflectance on the near S2 scale. */
export function farRgbToReflectance(rgb: readonly [number, number, number], gain: FarGain): [number, number, number] {
  return [
    clamp((rgb[0] / 255) * gain.rgb[0], 0, 1), clamp((rgb[1] / 255) * gain.rgb[1], 0, 1), clamp((rgb[2] / 255) * gain.rgb[2], 0, 1),
  ]
}
