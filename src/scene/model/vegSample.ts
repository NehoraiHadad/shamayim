//# allFunctionsCalledOnLoad
import type { LivingLand } from '../../world/landLiving'
import type { RGB } from '../../world/types'
import { COVER_WATER, roundRgb } from './landPalette'
import { labOf, mixRgb, rgbOfLab } from './tone'

/**
 * Living-land vegetation cell sampling and light-free illustrated palette (Stage 4: living land).
 * Projected face distance & slope are shared via `faceProjection.ts` with Stage 3 (`landColour.ts`).
 * Computes only cover, NDVI, dryness and elevation (never allocating or blending unused albedo).
 */

export interface VegSample { cover: number | null; ndvi: number; dryness: number; elevationM: number }

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const lerpRgb = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]

/** Zero-allocation discrete WorldCover lookup along a panorama ray at distance `km` (preserving open water `8`). */
export function sampleCoverAtKm(land: LivingLand, rayIdx: number, km: number): number | null {
  const rays = land.rays
  if (!rays.length) return land.own.cover
  const bands = rays[clamp(Math.round(rayIdx), 0, rays.length - 1)].bands
  if (!bands.length) return land.own.cover
  const distM = Math.max(50, km * 1000)
  const hi = bands.findIndex((b) => b.distanceM >= distM)
  if (hi <= 0) return (hi === -1 ? bands.at(-1)! : bands[0]).sample.cover
  const a = bands[hi - 1], b = bands[hi]
  const t = clamp((Math.log(distM) - Math.log(a.distanceM)) / Math.max(1e-6, Math.log(b.distanceM) - Math.log(a.distanceM)), 0, 1)
  return t < 0.5 ? a.sample.cover : b.sample.cover
}

/** Samples discrete cover (preserving open water `8`), plus log-interpolated NDVI, dryness and elevation (no albedo). */
export function sampleVegAtKm(land: LivingLand, rayIdx: number, km: number): VegSample {
  const rays = land.rays
  if (!rays.length) {
    return { cover: land.own.cover, ndvi: land.own.ndvi, dryness: land.own.dryness, elevationM: 0 }
  }
  const bands = rays[clamp(Math.round(rayIdx), 0, rays.length - 1)].bands
  if (!bands.length) {
    return { cover: land.own.cover, ndvi: land.own.ndvi, dryness: land.own.dryness, elevationM: 0 }
  }
  const distM = Math.max(50, km * 1000)
  const hi = bands.findIndex((b) => b.distanceM >= distM)
  let cover: number | null, ndvi: number, dryness: number, elevationM: number
  if (hi <= 0) {
    const b = hi === -1 ? bands.at(-1)! : bands[0]
    cover = b.sample.cover; ndvi = b.sample.ndvi; dryness = b.sample.dryness; elevationM = b.elevationM
  } else {
    const a = bands[hi - 1], b = bands[hi]
    const t = clamp((Math.log(distM) - Math.log(a.distanceM)) / Math.max(1e-6, Math.log(b.distanceM) - Math.log(a.distanceM)), 0, 1)
    cover = t < 0.5 ? a.sample.cover : b.sample.cover
    ndvi = lerp(a.sample.ndvi, b.sample.ndvi, t); dryness = lerp(a.sample.dryness, b.sample.dryness, t)
    elevationM = lerp(a.elevationM, b.elevationM, t)
  }
  if (distM < 700 && cover !== COVER_WATER && land.own.cover !== COVER_WATER && land.own.cover !== 5) {
    const ownW = clamp((700 - distM) / 500, 0, 0.45)
    ndvi = lerp(ndvi, land.own.ndvi, ownW); dryness = lerp(dryness, land.own.dryness, ownW)
  }
  return { cover, ndvi, dryness, elevationM }
}

/** Shared light-free tone indices inside `PlaneVegetation.tones` (calibrated for 3-value anidoodle readability). */
export const TONE = {
  PINE_UNDER: 0, PINE_SHADE: 1, PINE_MID: 2, PINE_LIT: 3,
  OLIVE: 4, CITRUS: 5, PALM: 6, TRUNK: 7,
  FIELD_GREEN: 8, FIELD_PLOUGH: 9, FIELD_STRAW: 10,
  SHRUB: 11, SHRUB_LIT: 12, GRASS: 13, GRASS_LIT: 14,
  STRATA_LIGHT: 15, STRATA_DARK: 16, ORCHARD: 17,
} as const

