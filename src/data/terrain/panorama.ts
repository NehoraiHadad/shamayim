/**
 * The horizon as seen from a place: for each direction across the scene, how high (in degrees) the land stands above
 * eye level. The scene draws it with the same vertical scale as the sky (`angleScale.ts`), so the sun or moon is hidden
 * exactly when its altitude is below the horizon angle in its direction.
 *
 * Each ray walks out from the place over a DEM. A point at distance d and height h is seen at
 *   atan((h - eye - d² (1 - k) / 2R) / d)
 * where the d² term is the earth's curvature (a far hill sinks below the line of sight) and k the usual refraction
 * coefficient (light bends down a little, giving back about an eighth of that drop). The horizon is the highest angle
 * along the ray. Two layers give the scene its depth: the near ridge (the highest within `NEAR_KM`) and the far horizon
 * (the highest at any distance); where the far land is no higher than the near ridge, the near ridge hides it.
 */

/** Earth radius (km) and refraction coefficient. */
export const EARTH_R_KM = 6371
export const REFRACTION_K = 0.13
/** Eye above the ground at the place (m). */
export const EYE_M = 2

/** Rays across the scene, evenly in azimuth from x = 0 to x = 375 (same mapping as the sky, `skyPoint`). */
export const RAYS = 201
/** Azimuth (deg) at the scene's left edge (x = 0), through south in the middle, to the right edge (x = 375). */
export const AZ_LEFT = 305
export const AZ_RIGHT = 55
const AZ_SPAN = AZ_LEFT - AZ_RIGHT
export const azimuthAt = (fraction: number) => AZ_LEFT - AZ_SPAN * fraction
export const azimuthFraction = (azimuth: number) => ((AZ_LEFT - azimuth + 360) % 360) / AZ_SPAN
/** Ridges closer than this (km) make the near layer; beyond is only in the far horizon. */
export const NEAR_KM = 5
/** How far the rays reach (km); past ~60 km even Hermon sinks under the curve from most places. */
export const FAR_KM = 60

/** Distances (km) sampled along each ray: fine near the place, coarser far out (matching the DEM's detail). */
export const RAY_DISTANCES: readonly number[] = [
  ...Array.from({ length: 24 }, (_, i) => 0.4 + i * 0.1), // 0.4 – 2.7 km every 100 m
  ...Array.from({ length: 31 }, (_, i) => 2.8 + i * 0.2), // 2.8 – 8.8 km every 200 m
  ...Array.from({ length: 33 }, (_, i) => 9.2 + i * 0.4), // 9.2 – 22 km every 400 m
  ...Array.from({ length: 39 }, (_, i) => 23 + i * 1), // 23 – 61 km every 1 km
].filter((d) => d <= FAR_KM + 1e-9)

/** Azimuth (deg) of ray i: west-north-west at the left edge, south in the middle, east-north-east at the right. */
export function rayAzimuth(i: number, rays = RAYS): number {
  const az = azimuthAt(i / (rays - 1))
  return (az + 360) % 360
}

/** Height (m) of the land at a distance and azimuth from a point, or NaN where unknown. */
export type HeightAt = (distanceKm: number, azimuth: number) => number

/** Apparent angle (deg) of a point `heightM` high at `distanceKm`, from an eye at `eyeM`, with curvature and refraction. */
export function apparentAngle(heightM: number, distanceKm: number, eyeM: number): number {
  const dropM = ((distanceKm * distanceKm) * (1 - REFRACTION_K) / (2 * EARTH_R_KM)) * 1000
  return (Math.atan2(heightM - eyeM - dropM, distanceKm * 1000) * 180) / Math.PI
}

/** The highest point of one layer in one direction: its angle (deg), height (m) and distance (km). */
export interface HorizonPoint {
  angle: number
  elevation: number
  distance: number
}

export interface HorizonRay {
  azimuth: number
  near: HorizonPoint
  far: HorizonPoint
  /** Distance (km) to the first sea-level point along the ray (the coast), or null when it never reaches the sea. */
  seaKm: number | null
}

