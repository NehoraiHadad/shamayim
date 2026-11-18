import { RAY_DISTANCES, rayAzimuth, type Panorama } from './panorama'
import { packProfiles, unpackProfiles } from './profilePacking'

/** Compact stored form: per ray [near angle, near m, near km, far angle, far m, far km, km to the sea or -1], rounded. */
export interface StoredPanorama {
  v: 3
  eyeM: number
  groundM: number
  rays: number[][]
  profiles: string
}

const r2 = (v: number) => Math.round(v * 100) / 100
const r1 = (v: number) => Math.round(v * 10) / 10

export function packPanorama(p: Panorama): StoredPanorama {
  return {
    v: 3,
    profiles: packProfiles(p.rays.flatMap(ray => ray.profile)),
    eyeM: Math.round(p.eyeM),
    groundM: Math.round(p.groundM),
    rays: p.rays.map(({ near, far, seaKm }) => [r2(near.angle), Math.round(near.elevation), r1(near.distance),
      r2(far.angle), Math.round(far.elevation), r1(far.distance), seaKm === null ? -1 : r1(seaKm)]),
  }
}

export function unpackPanorama(value: unknown): Panorama | null {
  const s = value as StoredPanorama | null | undefined
  if (!s || s.v !== 3 || !Number.isFinite(s.eyeM) || !Number.isFinite(s.groundM)
    || typeof s.profiles !== 'string' || !Array.isArray(s.rays) || s.rays.length < 2) return null
  if (s.rays.some((ray) => !Array.isArray(ray) || ray.length !== 7 || ray.some(v => !Number.isFinite(v)))) return null
  const profiles = unpackProfiles(s.profiles, s.rays.length * RAY_DISTANCES.length)
  if (!profiles) return null
  return {
    eyeM: s.eyeM,
    groundM: s.groundM,
    rays: s.rays.map((ray, i) => ({
      azimuth: rayAzimuth(i, s.rays.length),
      profile: profiles.slice(i * RAY_DISTANCES.length, (i + 1) * RAY_DISTANCES.length),
      near: { angle: ray[0], elevation: ray[1], distance: ray[2] },
      far: { angle: ray[3], elevation: ray[4], distance: ray[5] },
      seaKm: ray[6] < 0 ? null : ray[6],
    })),
  }
}
