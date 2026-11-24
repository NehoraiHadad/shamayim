//# allFunctionsCalledOnLoad
import { unknownLandRgb } from '../../data/land/climatology'
import { nearGroundAt, type LivingLand } from '../../world/landLiving'
import { linearRgbToSrgb, tciRgbToReflectance } from '../../world/landRadiometry'
import { FIRST_RING_M } from '../../world/nearGround'
import type { RGB } from '../../world/types'
import { labOf, rgbOfLab, toLinear } from './tone'

/**
 * Deterministic Oklab palette quantisation and ray-band albedo sampling (Stages 3 & 7 round 2: living land).
 * Raw BOA sRGB albedos are preserved without lightness squeezing; lighting, compression and chroma live in `landRadiance.ts`.
 */

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

/** WorldCover open water class (excluded from land-plane albedo; water is painted by `water.ts`). */
export const COVER_WATER = 8
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

/** Picks the source label carrying the highest total contribution weight. */
export function dominantWeightedSource(entries: readonly { source: string; weight: number }[]): string {
  const sums = new Map<string, number>()
  for (const { source, weight } of entries) if (weight > 0) sums.set(source, (sums.get(source) ?? 0) + weight)
  let best = entries[0]?.source ?? 'climatology', bestW = -1
  for (const [src, w] of sums) if (w > bestW) { bestW = w; best = src }
  return best
}

/** The panorama's profiles place the ground by 700 m, their fourth ring; from there in, the rays give way to the near ground. */
const RAYS_FROM_M = 700
interface NearTone { albedo: RGB; contribs: { source: string; weight: number }[] }
const nearTones = new WeakMap<LivingLand, Map<number, NearTone | null>>()

/** The dry ground's mean reflectance between the eye and the first DEM ring on a bearing; null over open water. */
function nearTone(land: LivingLand, azimuth: number): NearTone | null {
  let byBearing = nearTones.get(land)
  if (!byBearing) nearTones.set(land, byBearing = new Map())
  const hit = byBearing.get(azimuth)
  if (hit !== undefined) return hit
  const dry = nearGroundAt(land, azimuth).filter(({ sample }) => sample.cover !== COVER_WATER)
  const sum = dry.reduce((total, { weight }) => total + weight, 0)
  const mean = (k: number) => dry.reduce((total, { sample, weight }) => total + toLinear(sample.albedo[k]) * weight, 0) / sum
  const tone = sum > 0 ? { albedo: linearRgbToSrgb([mean(0), mean(1), mean(2)]),
    contribs: dry.map(({ sample, weight }) => ({ source: sample.albedoSource, weight: weight / sum })) } : null
  byBearing.set(azimuth, tone)
  return tone
}

/** Samples light-free land albedo & provenance along a ray column at distance `km` (log-interpolated, water-excluded). */
export function sampleBandAtKm(land: LivingLand, rayIdx: number, km: number): { albedo: RGB; source: string } {
  const rays = land.rays
  if (!rays.length) return nonWaterLocalFallback(land)
  const idx = clamp(Math.round(rayIdx), 0, rays.length - 1)
  let bands = rays[idx].bands.filter((b) => b.sample.cover !== COVER_WATER)
  for (let d = 1; d < rays.length && !bands.length; d++) {
    for (const j of [idx - d, idx + d]) {
      if (j < 0 || j >= rays.length) continue
      const cand = rays[j].bands.filter((b) => b.sample.cover !== COVER_WATER)
      if (cand.length) { bands = cand; break }
    }
  }
  if (!bands.length) return nonWaterLocalFallback(land)
  const distM = Math.max(50, km * 1000)
  const hi = bands.findIndex((b) => b.distanceM >= distM)
  let albedo: RGB
  const contribs: { source: string; weight: number }[] = []
  if (hi === -1) {
    const outer = bands.at(-1)!
    albedo = outer.sample.albedo
    contribs.push({ source: outer.sample.albedoSource, weight: 1 })
  } else if (hi === 0) {
    albedo = bands[0].sample.albedo
    contribs.push({ source: bands[0].sample.albedoSource, weight: 1 })
  } else {
    const a = bands[hi - 1], b = bands[hi]
    const t = clamp((Math.log(distM) - Math.log(a.distanceM)) / Math.max(1e-6, Math.log(b.distanceM) - Math.log(a.distanceM)), 0, 1)
    albedo = lerpRgb(a.sample.albedo, b.sample.albedo, t)
    contribs.push({ source: a.sample.albedoSource, weight: 1 - t }, { source: b.sample.albedoSource, weight: t })
  }
  const near = distM < RAYS_FROM_M ? nearTone(land, rays[idx].azimuth) : null
  if (near) {
    const share = clamp((RAYS_FROM_M - distM) / (RAYS_FROM_M - FIRST_RING_M), 0, 1)
    albedo = lerpRgb(albedo, near.albedo, share)
    for (const c of contribs) c.weight *= 1 - share
    for (const { source, weight } of near.contribs) contribs.push({ source, weight: weight * share })
  }
  return { albedo, source: dominantWeightedSource(contribs) }
}