export interface Panorama {
  /** Eye height above sea level (m): the ground at the place plus `EYE_M`. */
  eyeM: number
  /** Ground at the place (m). */
  groundM: number
  rays: HorizonRay[]
}

/**
 * The horizon along one ray: the far horizon is the highest angle anywhere along it, the near ridge the highest within
 * `NEAR_KM`. (Both are maxima over a fixed reach, so they change smoothly from ray to ray; a rule that looked for
 * separate crests flipped between neighbouring rays and drew spikes.)
 */
export function horizonRay(azimuth: number, heightAt: HeightAt, eyeM: number, distances = RAY_DISTANCES): HorizonRay {
  let near: HorizonPoint | null = null
  let far: HorizonPoint | null = null
  let seaKm: number | null = null
  for (const distance of distances) {
    const raw = heightAt(distance, azimuth)
    const elevation = Number.isFinite(raw) ? raw : 0
    if (seaKm === null && Number.isFinite(raw) && Math.abs(raw) < 0.5) seaKm = distance
    const point = { angle: apparentAngle(elevation, distance, eyeM), elevation, distance }
    if (distance <= NEAR_KM && (!near || point.angle > near.angle)) near = point
    if (!far || point.angle > far.angle) far = point
  }
  const flat = { angle: 0, elevation: eyeM, distance: 0 }
  return { azimuth, near: near ?? far ?? flat, far: far ?? flat, seaKm }
}

/** The whole panorama from a place, over a height lookup around it. */
export function computePanorama(heightAt: HeightAt, groundM: number, rays = RAYS): Panorama {
  const eyeM = groundM + EYE_M
  return {
    eyeM,
    groundM,
    rays: Array.from({ length: rays }, (_, i) => horizonRay(rayAzimuth(i, rays), heightAt, eyeM)),
  }
}

/** Moves `distanceKm` from a point along an azimuth (deg) on a sphere; good to metres at these ranges. */
export function destination(lat: number, lon: number, distanceKm: number, azimuth: number): { lat: number; lon: number } {
  const rad = Math.PI / 180
  const delta = distanceKm / EARTH_R_KM
  const theta = azimuth * rad
  const phi1 = lat * rad
  const phi2 = Math.asin(Math.sin(phi1) * Math.cos(delta) + Math.cos(phi1) * Math.sin(delta) * Math.cos(theta))
  const lambda2 = lon * rad + Math.atan2(Math.sin(theta) * Math.sin(delta) * Math.cos(phi1),
    Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2))
  return { lat: phi2 / rad, lon: lambda2 / rad }
}

/** Compact stored form: per ray [near angle, near m, near km, far angle, far m, far km, km to the sea or -1], rounded. */
export interface StoredPanorama {
  v: 1
  eyeM: number
  groundM: number
  rays: number[][]
}

const r2 = (v: number) => Math.round(v * 100) / 100
const r1 = (v: number) => Math.round(v * 10) / 10

export function packPanorama(p: Panorama): StoredPanorama {
  return {
    v: 1,
    eyeM: Math.round(p.eyeM),
    groundM: Math.round(p.groundM),
    rays: p.rays.map(({ near, far, seaKm }) => [r2(near.angle), Math.round(near.elevation), r1(near.distance),
      r2(far.angle), Math.round(far.elevation), r1(far.distance), seaKm === null ? -1 : r1(seaKm)]),
  }
}

export function unpackPanorama(s: StoredPanorama | null | undefined): Panorama | null {
  if (!s || s.v !== 1 || !Array.isArray(s.rays) || s.rays.length < 2) return null
  if (s.rays.some((ray) => !Array.isArray(ray) || ray.length !== 7 || ray.some((v) => typeof v !== 'number'))) return null
  return {
    eyeM: s.eyeM,
    groundM: s.groundM,
    rays: s.rays.map((ray, i) => ({
      azimuth: rayAzimuth(i, s.rays.length),
      near: { angle: ray[0], elevation: ray[1], distance: ray[2] },
      far: { angle: ray[3], elevation: ray[4], distance: ray[5] },
      seaKm: ray[6] < 0 ? null : ray[6],
    })),
  }
}
