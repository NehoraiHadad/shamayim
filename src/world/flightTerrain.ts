import { EARTH_R_KM, FAR_KM, RAY_DISTANCES, RAYS, REFRACTION_K } from '../data/terrain/panorama'
import type { SceneTerrain } from '../data/terrain/terrain'
import { fractionOf, SCENE_CAMERA } from '../domain/camera'

/*
 * The real ground under what flies (the owner's report of 2026-11-20: "pay attention to where they fly, so that they don't
 * suddenly fly into the mountain"). One height field per place's land, built once from the data the scene already holds:
 * the panorama's rays (the DEM sampled out to 60 km along every bearing in view, every 100 m near the place and 1 km far
 * out) and the local grid round the place (every direction, 250 m, ~6 km). Two questions are asked of it:
 * - the ground (m above sea level) at a point, east and north of the eye: the flocks keep their kind's height over it,
 *   the airport traffic its clearance;
 * - whether the land truly stands between the eye and a point in the air (its line of sight, with the Earth's curve and
 *   the refraction the panorama itself uses): an object is hidden only by land that is truly in front of it.
 * Pure: no clock, no randomness, nothing but numbers (worker-safe).
 */

/** The curve's drop (m) at `km` over the ground, less the share refraction gives back (the panorama's own formula). */
export const curveDrop = (km: number) => ((km * km) * (1 - REFRACTION_K) / (2 * EARTH_R_KM)) * 1000

/** The local grid is preferred out to this far (km) where the rays do not reach (behind the view). */
const LOCAL_KM = 5.9

export interface FlightTerrain {
  /** The eye's height (m above sea level). */
  eyeM: number
  /** Ground (m above sea level) at km east, north of the eye; null where the data does not reach. */
  heightAt(e: number, n: number): number | null
  /** Ground there, or the eye's own ground where unknown (what a path may assume it flies over). */
  groundAt(e: number, n: number): number
  /**
   * Whether the land stands in the line of sight from the eye to a point km east, north of it and `upM` over the eye:
   * the nearest distance (km over the ground) where the ground rises above that line, or null when the line is clear.
   */
  blockedKm(e: number, n: number, upM: number): number | null
  /** Whether any land is known (a panorama or a local grid). */
  known: boolean
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

/** The piece of `RAY_DISTANCES` a distance falls in: [index of the sample at or before it, fraction to the next]. */
function distanceIndex(km: number): [number, number] {
  const last = RAY_DISTANCES.length - 1
  if (km <= RAY_DISTANCES[0]) return [0, 0]
  if (km >= RAY_DISTANCES[last]) return [last - 1, 1]
  let j = BEFORE[Math.floor(km / LOOKUP_STEP)]
  while (j < last - 1 && RAY_DISTANCES[j + 1] <= km) j++
  return [j, (km - RAY_DISTANCES[j]) / (RAY_DISTANCES[j + 1] - RAY_DISTANCES[j])]
}

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
  const hasRays = grid.some(Number.isFinite)
  const local = terrain.heightNear
  const own = local?.(0, 0) ?? eyeM - 2
  /** The rays' fractional index of a direction, or −1 out of the view. */
  const rayOf = (azimuth: number) => {
    const f = fractionOf(azimuth, camera)
    return f >= 0 && f <= 1 ? f * (RAYS - 1) : -1
  }
  const rayHeight = (r: number, j: number, t: number) => {
    const i = Math.min(RAYS - 2, Math.floor(r)), u = r - i
    const a = grid[i * D + j], b = grid[(i + 1) * D + j], c = grid[i * D + j + 1], d = grid[(i + 1) * D + j + 1]
    return (a * (1 - u) + b * u) * (1 - t) + (c * (1 - u) + d * u) * t
  }
  const heightAt = (e: number, n: number): number | null => {
    const km = Math.hypot(e, n)
    if (hasRays && km >= RAY_DISTANCES[0] && km <= FAR_KM) {
      const r = rayOf((Math.atan2(e, n) * 180) / Math.PI)
      if (r >= 0) {
        const [j, t] = distanceIndex(km)
        const h = rayHeight(r, j, t)
        if (Number.isFinite(h)) return h
      }
    }
    if (local && km <= LOCAL_KM) return local(e, n)
    if (km < RAY_DISTANCES[0]) return own
    return null
  }
  const groundAt = (e: number, n: number) => heightAt(e, n) ?? own
  const blockedKm = (e: number, n: number, upM: number): number | null => {
    const km = Math.hypot(e, n)
    if (km < 0.05) return null
    // The line of sight's height (m, in the curve-reduced frame the panorama measures its angles in) at each distance.
    const slope = (upM - curveDrop(km)) / km
    const ue = e / km, un = n / km
    const r = hasRays ? rayOf((Math.atan2(e, n) * 180) / Math.PI) : -1
    const until = km - 0.03
    if (r >= 0) {
      for (let j = 0; j < D && RAY_DISTANCES[j] < until; j++) {
        const d = RAY_DISTANCES[j]
        const h = rayHeight(r, j, 0)
        if (Number.isFinite(h) && h - eyeM - curveDrop(d) > slope * d) return d
      }
      return null
    }
    if (!local) return null
    // Behind the view only the local grid is known.
    for (let d = 0.25; d < Math.min(until, LOCAL_KM); d += 0.125) {
      const h = local(ue * d, un * d)
      if (h !== null && h - eyeM - curveDrop(d) > slope * d) return d
    }
    return null
  }
  const field: FlightTerrain = { eyeM, heightAt, groundAt, blockedKm, known: hasRays || !!local }
  FIELDS.set(terrain, field)
  return field
}
