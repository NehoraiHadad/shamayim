//# allFunctionsCalledOnLoad
import { nearGroundAt, type LivingLand } from '../../world/landLiving'
import { linearRgbToSrgb } from '../../world/landRadiometry'
import type { GroundShare } from '../../world/nearGround'
import type { RGB } from '../../world/types'
import { toLinear } from './tone'

/** The colour of the ground nearer than the first DEM ring: the dry cover's mean reflectance, by area, in linear light. */

/** WorldCover open water class (excluded from land-plane albedo; water is painted by `water.ts`). */
export const COVER_WATER = 8

export interface GroundTone { albedo: RGB; source: string }

/** Picks the source label carrying the highest total contribution weight. */
export function dominantWeightedSource(entries: readonly { source: string; weight: number }[]): string {
  const sums = new Map<string, number>()
  for (const { source, weight } of entries) if (weight > 0) sums.set(source, (sums.get(source) ?? 0) + weight)
  let best = entries[0]?.source ?? 'climatology', bestW = -1
  for (const [src, w] of sums) if (w > bestW) { bestW = w; best = src }
  return best
}

function meanOf(shares: readonly GroundShare[]): GroundTone | null {
  const dry = shares.filter(({ sample }) => sample.cover !== COVER_WATER)
  if (!dry.length) return null
  const source = dominantWeightedSource(dry.map(({ sample, weight }) => ({ source: sample.albedoSource, weight })))
  if (dry.every(({ sample }) => sample === dry[0].sample)) return { albedo: dry[0].sample.albedo, source }
  const sum = dry.reduce((total, { weight }) => total + weight, 0)
  const mean = (k: number) => dry.reduce((total, { sample, weight }) => total + toLinear(sample.albedo[k]) * weight, 0) / sum
  return { albedo: linearRgbToSrgb([mean(0), mean(1), mean(2)]), source }
}

const tones = new WeakMap<LivingLand, Map<number | 'own', GroundTone | null>>()
function held(land: LivingLand, at: number | 'own', shares: () => GroundShare[]): GroundTone | null {
  let byBearing = tones.get(land)
  if (!byBearing) tones.set(land, byBearing = new Map())
  let tone = byBearing.get(at)
  if (tone === undefined) byBearing.set(at, tone = meanOf(shares()))
  return tone
}

/** The ground between the eye and the first DEM ring on a bearing (the place's own sample where no cover is loaded); null over water. */
export const nearTone = (land: LivingLand, azimuth: number) =>
  held(land, azimuth, () => nearGroundAt(land, azimuth) ?? [{ sample: land.own, weight: 1 }])

/** The place's own ground: the same over every bearing in view; null where no cover is loaded or all is water. */
export const ownGroundTone = (land: LivingLand) =>
  held(land, 'own', () => land.rays.flatMap(({ azimuth }) => nearGroundAt(land, azimuth) ?? []))
