import { RAY_DISTANCES } from '../data/terrain/panorama'
import type { LivingLand, LivingLandSample } from './landLiving'

/**
 * Panorama ray sampling rings and allocation-free FNV-1a cache key for `WorldState.land`.
 * Reuses `RAY_DISTANCES` from `panorama.ts` so bands align with the terrain sight profile.
 */

/** Ray columns across the camera span (every 5th panorama ray: 6.25° ≈ 109 m at 1 km, 2.2 km at 20 km). */
export const LIVING_LAND_RAYS = 41
/** Metres per degree of latitude (mean, WGS-84 spherical approximation as in `panorama.ts`). */
export const M_PER_DEG = 111_320
const TARGET_BANDS_KM = [0.5, 1.0, 1.8, 3.0, 4.8, 7.2, 12, 20, 35, 55] as const

function snapRayDistanceM(targetKm: number): number {
  let best = RAY_DISTANCES[0]
  for (const d of RAY_DISTANCES) if (Math.abs(d - targetKm) < Math.abs(best - targetKm)) best = d
  return Math.round(best * 1000)
}

/** Distance bands (m) sampled along each ray, snapped directly to `RAY_DISTANCES`. */
export const LIVING_LAND_DISTANCES_M: readonly number[] = TARGET_BANDS_KM.map(snapRayDistanceM)

/** Allocation-free FNV-1a key over `LivingLand` (matches `partKey` 3-dp rounding). */
export function livingLandKey(land: LivingLand): string {
  let h = 2166136261
  const mix = (n: number) => { h = Math.imul(h ^ (n | 0), 16777619) }
  const mixNum = (v: number) => mix(Math.round(v * 1000))
  const mixStr = (s: string | null) => {
    if (s === null) { mix(0); return }
    mix(s.length)
    for (let i = 0; i < s.length; i++) mix(s.charCodeAt(i))
  }
  const mixSample = (s: LivingLandSample) => {
    mix(s.cover ?? -1); mixStr(s.coverSource)
    mixNum(s.albedo[0]); mixNum(s.albedo[1]); mixNum(s.albedo[2])
    mixStr(s.albedoSource); mixStr(s.albedoDate)
    mixNum(s.ndvi); mixStr(s.ndviSource); mixStr(s.ndviDate)
    mixNum(s.dryness); mixStr(s.drynessSource); mixStr(s.drynessDate)
    mixNum(s.snow); mixStr(s.snowSource); mixStr(s.snowDate)
  }
  mixStr(land.date); mixStr(land.utcDate); mix(land.month)
  mixStr(land.farGain.source); mix(land.farGain.cells)
  mixNum(land.farGain.rgb[0]); mixNum(land.farGain.rgb[1]); mixNum(land.farGain.rgb[2])
  mixSample(land.own)
  for (const pt of land.local) { mix(pt.eastM); mix(pt.northM); mixNum(pt.elevationM); mixSample(pt.sample) }
  for (const col of land.rays) {
    mixNum(col.x); mixNum(col.azimuth)
    for (const b of col.bands) { mix(b.distanceM); mixNum(b.elevationM); mixSample(b.sample) }
  }
  return (h >>> 0).toString(36)
}
