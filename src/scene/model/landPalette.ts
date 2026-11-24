//# allFunctionsCalledOnLoad
import { unknownLandRgb } from '../../data/land/climatology'
import { COVER_WATER } from '../../data/land/grid'
import { smoothstep } from '../../domain/smoothstep'
import type { LivingLand } from '../../world/landLiving'
import { linearRgbToSrgb, tciRgbToReflectance } from '../../world/landRadiometry'
import { dominantWeightedSource, FIRST_RING_M } from '../../world/nearGround'
import type { RGB } from '../../world/types'
import { labOf, mixLight, rgbOfLab } from './tone'

/**
 * Deterministic Oklab palette quantisation and ray-band albedo sampling (Stages 3 & 7 round 2: living land).
 * Raw BOA sRGB albedos are preserved without lightness squeezing; lighting, compression and chroma live in `landRadiance.ts`.
 */

export { COVER_WATER, dominantWeightedSource }

/** Minimum squared Oklab separation between quantised centroids (~0.018 ΔE). */
const MIN_CLUSTER_SEP_SQ = 0.018 * 0.018

interface Lab { l: number; a: number; b: number }
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
const roundByte = (c: number) => Math.round(clamp(c, 0, 1) * 255) / 255
export const roundRgb = (rgb: RGB): RGB => [roundByte(rgb[0]), roundByte(rgb[1]), roundByte(rgb[2])]

/** Deterministic farthest-point + Lloyd Oklab quantiser (pure, zero randomness, 1..maxColours). */
export function quantiseTones(tones: readonly RGB[], maxColours: number): { palette: RGB[]; indices: number[] } {
  if (!tones.length) return { palette: [[0.5, 0.52, 0.48]], indices: [] }
  const labs: Lab[] = tones.map(labOf)
  const distSq = (a: Lab, b: Lab) => (a.l - b.l) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2
  const mean: Lab = {
    l: labs.reduce((s, c) => s + c.l, 0) / labs.length,
    a: labs.reduce((s, c) => s + c.a, 0) / labs.length,
    b: labs.reduce((s, c) => s + c.b, 0) / labs.length,
  }
  let first = 0, bestD = Infinity
  for (let i = 0; i < labs.length; i++) { const d = distSq(labs[i], mean); if (d < bestD) { bestD = d; first = i } }
  const centers: Lab[] = [{ ...labs[first] }]
  const kMax = Math.max(1, Math.min(maxColours, labs.length))
  while (centers.length < kMax) {
    let farIdx = -1, farD = -1
    for (let i = 0; i < labs.length; i++) {
      let d = Infinity
      for (const c of centers) d = Math.min(d, distSq(labs[i], c))
      if (d > farD) { farD = d; farIdx = i }
    }
    if (farIdx < 0 || farD < MIN_CLUSTER_SEP_SQ) break
    centers.push({ ...labs[farIdx] })
  }
  const indices = new Array<number>(labs.length).fill(0)
  for (let iter = 0; iter < 4; iter++) {
    for (let i = 0; i < labs.length; i++) {
      let best = 0, bd = Infinity
      for (let k = 0; k < centers.length; k++) { const d = distSq(labs[i], centers[k]); if (d < bd) { bd = d; best = k } }
      indices[i] = best
    }
    for (let k = 0; k < centers.length; k++) {
      let sl = 0, sa = 0, sb = 0, n = 0
      for (let i = 0; i < labs.length; i++) if (indices[i] === k) { sl += labs[i].l; sa += labs[i].a; sb += labs[i].b; n++ }
      if (n > 0) centers[k] = { l: sl / n, a: sa / n, b: sb / n }
    }
  }
  return { palette: centers.map((c) => roundRgb(rgbOfLab(c))), indices }
}

const lerpRgb = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

/** Non-water fallback when rays lack dry land: non-water centre -> closest non-water local point -> explicit land climatology. */
export function nonWaterLocalFallback(land: LivingLand): { albedo: RGB; source: string } {
  if (land.own.cover !== COVER_WATER) return { albedo: land.own.albedo, source: land.own.albedoSource }
  let best = null as (typeof land.local)[number] | null
  let bestDist = Infinity
  for (const pt of land.local) {
    if (pt.sample.cover === COVER_WATER) continue
    const d = Math.hypot(pt.eastM, pt.northM)
    if (d < bestDist) { bestDist = d; best = pt }
  }
  if (best) return { albedo: best.sample.albedo, source: best.sample.albedoSource }
  return { albedo: linearRgbToSrgb(tciRgbToReflectance(unknownLandRgb(land.own.dryness))), source: 'climatology' }
}

/** Half way, in log distance as they are interpolated, between the rays' first two bands (0.5 and 1 km): all the rays' own. */
const RAYS_FROM_M = 700

/** The rays' own albedo & provenance at a distance (log-interpolated, water-excluded, from the nearest ray that has dry bands). */
function rayBandAt(land: LivingLand, idx: number, distM: number): { albedo: RGB; source: string } {
  const { rays } = land
  let bands = rays[idx]?.bands.filter((b) => b.sample.cover !== COVER_WATER) ?? []
  for (let d = 1; d < rays.length && !bands.length; d++) {
    for (const j of [idx - d, idx + d]) {
      if (j < 0 || j >= rays.length) continue
      const cand = rays[j].bands.filter((b) => b.sample.cover !== COVER_WATER)
      if (cand.length) { bands = cand; break }
    }
  }
  if (!bands.length) return nonWaterLocalFallback(land)
  const hi = bands.findIndex((b) => b.distanceM >= distM)
  if (hi <= 0) {
    const { sample } = hi < 0 ? bands.at(-1)! : bands[0]
    return { albedo: sample.albedo, source: sample.albedoSource }
  }
  const a = bands[hi - 1], b = bands[hi]
  const t = clamp((Math.log(distM) - Math.log(a.distanceM)) / Math.max(1e-6, Math.log(b.distanceM) - Math.log(a.distanceM)), 0, 1)
  return {
    albedo: lerpRgb(a.sample.albedo, b.sample.albedo, t),
    source: dominantWeightedSource([{ source: a.sample.albedoSource, weight: 1 - t }, { source: b.sample.albedoSource, weight: t }]),
  }
}

/** The near ground on a ray: its footprint's, the dry fallback where that is not known, null where it is open water. */
function nearOf(land: LivingLand, idx: number): { albedo: RGB; source: string } | null {
  const near = land.rays[idx]?.near ?? nonWaterLocalFallback(land)
  return near === 'water' ? null : near
}

/** Light-free land albedo & provenance on a ray at distance `km`: the near ground, then (a ramp with no edge, in linear light) the rays'. */
export function sampleBandAtKm(land: LivingLand, rayIdx: number, km: number): { albedo: RGB; source: string } {
  const idx = clamp(Math.round(rayIdx), 0, Math.max(0, land.rays.length - 1))
  const distM = Math.max(50, km * 1000), share = smoothstep(RAYS_FROM_M, FIRST_RING_M, distM)
  const near = share > 0 ? nearOf(land, idx) : null
  if (near && share === 1) return near
  const ray = rayBandAt(land, idx, distM)
  // The label is the larger part's; at the even point it is the rays'.
  return near ? { albedo: mixLight(ray.albedo, near.albedo, share), source: share > 0.5 ? near.source : ray.source } : ray
}
