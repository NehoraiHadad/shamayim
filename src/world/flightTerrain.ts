import { EARTH_R_KM, FAR_KM, RAY_DISTANCES, RAYS, REFRACTION_K } from '../data/terrain/panorama'
import type { SceneTerrain } from '../data/terrain/terrain'
import { fractionOf, SCENE_CAMERA } from '../domain/camera'
import { shadowHorizon } from './shadowHorizon'

/**
 * Terrain for flight, cloud shadows and rain feet. The panorama samples out to 60 km
 * and the local 250 m grid covers bearings behind the view. Heights are sea-level
 * metres. Visibility uses the panorama's curvature and refraction.
 */
export const curveDrop = (km: number) => ((km * km) * (1 - REFRACTION_K) / (2 * EARTH_R_KM)) * 1000

/** The local grid is preferred out to this far (km) where the rays do not reach (behind the view). */
export const FLIGHT_LOCAL_KM = 5.9

export interface FlightTerrain {
  /** The eye's height (m above sea level). */
  eyeM: number
  /** Ground (m above sea level) at km east, north of the eye; null where the data does not reach. */
  heightAt(e: number, n: number): number | null
  /** Ground there, or the eye's own ground where unknown (what a path may assume it flies over). */
  groundAt(e: number, n: number): number
  /** Nearest blocker (km) to a point `upM` metres above the eye, or null for clear sight. */
  blockedKm(e: number, n: number, upM: number): number | null
  /** Whether any land is known (a panorama or a local grid). */
  known: boolean
  /** Limits of the polar grid. The local fallback is separate. */
  panoramaHeightsM?: readonly [number, number]
  /** Verified upper bound for all finite samples returned by heightAt. */
  heightCeilingM?: number
  shadowBlocked?(east: number, north: number, eastPerUp: number, northPerUp: number): boolean
  occludedAt?(east: number, north: number, upM: number): boolean | undefined
}

/** The sample at or before each 50 m of distance (a look-up in place of a search: the paths ask thousands of times). */
const LOOKUP_STEP = 0.05
const BEFORE = (() => {
  const n = Math.ceil(RAY_DISTANCES[RAY_DISTANCES.length - 1] / LOOKUP_STEP) + 1
  const out = new Uint8Array(n)
  let j = 0
  for (let k = 0; k < n; k++) {
    while (j < RAY_DISTANCES.length - 2 && RAY_DISTANCES[j + 1] <= k * LOOKUP_STEP) j++
    out[k] = j
  }
  return out
})()

/** Index of the sample before the end of the interval containing the distance. */
function distanceIndex(km: number): number {
  const last = RAY_DISTANCES.length - 1
  if (km <= RAY_DISTANCES[0]) return 0
  if (km >= RAY_DISTANCES[last]) return last - 1
  let j = BEFORE[Math.floor(km / LOOKUP_STEP)]
  while (j < last - 1 && RAY_DISTANCES[j + 1] <= km) j++
  return j
}

const RAY_CURVE_DROP = RAY_DISTANCES.map(curveDrop)
const SLOPE_BLOCK = 8

const FIELDS = new WeakMap<SceneTerrain, FlightTerrain>()

/** Flat ground at the eye's foot: for a place whose land is not known (the paths then keep their height over it). */
export function flatTerrain(groundM: number): FlightTerrain {
  const eyeM = groundM + 2
  return { eyeM, heightAt: () => null, groundAt: () => groundM, blockedKm: () => null, known: false }
}