export interface VegPaletteOpts {
  /** Mean dryness across grass cells (defaults to plane dryness). */
  grassDryness?: number
  /** Regional wet-season dryness floor from `seasonalDrynessRange` (so semi-arid winter annuals stay green). */
  minClimateDry?: number
  /** Mean sampled NDVI across grass cells (MOD13Q1 herbaceous senescence: green >= 0.36, straw <= 0.18). */
  grassNdvi?: number
}

/** Builds the 18-colour light-free illustrated vegetation palette anchored to the plane's median Stage 3 tone. */
export function buildVegPalette(medianLand: RGB, dryness: number, opts?: VegPaletteOpts): RGB[] {
  const d = clamp(dryness, 0, 1)
  const gDry = clamp(opts?.grassDryness ?? d, 0, 1)
  const minDry = clamp(opts?.minClimateDry ?? 0.14, 0, 1)
  // Onset tied to the climate's wet floor (capped at 0.52 so unirrigated arid desert stays dry) plus observed NDVI
  // herbaceous senescence (Huete et al. 2002; Karnieli et al. 2002: active winter annuals >= 0.36, dry straw <= 0.18).
  const dryFactor = clamp((gDry - Math.min(minDry + 0.08, 0.52)) / 0.38, 0, 1)
  const grassDry = opts?.grassNdvi !== undefined && Number.isFinite(opts.grassNdvi)
    ? clamp(0.55 * clamp((0.36 - opts.grassNdvi) / 0.18, 0, 1) + 0.45 * dryFactor, 0, 1)
    : dryFactor
  const calm = (rgb: RGB, share = 0.14) => roundRgb(mixRgb(rgb, medianLand, share))
  const lab = labOf(medianLand)
  const strataLight = roundRgb(rgbOfLab({ l: clamp(lab.l + 0.052, 0.24, 0.44), a: lab.a * 1.05, b: lab.b * 1.15 }))
  const strataDark = roundRgb(rgbOfLab({ l: clamp(lab.l - 0.048, 0.16, 0.34), a: lab.a * 1.10, b: lab.b * 1.05 }))
  return [
    calm([0.05, 0.10, 0.06], 0.08),                       // 0: PINE_UNDER (dark woodland understory)
    calm([0.11, 0.20, 0.12], 0.10),                       // 1: PINE_SHADE (shaded pine/oak crown)
    calm([0.16, 0.29, 0.15], 0.10),                       // 2: PINE_MID   (rich conifer/oak crown)
    calm([0.29, 0.44, 0.23], 0.10),                       // 3: PINE_LIT   (ambient upper crown dome)
    calm([0.24, 0.31, 0.21], 0.14),                       // 4: OLIVE      (silvery Mediterranean olive)
    calm([0.14, 0.28, 0.14], 0.12),                       // 5: CITRUS     (deep glossy citrus)
    calm([0.20, 0.32, 0.16], 0.12),                       // 6: PALM       (date-palm frond green)
    calm([0.30, 0.25, 0.19], 0.14),                       // 7: TRUNK
    calm(lerpRgb([0.18, 0.36, 0.14], [0.27, 0.35, 0.17], d * 0.5), 0.14), // 8: FIELD_GREEN
    calm([0.27, 0.19, 0.13], 0.14),                       // 9: FIELD_PLOUGH
    calm([0.52, 0.44, 0.25], 0.13),                       // 10: FIELD_STRAW
    calm(lerpRgb([0.11, 0.20, 0.10], [0.22, 0.22, 0.14], d * 0.72), 0.12), // 11: SHRUB
    calm(lerpRgb([0.26, 0.38, 0.20], [0.39, 0.36, 0.22], d * 0.72), 0.10), // 12: SHRUB_LIT
    calm(lerpRgb([0.20, 0.37, 0.14], [0.54, 0.45, 0.23], grassDry), 0.10), // 13: GRASS
    calm(lerpRgb([0.32, 0.50, 0.20], [0.64, 0.54, 0.30], grassDry), 0.08), // 14: GRASS_LIT
    strataLight,                                          // 15: STRATA_LIGHT
    strataDark,                                           // 16: STRATA_DARK
    calm(lerpRgb([0.18, 0.32, 0.13], [0.28, 0.33, 0.16], d * 0.45), 0.13), // 17: ORCHARD (neutral unknown-species)
  ]
}
