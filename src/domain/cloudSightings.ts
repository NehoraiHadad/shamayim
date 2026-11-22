import { blendObservations, observationWeight, type CloudObservation } from './observedCloud'
import { smoothstep } from './smoothstep'
import type { LocalTime } from './types'

/**
 * One cloud the satellite saw near the place: a connected patch of cloudy pixels in the cloud mask, as seen from the
 * place. The mask is binary and its pixels are ~4–5 km over Israel, so this says "a cloud about there, about this
 * big", never its shape.
 */
export interface CloudSighting {
  /** Degrees from north, clockwise (90 = east). */
  azimuth: number
  /** Ground distance to the patch's centre, km. */
  distanceKm: number
  /** Width of the patch across the line of sight, km (at least one pixel). */
  widthKm: number
}

/** Patches further than this sit too low over the ridges to read, and the sample is no wider anyway. */
const MAX_KM = 28
/** At this cover, the forecast's own cloud field already fills the sky: no need to place single clouds. */
const BUSY_COVER = 50
const MAX_SIGHTINGS = 3

/**
 * The cloud patches in a square cloud mask centred on the place (row-major, north row first, `true` = cloud), nearest
 * and biggest first. A patch is a 4-connected group of cloudy pixels; its direction and distance are its centroid's.
 */
export function cloudSightings(mask: boolean[], n: number, boxKm: number): CloudSighting[] {
  const km = boxKm / n
  const seen = new Uint8Array(n * n)
  const out: (CloudSighting & { size: number })[] = []
  for (let start = 0; start < n * n; start++) {
    if (!mask[start] || seen[start]) continue
    const stack = [start]
    seen[start] = 1
    let count = 0, sx = 0, sy = 0
    const cells: [number, number][] = []
    while (stack.length) {
      const k = stack.pop()!
      const i = k % n, j = Math.floor(k / n)
      count += 1
      // East and north of the place, km.
      const x = (i + 0.5 - n / 2) * km, y = (n / 2 - j - 0.5) * km
      sx += x; sy += y
      cells.push([x, y])
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = i + di, b = j + dj
        const nk = b * n + a
        if (a < 0 || b < 0 || a >= n || b >= n || seen[nk] || !mask[nk]) continue
        seen[nk] = 1
        stack.push(nk)
      }
    }
    const cx = sx / count, cy = sy / count
    const distanceKm = Math.hypot(cx, cy)
    if (distanceKm > MAX_KM) continue
    const azimuth = ((Math.atan2(cx, cy) * 180) / Math.PI + 360) % 360
    // Spread across the line of sight: the patch's extent perpendicular to the direction it is seen in.
    const ux = distanceKm > 0 ? -cy / distanceKm : 1, uy = distanceKm > 0 ? cx / distanceKm : 0
    let lo = Infinity, hi = -Infinity
    for (const [x, y] of cells) {
      const s = x * ux + y * uy
      lo = Math.min(lo, s); hi = Math.max(hi, s)
    }
    out.push({ azimuth, distanceKm, widthKm: hi - lo + km, size: count })
  }
  // Rank by how big each patch looks from the place: width over distance (a near one fills more of the sky).
  const look = (s: CloudSighting) => s.widthKm / Math.max(3, s.distanceKm)
  return out.sort((a, b) => look(b) - look(a)).slice(0, MAX_SIGHTINGS)
    .map(({ azimuth, distanceKm, widthKm }) => ({ azimuth, distanceKm, widthKm }))
}

/** A sighting with how much to trust it now (0–1). */
export interface WeightedSighting extends CloudSighting {
  strength: number
  id?: string
}

/**
 * The single clouds to draw for "now": only while the observation is fresh enough to correct now, and only on a mostly
 * clear sky (with more cloud the forecast field already draws plenty). None for another hour.
 */
export function sightingsNow(obs: CloudObservation | null, now: LocalTime, cover: number, nowMs?: number): WeightedSighting[] {
  const clear = 1 - smoothstep(BUSY_COVER - 10, BUSY_COVER, cover)
  if (!obs || clear === 0) return []
  return blendObservations<WeightedSighting[]>(obs, nowMs, [], (sample) => {
    if (now < sample.at) return []
    const strength = clear * observationWeight(sample, now)
    if (strength === 0) return []
    return (sample.sightings ?? []).map((s, i) => ({ ...s, strength, ...(sample.receivedAt === undefined ? {} : { id: sample.at + ':' + i }) }))
  }, (before, after, weight) => [
    ...before.map((s) => ({ ...s, strength: s.strength * (1 - weight) })),
    ...after.map((s) => ({ ...s, strength: s.strength * weight })),
  ])
}
