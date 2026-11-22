import { RAY_DISTANCES, RAYS } from '../data/terrain/panorama'

const length = (e: number, n: number) => Math.sqrt(e * e + n * n)

/** A lower bound on the horizon for every bearing between each adjacent pair of grid rays. */
export function shadowHorizon(grid: Float32Array, eyeM: number, minM: number, maxM: number,
  rayOf: (azimuth: number) => number, distanceIndex: (km: number) => number,
  curveDrop: (km: number) => number, drops: readonly number[], localRange: number) {
  const count = RAY_DISTANCES.length
  const horizon = new Float64Array((RAYS - 1) * count)
  const upperHorizon = new Float64Array((RAYS - 1) * count)
  const groundMax = new Float64Array(RAYS - 1).fill(-Infinity)
  for (let ray = 0; ray < RAYS - 1; ray++) {
    let best = -Infinity, upper = -Infinity
    for (let j = 0; j < count; j++) {
      const index = ray * count + j
      const height = Math.min(grid[index], grid[index + count])
      // Missing endpoints cannot certify a blocker, even on a grid ray.
      if (Number.isFinite(height)) {
        best = Math.max(best, (height - eyeM - drops[j]) / RAY_DISTANCES[j])
        upper = Math.max(upper, (Math.max(grid[index], grid[index + count]) - eyeM - drops[j]) / RAY_DISTANCES[j])
        groundMax[ray] = Math.max(groundMax[ray], grid[index], grid[index + count])
      }
      horizon[index] = best
      upperHorizon[index] = upper
    }
  }
  const low = (minM - eyeM) / 1000
  const high = (maxM - eyeM) / 1000
  // The projection solver accepts up to 10 m of horizontal residual.
  const residual = 0.010001
  function shadowBlocked(east: number, north: number, eastPerUp: number, northPerUp: number) {
    const e0 = east + low * eastPerUp, n0 = north + low * northPerUp
    const e1 = east + high * eastPerUp, n1 = north + high * northPerUp
    const de = e1 - e0, dn = n1 - n0
    const lengthSquared = de * de + dn * dn
    const t = lengthSquared ? Math.max(0, Math.min(1, -(e0 * de + n0 * dn) / lengthSquared)) : 0
    const nearest = length(e0 + t * de, n0 + t * dn) - residual
    // The height interval only bounds panorama samples, so exclude any
    // projection line that could reach the local grid at another height.
    const displacement = length(eastPerUp, northPerUp)
    if (nearest <= localRange || (displacement
      ? Math.abs(east * northPerUp - north * eastPerUp) / displacement
      : length(east, north)) <= localRange + residual) return false
    const until = nearest - 0.03
    let j = distanceIndex(until)
    if (RAY_DISTANCES[j] >= until) j--
    if (j < 0) return false
    const angle0 = Math.atan2(e0, n0) * 180 / Math.PI
    const angle1 = Math.atan2(e1, n1) * 180 / Math.PI
    const sweep = ((angle1 - angle0 + 540) % 360) - 180
    const pad = Math.asin(residual / nearest) * 180 / Math.PI + 1e-9
    const lower = angle0 + Math.min(0, sweep) - pad
    const upper = angle0 + Math.max(0, sweep) + pad
    if (lower < -180 || upper > 180) return false
    const a = rayOf(lower), b = rayOf(upper)
    if (a < 0 || b < 0 || Math.abs(b - a) > 32) return false
    const first = Math.floor(Math.min(a, b)), last = Math.min(RAYS - 2, Math.floor(Math.max(a, b)))
    const farthest = Math.max(length(e0, n0), length(e1, n1)) + residual
    // Bound the height/range and curvature terms separately. Every certified
    // blocker is strictly before the closest possible centre and beats its highest slope.
    const curvature = curveDrop(nearest) / nearest
    for (let ray = first; ray <= last; ray++) {
      const up = groundMax[ray] - eyeM
      const slope = up / (up >= 0 ? nearest : farthest) - curvature
      if (horizon[ray * count + j] <= slope + 1e-8) return false
    }
    return true
  }
  function occludedAt(east: number, north: number, upM: number): boolean | undefined {
    const km = length(east, north)
    if (km < RAY_DISTANCES[0] + 0.03) return undefined
    const ray = rayOf(Math.atan2(east, north) * 180 / Math.PI)
    if (ray < 0) return undefined
    const until = km - 0.03
    let j = distanceIndex(until)
    if (RAY_DISTANCES[j + 1] < until) j++
    if (RAY_DISTANCES[j] >= until) j--
    if (j < 0) return false
    const index = Math.min(RAYS - 2, Math.floor(ray)) * count + j
    const slope = (upM - curveDrop(km)) / km
    if (horizon[index] > slope + 1e-8) return true
    if (upperHorizon[index] < slope - 1e-8) return false
  }
  return { shadowBlocked, occludedAt }
}
