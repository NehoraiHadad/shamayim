import { azimuthAt as cameraAzimuthAt, fractionOf, SCENE_CAMERA, type Camera } from '../../domain/camera'

export { packPanorama, unpackPanorama, type StoredPanorama } from './storedPanorama'

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

/** Rays across the scene, evenly in azimuth from x = 0 to x = 375 (the camera's mapping, `domain/camera.ts`). */
export const RAYS = 201
/** Azimuth (deg) at a fraction of the scene's width, and the reverse (above 1 out of view); see `domain/camera.ts`. */
export const azimuthAt = (fraction: number, camera: Camera = SCENE_CAMERA) => cameraAzimuthAt(fraction, camera)
export const azimuthFraction = (azimuth: number, camera: Camera = SCENE_CAMERA) => fractionOf(azimuth, camera)
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

/**
 * Azimuth (deg) of ray i of the stored south panorama: west-north-west (305°) first, south in the middle, east-north-east
 * (55°) last. Fixed: it is the order the panorama is stored in, whatever the camera does (`domain/camera.ts`).
 */
export function rayAzimuth(i: number, rays = RAYS): number {
  const az = azimuthAt(i / (rays - 1), SCENE_CAMERA)
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

export interface GroundSample { angle: number; seen: boolean }

export interface HorizonRay {
  profile: GroundSample[]
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
  const profile: GroundSample[] = []
  for (const distance of distances) {
    const raw = heightAt(distance, azimuth)
    const elevation = Number.isFinite(raw) ? raw : 0
    if (seaKm === null && Number.isFinite(raw) && Math.abs(raw) < 0.5) seaKm = distance
    const point = { angle: apparentAngle(elevation, distance, eyeM), elevation, distance }
    profile.push({ angle: point.angle, seen: !far || point.angle >= far.angle })
    if (distance <= NEAR_KM && (!near || point.angle > near.angle)) near = point
    if (!far || point.angle > far.angle) far = point
  }
  const flat = { angle: 0, elevation: eyeM, distance: 0 }
  return { azimuth, near: near ?? far ?? flat, far: far ?? flat, seaKm, profile }
}

/** The whole panorama from a place, over a height lookup around it. */
export function computePanorama(heightAt: HeightAt, groundM: number, rays = RAYS,
  azimuthOf: (i: number) => number = (i) => rayAzimuth(i, rays)): Panorama {
  const eyeM = groundM + EYE_M
  return {
    eyeM,
    groundM,
    rays: Array.from({ length: rays }, (_, i) => horizonRay(azimuthOf(i), heightAt, eyeM)),
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