/** The ground and the sight lines of a place's land (memoised per terrain object). */
export function flightTerrain(terrain: SceneTerrain | null | undefined, groundM: number): FlightTerrain {
  if (!terrain || terrain.status === 'loading' || terrain.status === 'offline' || terrain.eyeM === undefined) {
    return flatTerrain(terrain?.eyeM !== undefined ? terrain.eyeM - 2 : groundM)
  }
  const hit = FIELDS.get(terrain)
  if (hit) return hit
  const eyeM = terrain.eyeM
  const camera = terrain.camera ?? SCENE_CAMERA
  const D = RAY_DISTANCES.length
  // The rays as a polar grid, in view order (x = 0 … 375), heights above sea level.
  const grid = new Float32Array(RAYS * D).fill(Number.NaN)
  if (terrain.groundAt) {
    for (let i = 0; i < RAYS; i++) {
      const x = (375 * i) / (RAYS - 1)
      for (let j = 0; j < D; j++) {
        const h = terrain.groundAt(x, RAY_DISTANCES[j])
        if (h !== null && Number.isFinite(h)) grid[i * D + j] = eyeM + h
      }
    }
  }
  let minM = Infinity, maxM = -Infinity
  for (const h of grid) {
    if (!Number.isFinite(h)) continue
    minM = Math.min(minM, h)
    maxM = Math.max(maxM, h)
  }
  const hasRays = minM <= maxM
  const blockCount = Math.ceil(D / SLOPE_BLOCK)
  const maxSlope = new Float64Array(RAYS * blockCount).fill(-Infinity)
  for (let i = 0; i < RAYS && hasRays; i++) for (let j = 0; j < D; j++) {
    const slope = (grid[i * D + j] - eyeM - RAY_CURVE_DROP[j]) / RAY_DISTANCES[j]
    const block = i * blockCount + Math.floor(j / SLOPE_BLOCK)
    if (slope > maxSlope[block]) maxSlope[block] = slope
  }
  const local = terrain.heightNear
  const own = local?.(0, 0) ?? eyeM - 2
  /** The rays' fractional index of a direction, or −1 out of the view. */
  const rayOf = (azimuth: number) => {
    const f = fractionOf(azimuth, camera)
    return f >= 0 && f <= 1 ? f * (RAYS - 1) : -1
  }
  // At distance d, relative to the panorama's angle interpolation, the
  // across-ray error is bounded by 1000*d*delta²*max(|tan(a)|*sec²(a))/4
  // for endpoint angle span delta in radians (the linear-interpolation
  // remainder for tan). Between distances the errors blend linearly.
  // Float32 storage adds at most 2^-24 times the largest endpoint magnitude.
  const rayHeight = (r: number, j: number, t: number) => {
    const i = Math.min(RAYS - 2, Math.floor(r)), u = r - i
    const a = grid[i * D + j], b = grid[(i + 1) * D + j], c = grid[i * D + j + 1], d = grid[(i + 1) * D + j + 1]
    return (a * (1 - u) + b * u) * (1 - t) + (c * (1 - u) + d * u) * t
  }
  const heightAt = (e: number, n: number): number | null => {
    const km = Math.sqrt(e * e + n * n)
    if (hasRays && km >= RAY_DISTANCES[0] && km <= FAR_KM) {
      const r = rayOf((Math.atan2(e, n) * 180) / Math.PI)
      if (r >= 0) {
        const j = distanceIndex(km)
        const t = (km - RAY_DISTANCES[j]) / (RAY_DISTANCES[j + 1] - RAY_DISTANCES[j])
        const h = rayHeight(r, j, t)
        if (Number.isFinite(h)) return h
      }
    }
    if (local && km <= FLIGHT_LOCAL_KM) return local(e, n)
    if (km < RAY_DISTANCES[0]) return own
    return null
  }
  const groundAt = (e: number, n: number) => heightAt(e, n) ?? own
  const blockedKm = (e: number, n: number, upM: number): number | null => {
    const km = Math.sqrt(e * e + n * n)
    if (km < 0.05) return null
    // The line of sight's height (m, in the curve-reduced frame the panorama measures its angles in) at each distance.
    const slope = (upM - curveDrop(km)) / km
    const ue = e / km, un = n / km
    const r = hasRays ? rayOf((Math.atan2(e, n) * 180) / Math.PI) : -1
    const until = km - 0.03
    if (r >= 0) {
      const i = Math.min(RAYS - 2, Math.floor(r)), u = r - i
      const left = i * D, right = (i + 1) * D
      const slopeMargin = 8 * Number.EPSILON * Math.max(1, Math.abs(slope), Math.abs(eyeM) / RAY_DISTANCES[0])
      for (let j = 0, block = 0; j < D && RAY_DISTANCES[j] < until; block++) {
        const end = Math.min(D, j + SLOPE_BLOCK)
        // Every interpolated slope is at most the larger endpoint maximum.
        // The rounding margin is eight double-precision units at this scale.
        const bound = Math.max(maxSlope[i * blockCount + block], maxSlope[(i + 1) * blockCount + block])
        if (bound < slope - slopeMargin) {
          j = end
          continue
        }
        for (; j < end && RAY_DISTANCES[j] < until; j++) {
          const seaLevelM = grid[left + j] * (1 - u) + grid[right + j] * u
          if (seaLevelM - eyeM - RAY_CURVE_DROP[j] > slope * RAY_DISTANCES[j]) return RAY_DISTANCES[j]
        }
      }
      return null
    }
    if (!local) return null
    // Behind the view only the local grid is known.
    for (let d = 0.25; d < Math.min(until, FLIGHT_LOCAL_KM); d += 0.125) {
      const h = local(ue * d, un * d)
      if (h !== null && h - eyeM - curveDrop(d) > slope * d) return d
    }
    return null
  }
  const shadowVisibility = hasRays
    ? shadowHorizon(grid, eyeM, minM, maxM, rayOf, distanceIndex, curveDrop, RAY_CURVE_DROP, FLIGHT_LOCAL_KM)
    : undefined
  const field: FlightTerrain = { eyeM, heightAt, groundAt, blockedKm, ...shadowVisibility, known: hasRays || !!local,
    panoramaHeightsM: hasRays ? [minM, maxM] : undefined,
    heightCeilingM: local && terrain.localHeightMaxM === undefined ? undefined : Math.max(maxM, own, terrain.localHeightMaxM ?? -Infinity) }
  FIELDS.set(terrain, field)
  return field
}
