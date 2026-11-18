import { EARTH_R_KM, FAR_KM, RAY_DISTANCES, REFRACTION_K, type Panorama } from './panorama'
import { RIDGE_WIDTH } from './ridgeProjection'

const RAD = Math.PI / 180
const curvature = 1000 * (1 - REFRACTION_K) / (2 * EARTH_R_KM)
export const relativeHeight = (angle: number, km: number) => Math.tan(angle * RAD) * km * 1000 + curvature * km * km
const mix = (a: number, b: number, t: number) => a + (b - a) * t

type Ray = Panorama['rays'][number]
type Profile = { angles: number[]; before: number[]; heights: number[]; nearKm: number; a: Ray; b: Ray }

/** Interpolate the DEM across bearings before building its foreground envelope. */
export function sightProfiles({ rays }: Panorama) {
  const cache = new Map<number, Profile>()
  const profileAt = (x: number) => {
    if (!(x >= 0 && x <= RIDGE_WIDTH)) return null
    const cached = cache.get(x)
    if (cached) return cached
    const position = x / RIDGE_WIDTH * (rays.length - 1)
    const left = Math.floor(position)
    const t = position - left
    const a = rays[left], b = rays[Math.ceil(position)]
    if (a?.profile?.length !== RAY_DISTANCES.length || b?.profile?.length !== RAY_DISTANCES.length) return null
    const angles = a.profile.map((sample, i) => mix(sample.angle, b.profile[i].angle, t))
    let max = -Infinity
    const before = angles.map(angle => {
      const previous = max
      max = Math.max(max, angle)
      return previous
    })
    const profile = { angles, before, heights: angles.map((angle, i) => relativeHeight(angle, RAY_DISTANCES[i])),
      nearKm: mix(a.near.distance, b.near.distance, t), a, b }
    // Repeated samples on the same city ray share this profile.
    if (cache.size >= 512) cache.clear()
    cache.set(x, profile)
    return profile
  }
  const groundAt = (x: number, km: number) => {
    if (!inProfile(km)) return null
    const profile = profileAt(x)
    return profile && sampleGround(profile, km).height
  }
  return { profileAt, groundAt }
}

export const inProfile = (km: number) => km >= RAY_DISTANCES[0] && km <= FAR_KM

export function sampleGround({ angles, heights }: Profile, km: number) {
  let left = 0, right = RAY_DISTANCES.length - 1
  while (left < right) {
    const mid = (left + right) >>> 1
    if (RAY_DISTANCES[mid] < km - 1e-9) left = mid + 1
    else right = mid
  }
  const i = left
  const distance = RAY_DISTANCES[i]
  const exact = Math.abs(distance - km) < 1e-9
  const height = km === distance ? heights[i] : exact ? relativeHeight(angles[i], km)
    : mix(heights[i - 1], heights[i], (km - RAY_DISTANCES[i - 1]) / (distance - RAY_DISTANCES[i - 1]))
  return { i, exact, height }
}
