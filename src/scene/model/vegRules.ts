//# allFunctionsCalledOnLoad
import { climateZoneAt } from '../../data/land/climatology'
import type { CropKind } from '../../data/landmarks/cropAreas'
import type { KoppenCode } from '../../data/land/koppenGrid'
import type { Camera } from '../../domain/camera'

/**
 * Pure physical & ecological vegetation rules (Stage 4: living land). Driven strictly by WorldCover
 * class, NDVI, dryness, solar season, Köppen–Geiger class, elevation, slope magnitude, independent
 * orchard/plantation evidence and camera m/px (never place names).
 *
 * Physical scales & resolvability thresholds (`mPerPx = d * π / (180 * pxPerDeg)`):
 * - For `SCENE_CAMERA` (`pxPerDeg = 1.5`), `11.64 m/px` at 1 km (`RELIEF.high` adds 6.5× vertical relief).
 * - Orchards/plantations (FAO Irrigation & Drainage Paper 66; Volcani Institute):
 *   row spacing 6–8 m (`citrus 6 m`, `olive 7 m`, `palm 8 m`), resolved individually above 2 CSS px
 *   (< ~260–340 m at reference width); coarser distances up to `ORCHARD_MAX_M_PER_PX = 24 m/px` (~2.06 km) aggregate into
 *   management block / alley texture (`32–36 m` pitch).
 * - Forest woodland (Aleppo pine / Mt Tabor oak stands; KKL-JNF / FAO forestry): individual foreground
 *   crowns (~16–24 m) aggregating smoothly into merged woodland crown domes (~32–52 m); full `<= 28 m/px`,
 *   fading smoothly to zero at `TREE_MAX_M_PER_PX = 60 m/px` (~5.2 km).
 * - Cropland patchwork (120–400 m parcels): full `<= 55 m/px`, cut at `FIELD_MAX_M_PER_PX = 95 m/px`.
 * - Scrub/grass tufts (Mediterranean batha/garrigue & steppe tussocks; Danin 1988): 8–20 m aggregate
 *   near-slope drifts; full `<= 20 m/px`, fading to zero at `SCRUB_MAX_M_PER_PX = 42 m/px` (~3.6 km).
 * - Bare/desert geological strata (tens-of-metres beds): full `<= 70 m/px`, cut at `STRATA_MAX_M_PER_PX = 140 m/px`.
 */

export const ORCHARD_FULL_M_PER_PX = 14
export const ORCHARD_MAX_M_PER_PX = 24
export const TREE_FULL_M_PER_PX = 28
export const TREE_MAX_M_PER_PX = 60
export const FIELD_FULL_M_PER_PX = 55
export const FIELD_MAX_M_PER_PX = 95
export const SCRUB_FULL_M_PER_PX = 20
export const SCRUB_MAX_M_PER_PX = 42
export const STRATA_FULL_M_PER_PX = 70
export const STRATA_MAX_M_PER_PX = 140

export type FieldState = 'growing' | 'ploughed' | 'straw'
export type OrchardKind = Exclude<CropKind, 'vineyard'>
export type VegClass = 'none' | 'forest' | 'orchard' | 'crop' | 'shrub' | 'grass' | 'bare'

// Nominal illustrated pitches, not surveys of the mapped site. FAO date cultivation gives 8–10 m
// (https://www.fao.org/4/Y4360E/y4360e0a.htm); FAO 66 and Volcani inform the olive/citrus examples.
export const ORCHARD_ROW_M: Record<OrchardKind, number> = { orchard: 7, olive: 7, citrus: 6, palm: 8 }
/** A drawn alley groups about four rows to retain readable contrast, rather than inferring actual paths. */
export const ORCHARD_ALLEY_M: Record<OrchardKind, number> = { orchard: 34, olive: 34, citrus: 32, palm: 36 }
/** Illustration threshold for anti-aliased individual row centres in CSS pixels. */
export const MIN_RESOLVED_ROW_PX = 2

export const TREE_KIND_CODE: Record<'pine' | OrchardKind, number> = { pine: 0, orchard: 1, olive: 1, citrus: 2, palm: 3 }
export const FIELD_STATE_CODE: Record<FieldState, number> = { growing: 0, ploughed: 1, straw: 2 }

