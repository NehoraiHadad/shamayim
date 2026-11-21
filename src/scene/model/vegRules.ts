//# allFunctionsCalledOnLoad
import { climateZoneAt, meanTempProxyC } from '../../data/land/climatology'
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
 *   row spacing 6–8 m (`citrus 6 m`, `olive 7 m`, `palm 8 m`), resolved individually when `rowPx >= 1.5 px`
 *   (< ~450–620 m); coarser distances up to `ORCHARD_MAX_M_PER_PX = 24 m/px` (~2.06 km) aggregate into
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
export type OrchardKind = 'olive' | 'citrus' | 'palm'
export type VegClass = 'none' | 'forest' | 'orchard' | 'crop' | 'shrub' | 'grass' | 'bare'

/** Documented inter-row tree spacing (m) and management alley / block pitch (m) per orchard type (FAO / Volcani). */
export const ORCHARD_ROW_M: Record<OrchardKind, number> = { olive: 7, citrus: 6, palm: 8 }
export const ORCHARD_ALLEY_M: Record<OrchardKind, number> = { olive: 34, citrus: 32, palm: 36 }
/** Minimum projected row spacing (px) before individual rows drop below Nyquist into aggregate block texture. */
export const MIN_RESOLVED_ROW_PX = 1.5

export const TREE_KIND_CODE: Record<'pine' | OrchardKind, number> = { pine: 0, olive: 1, citrus: 2, palm: 3 }
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

/**
 * Climate-zoned orchard/plantation species motif gated by slope magnitude (`|slope|`) and independent evidence:
 * - Annual cropland (`cover = 4`) requires explicit structural evidence (`hasOrchardEvidence`, e.g., OSM orchard/palm
 *   mark) so irrigated annual crops are never misclassified as palm/citrus rows.
 * - Tree cover (`cover = 1`) in arid / hot semi-arid rift (`zone === 'arid'` or `semiarid` with `tMean >= 20 °C`)
 *   on flat ground (`|slope| < 0.10`, `ndvi >= 0.24`) uses the documented arid-oasis date-palm approximation because
 *   closed-canopy forest cannot occur naturally there without irrigation.
 * - Elsewhere, tree cover (`cover = 1`) requires `hasOrchardEvidence` so native woodland stays forest rather than rows.
 */
export function orchardKindOf(
  koppen: KoppenCode, lat: number, lon: number, elevationM: number,
  cover: number | null, slope: number, ndvi: number, hasOrchardEvidence = false,
): OrchardKind | null {
  const absSlope = Math.abs(slope)
  if ((cover !== 1 && cover !== 4) || absSlope > 0.22 || ndvi < 0.22) return null
  const tMean = meanTempProxyC(lat, elevationM)
  if (koppen === 'E' || tMean < 10) return null
  const zone = climateZoneAt(lat, lon, elevationM)
  const aridOasis = cover === 1 && (zone === 'arid' || (zone === 'semiarid' && tMean >= 20)) && absSlope < 0.10 && ndvi >= 0.24
  if (!hasOrchardEvidence && !aridOasis) return null
  if (zone === 'arid' || (zone === 'semiarid' && tMean >= 20)) return ndvi >= 0.24 ? 'palm' : null
  if (koppen === 'M' || koppen === 'H' || koppen === 'A' || koppen === 'w') {
    if (elevationM < 220 && absSlope < 0.08 && ndvi >= 0.30) return 'citrus'
    return koppen === 'M' ? 'olive' : null
  }
  return koppen === 'S' ? 'olive' : null
}

export interface CellClassifyInput {
  cover: number | null; ndvi: number; dryness: number; slope: number
  koppen: KoppenCode; lat: number; lon: number; elevationM: number
  mPerPx: number; hasOrchardEvidence?: boolean
}

/** Maps one sampled land cell to its vegetation class, optional orchard species and NDVI density `0..1`. */
export function classifyVegCell(input: CellClassifyInput): { veg: VegClass; orchard: OrchardKind | null; density: number } {
  const { cover, ndvi, dryness, slope, koppen, lat, lon, elevationM, mPerPx, hasOrchardEvidence = false } = input
  if (cover === 8 || cover === 7 || cover === 5) return { veg: 'none', orchard: null, density: 0 }
  if (cover === 6) return { veg: 'bare', orchard: null, density: 0 }

  const zone = climateZoneAt(lat, lon, elevationM)
  if ((koppen === 'B' || zone === 'arid') && ndvi < 0.14 && dryness > 0.72) {
    return { veg: 'bare', orchard: null, density: 0 }
  }

  const canResolveOrchard = mPerPx <= ORCHARD_MAX_M_PER_PX
  if (cover === 1) {
    const density = clamp((ndvi - 0.12) / 0.50, 0.18, 1)
    const orchard = canResolveOrchard ? orchardKindOf(koppen, lat, lon, elevationM, 1, slope, ndvi, hasOrchardEvidence) : null
    return orchard ? { veg: 'orchard', orchard, density } : { veg: 'forest', orchard: null, density }
  }
  if (cover === 4) {
    const density = clamp((ndvi + 0.05) / 0.65, 0.25, 1)
    const orchard = canResolveOrchard && hasOrchardEvidence ? orchardKindOf(koppen, lat, lon, elevationM, 4, slope, ndvi, true) : null
    return orchard ? { veg: 'orchard', orchard, density } : { veg: 'crop', orchard: null, density }
  }
  if (cover === 2) return { veg: 'shrub', orchard: null, density: clamp((ndvi - 0.08) / 0.42, 0.14, 1) }
  if (cover === 3) return { veg: 'grass', orchard: null, density: clamp((ndvi - 0.06) / 0.48, 0.16, 1) }
  if (cover === 9 || cover === 10) return { veg: 'shrub', orchard: null, density: clamp((ndvi - 0.10) / 0.45, 0.12, 0.65) }
  if (dryness >= 0.72 || ndvi < 0.22) return { veg: dryness >= 0.72 ? 'bare' : 'none', orchard: null, density: 0 }
  return { veg: 'shrub', orchard: null, density: clamp((ndvi - 0.16) / 0.55, 0.12, 0.45) }
}
