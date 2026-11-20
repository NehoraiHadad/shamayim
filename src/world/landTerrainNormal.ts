import { FAR_KM, LOCAL_STEP_KM, RAY_DISTANCES } from '../data/terrain/panorama'
import type { SceneTerrain } from '../data/terrain/terrain'
import type { Camera } from '../domain/camera'
import { normalFromGradient, type Vec3 } from './landDelight'
import type { LivingLand, LivingLandSample } from './landLiving'

/**
 * Panorama ray geometry and local ENU terrain surface normals for living-land sampling and
 * Lambertian topographic de-lighting. Reuses `RAY_DISTANCES` and `LOCAL_STEP_KM` from `panorama.ts`.
 */

/** Ray columns across the camera span (every 5th panorama ray: 6.25° ≈ 109 m at 1 km, 2.2 km at 20 km). */
export const LIVING_LAND_RAYS = 41
const TARGET_BANDS_KM = [0.5, 1.0, 1.8, 3.0, 4.8, 7.2, 12, 20, 35, 55] as const
const RAD = Math.PI / 180

function snapRayDistanceM(targetKm: number): number {
  let best = RAY_DISTANCES[0]
  for (const d of RAY_DISTANCES) if (Math.abs(d - targetKm) < Math.abs(best - targetKm)) best = d
  return Math.round(best * 1000)
}

/** Distance bands (m) sampled along each ray, snapped directly to `RAY_DISTANCES`. */
export const LIVING_LAND_DISTANCES_M: readonly number[] = TARGET_BANDS_KM.map(snapRayDistanceM)

/** Unit ENU normal at `(dxKm, dyKm)` east/north of the place from `terrain.heightNear`, or null if absent. */
export function normalFromLocal(terrain: SceneTerrain, dxKm: number, dyKm: number): Vec3 | null {
  const h = terrain.heightNear
  if (!h) return null
  const s = LOCAL_STEP_KM
  const hE = h(dxKm + s, dyKm), hW = h(dxKm - s, dyKm), hN = h(dxKm, dyKm + s), hS = h(dxKm, dyKm - s)
  if (hE === null || hW === null || hN === null || hS === null) return null
  const spanM = 2 * s * 1000
  return normalFromGradient((hE - hW) / spanM, (hN - hS) / spanM)
}

/**
 * Unit ENU normal at `(x, km, azDeg)` along a panorama ray: uses the 2D `heightNear` DEM grid
 * within 5.5 km (all near Sentinel-2 cells), else central finite differences on `terrain.groundAt`
 * along and across the ray (respecting `camera.handed`), or null when terrain geometry is unavailable.
 */
export function normalAtRay(terrain: SceneTerrain, camera: Camera, x: number, km: number, azDeg: number): Vec3 | null {
  const azRad = azDeg * RAD, sinA = Math.sin(azRad), cosA = Math.cos(azRad)
  if (km <= 5.5) {
    const local = normalFromLocal(terrain, km * sinA, km * cosA)
    if (local) return local
  }
  const g = terrain.groundAt
  if (!g) return null
  const dr = Math.max(0.1, km * 0.05)
  const km0 = Math.max(RAY_DISTANCES[0], km - dr), km1 = Math.min(FAR_KM, km + dr)
  const dxPx = 2, x0 = Math.max(0, x - dxPx), x1 = Math.min(camera.width, x + dxPx)
  if (!(km1 > km0 && x1 > x0)) return null
  const h0 = g(x, km0), h1 = g(x, km1), hL = g(x0, km), hR = g(x1, km)
  if (h0 === null || h1 === null || hL === null || hR === null) return null
  const dhDr = (h1 - h0) / ((km1 - km0) * 1000)
  const dtM = km * 1000 * (((x1 - x0) / camera.pxPerDeg) * RAD)
  if (!(dtM > 0)) return null
  // Increasing x moves in azimuth by +camera.handed / camera.pxPerDeg, i.e. +camera.handed * u_t.
  const dhDt = camera.handed * ((hR - hL) / dtM)
  return normalFromGradient(dhDr * sinA + dhDt * cosA, dhDr * cosA - dhDt * sinA)
}

/** Allocation-free FNV-1a key over `LivingLand` (matches `partKey` 3-dp rounding, ~60x faster than JSON.stringify). */
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
    mix(s.cover ?? -1)
    mixNum(s.albedo[0]); mixNum(s.albedo[1]); mixNum(s.albedo[2])
    mixStr(s.albedoSource); mixStr(s.albedoDate); mixStr(s.delit)
    mixNum(s.ndvi); mixStr(s.ndviSource); mixStr(s.ndviDate)
    mixNum(s.dryness); mixStr(s.drynessSource); mixStr(s.drynessDate)
    mixNum(s.snow); mixStr(s.snowSource); mixStr(s.snowDate)
  }
  mixStr(land.date); mix(land.month); mixSample(land.own)
  for (const pt of land.local) { mix(pt.eastM); mix(pt.northM); mixNum(pt.elevationM); mixSample(pt.sample) }
  for (const col of land.rays) {
    mixNum(col.x); mixNum(col.azimuth)
    for (const b of col.bands) { mix(b.distanceM); mixNum(b.elevationM); mixSample(b.sample) }
  }
  return (h >>> 0).toString(36)
}
