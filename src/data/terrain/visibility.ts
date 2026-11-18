import { apparentAngle, EARTH_R_KM, FAR_KM, RAY_DISTANCES, REFRACTION_K, type Panorama } from './panorama'
import { RIDGE_WIDTH } from './ridgeProjection'

export interface SeenPoint {
  angle: number
  groundAngle: number
  y: number
  groundY: number
}

const RAD = Math.PI / 180
const curvature = 1000 * (1 - REFRACTION_K) / (2 * EARTH_R_KM)
const relativeHeight = (angle: number, km: number) => Math.tan(angle * RAD) * km * 1000 + curvature * km * km
const mix = (a: number, b: number, t: number) => a + (b - a) * t

/** Build the foreground envelope after interpolating each DEM sample across bearings. */
export function visibilityAt(p: Panorama, yOf: (angle: number) => number) {
  // City columns query the same bearing repeatedly while walking their raster cells.
  const cache = new Map<number, { angles: number[]; before: number[] }>()
  return (x: number, km: number, heightM = 0): SeenPoint | null => {
    if (!(x >= 0 && x <= RIDGE_WIDTH && km >= RAY_DISTANCES[0] && km <= FAR_KM)) return null
    const position = x / RIDGE_WIDTH * (p.rays.length - 1)
    const left = Math.floor(position)
    const t = position - left
    const a = p.rays[left]
    const b = p.rays[Math.ceil(position)]
    if (a.profile?.length !== RAY_DISTANCES.length || b.profile?.length !== RAY_DISTANCES.length
      || km <= mix(a.near.distance, b.near.distance, t)) return null
    let profile = cache.get(x)
    if (!profile) {
      if (cache.size >= 512) cache.clear()
      const angles = a.profile.map((sample, i) => mix(sample.angle, b.profile[i].angle, t))
      let max = -Infinity
      const before = angles.map(angle => {
        const previous = max
        max = Math.max(max, angle)
        return previous
      })
      profile = { angles, before }
      cache.set(x, profile)
    }
    const { angles, before } = profile
    const i = RAY_DISTANCES.findIndex(distance => distance >= km - 1e-9)
    const exact = Math.abs(RAY_DISTANCES[i] - km) < 1e-9
    const height = exact ? relativeHeight(angles[i], km) : mix(
      relativeHeight(angles[i - 1], RAY_DISTANCES[i - 1]), relativeHeight(angles[i], RAY_DISTANCES[i]),
      (km - RAY_DISTANCES[i - 1]) / (RAY_DISTANCES[i] - RAY_DISTANCES[i - 1]),
    )
    const groundAngle = exact ? angles[i] : apparentAngle(height, km, 0)
    const angle = heightM ? apparentAngle(height + heightM, km, 0) : groundAngle
    if (angle < before[i]) return null
    // The stored visibility bit breaks quantization ties at sampled distances.
    if (!heightM && exact && angle === before[i] && !a.profile[i].seen && !b.profile[i].seen) return null
    return { angle, groundAngle, y: yOf(angle), groundY: yOf(groundAngle) }
  }
}
