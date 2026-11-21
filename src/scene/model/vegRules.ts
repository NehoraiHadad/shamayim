//# allFunctionsCalledOnLoad
import { climateZoneAt, meanTempProxyC } from '../../data/land/climatology'
import type { KoppenCode } from '../../data/land/koppenGrid'
import type { Camera } from '../../domain/camera'

/**
 * Pure physical & ecological vegetation rules (Stage 4: living land). Driven strictly by WorldCover
 * class, NDVI, dryness, solar season, Köppen–Geiger class, elevation, slope and camera m/px (never place names).
 *
 * Resolvability thresholds (horizontal ground metres per scene px, `mPerPx = d * π / (180 * pxPerDeg)`):
 * - For `SCENE_CAMERA` (`pxPerDeg = 1.5`), `11.64 m/px` at 1 km (`RELIEF.high` adds 6.5× vertical resolution).
 * - Orchards/plantations (6–9 m rows in 25–45 m alley blocks; FAO/Volcani): full `<= 14 m/px` (~1.2 km),
 *   fading smoothly to zero at `ORCHARD_MAX_M_PER_PX = 24 m/px` (~2.06 km) before Nyquist aliasing.
 * - Forest crowns (20–40 m Aleppo pine/oak clusters): full `<= 28 m/px`, cut at `TREE_MAX_M_PER_PX = 60 m/px`.
 * - Cropland patchwork (120–400 m parcels): full `<= 55 m/px`, cut at `FIELD_MAX_M_PER_PX = 95 m/px`.
 * - Scrub/grass tufts (3–12 m drifts): full `<= 20 m/px`, cut at `SCRUB_MAX_M_PER_PX = 42 m/px`.
 * - Bare/desert strata (tens-of-metres geological beds): full `<= 70 m/px`, cut at `STRATA_MAX_M_PER_PX = 140 m/px`.
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
 * Cropland field state from NDVI, dryness, solar season and Köppen–Geiger class:
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
 * Orchard/plantation species from Köppen–Geiger class, elevation/temperature, WorldCover (`1`/`4`), slope & NDVI:
 * - `palm`: arid (`B`) or hot semi-arid/rift (`semiarid` with `meanTempProxyC >= 20 °C`) irrigated cover (`ndvi >= 0.24`).
 * - `citrus`: frost-free lowland Mediterranean/subtropical/tropical (`M`/`H`/`A`/`w`, `< 220 m`, slope `< 0.08`, `ndvi >= 0.30`).
 * - `olive`: Mediterranean (`M`) or cooler steppe (`S`) hills/benches (`>= 220 m` or moderate slope/rain-fed NDVI).
 */
export function orchardKindOf(
  koppen: KoppenCode, lat: number, lon: number, elevationM: number, cover: number | null, slope: number, ndvi: number,
): OrchardKind | null {
  if ((cover !== 1 && cover !== 4) || slope > 0.22 || ndvi < 0.22) return null
  const tMean = meanTempProxyC(lat, elevationM)
  if (koppen === 'E' || tMean < 10) return null
  const zone = climateZoneAt(lat, lon, elevationM)
  if (zone === 'arid' || (zone === 'semiarid' && tMean >= 20)) return ndvi >= 0.24 ? 'palm' : null
  if (koppen === 'M' || koppen === 'H' || koppen === 'A' || koppen === 'w') {
    if (elevationM < 220 && slope < 0.08 && ndvi >= 0.30) return 'citrus'
    return koppen === 'M' ? 'olive' : null
  }
  return koppen === 'S' ? 'olive' : null
}

export interface CellClassifyInput {
  cover: number | null; ndvi: number; dryness: number; slope: number
  koppen: KoppenCode; lat: number; lon: number; elevationM: number
  mPerPx: number; nearCrop?: boolean; cellHash: number
}

/** Maps one sampled land cell to its vegetation class, optional orchard species and NDVI density `0..1`. */
export function classifyVegCell(input: CellClassifyInput): { veg: VegClass; orchard: OrchardKind | null; density: number } {
  const { cover, ndvi, dryness, slope, koppen, lat, lon, elevationM, mPerPx, nearCrop = false, cellHash } = input
  if (cover === 8 || cover === 7 || cover === 5) return { veg: 'none', orchard: null, density: 0 }
  if (cover === 6) return { veg: 'bare', orchard: null, density: 0 }

  const zone = climateZoneAt(lat, lon, elevationM)
  if ((koppen === 'B' || zone === 'arid') && ndvi < 0.14 && dryness > 0.72) {
    return { veg: 'bare', orchard: null, density: 0 }
  }

  const canResolveOrchard = mPerPx <= ORCHARD_MAX_M_PER_PX
  if (cover === 1) {
    const density = clamp((ndvi - 0.12) / 0.50, 0.16, 1)
    if (canResolveOrchard) {
      const orchard = orchardKindOf(koppen, lat, lon, elevationM, 1, slope, ndvi)
      if ((orchard === 'palm' && slope < 0.14) || (orchard && slope < 0.08 && (nearCrop || cellHash < 0.28))) {
        return { veg: 'orchard', orchard, density }
      }
    }
    return { veg: 'forest', orchard: null, density }
  }
  if (cover === 4) {
    const density = clamp((ndvi + 0.05) / 0.65, 0.25, 1)
    if (canResolveOrchard) {
      const orchard = orchardKindOf(koppen, lat, lon, elevationM, 4, slope, ndvi)
      const keep = orchard === 'palm' ? (ndvi >= 0.26 && cellHash < 0.48)
        : orchard !== null && ndvi >= 0.34 && slope < 0.09 && cellHash < 0.22
      if (keep && orchard) return { veg: 'orchard', orchard, density }
    }
    return { veg: 'crop', orchard: null, density }
  }
  if (cover === 2) return { veg: 'shrub', orchard: null, density: clamp((ndvi - 0.08) / 0.42, 0.08, 1) }
  if (cover === 3) return { veg: 'grass', orchard: null, density: clamp((ndvi - 0.06) / 0.48, 0.10, 1) }
  if (cover === 9 || cover === 10) return { veg: 'shrub', orchard: null, density: clamp((ndvi - 0.10) / 0.45, 0.08, 0.65) }
  if (dryness >= 0.72 || ndvi < 0.22) return { veg: dryness >= 0.72 ? 'bare' : 'none', orchard: null, density: 0 }
  return { veg: 'shrub', orchard: null, density: clamp((ndvi - 0.16) / 0.55, 0.08, 0.45) }
}