const RAD = Math.PI / 180
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

/** Horizontal ground resolution in metres per scene pixel at `distanceM` for `camera`. */
export function mPerPxAt(distanceM: number, camera: Pick<Camera, 'pxPerDeg'>): number {
  return Math.max(0, distanceM) * (RAD / Math.max(1e-6, camera.pxPerDeg))
}

/** Smooth hermite visibility factor: 1 at `<= fullMPerPx`, 0 at `>= maxMPerPx`. */
export function distanceFade(mPerPx: number, fullMPerPx: number, maxMPerPx: number): number {
  if (mPerPx <= fullMPerPx) return 1
  if (mPerPx >= maxMPerPx) return 0
  const t = (mPerPx - fullMPerPx) / Math.max(1e-6, maxMPerPx - fullMPerPx)
  return 1 - t * t * (3 - 2 * t)
}

/** Hemisphere-aware solar month `1..12` (1 = mid-winter, 7 = mid-summer). */
export function solarMonthOf(month: number, lat: number): number {
  const m = ((Math.round(month) - 1) % 12 + 12) % 12
  return (lat < 0 ? (m + 6) % 12 : m) + 1
}

/**
 * Cropland field state from exact (unjittered) NDVI, dryness, solar season and Köppen–Geiger class:
 * `growing` (`ndvi >= 0.34`), `ploughed` (low NDVI in regional sowing/tillage season or moist soil
 * `dryness < 0.50`), else `straw` (dry post-harvest stubble).
 */
export function cropFieldState(ndvi: number, dryness: number, solarMonth: number, koppen: KoppenCode): FieldState {
  if (ndvi >= 0.34) return 'growing'
  const cold = koppen === 'C' || koppen === 'D' || koppen === 'd' || koppen === 'E'
  const sowing = cold
    ? (solarMonth >= 3 && solarMonth <= 5) || solarMonth === 10 || solarMonth === 11
    : solarMonth >= 10 || solarMonth <= 2
  return sowing || dryness < 0.50 ? 'ploughed' : 'straw'
}

export interface CellClassifyInput {
  cover: number | null; ndvi: number; dryness: number
  koppen: KoppenCode; lat: number; lon: number; elevationM: number
  mappedCrop?: CropKind
}

/** Maps one sampled land cell to its vegetation class, optional orchard species and NDVI density `0..1`. */
export function classifyVegCell(input: CellClassifyInput): { veg: VegClass; orchard: OrchardKind | null; density: number } {
  const { cover, ndvi, dryness, koppen, lat, lon, elevationM, mappedCrop } = input
  if (cover === 8 || cover === 7 || cover === 5) return { veg: 'none', orchard: null, density: 0 }
  if (cover === 6) return { veg: 'bare', orchard: null, density: 0 }

  if (cover === 1 || cover === 4) {
    const density = cover === 1 ? clamp((ndvi - 0.12) / 0.50, 0.18, 1) : clamp((ndvi + 0.05) / 0.65, 0.25, 1)
    if (mappedCrop && mappedCrop !== 'vineyard') return { veg: 'orchard', orchard: mappedCrop, density }
    return { veg: cover === 4 || mappedCrop === 'vineyard' ? 'crop' : 'forest', orchard: null, density }
  }
  const zone = climateZoneAt(lat, lon, elevationM)
  if ((koppen === 'B' || zone === 'arid') && ndvi < 0.14 && dryness > 0.72) {
    return { veg: 'bare', orchard: null, density: 0 }
  }
  if (cover === 2) return { veg: 'shrub', orchard: null, density: clamp((ndvi - 0.08) / 0.42, 0.14, 1) }
  if (cover === 3) return { veg: 'grass', orchard: null, density: clamp((ndvi - 0.06) / 0.48, 0.16, 1) }
  if (cover === 9 || cover === 10) return { veg: 'shrub', orchard: null, density: clamp((ndvi - 0.10) / 0.45, 0.12, 0.65) }
  if (dryness >= 0.72 || ndvi < 0.22) return { veg: dryness >= 0.72 ? 'bare' : 'none', orchard: null, density: 0 }
  return { veg: 'shrub', orchard: null, density: clamp((ndvi - 0.16) / 0.55, 0.12, 0.45) }
}
