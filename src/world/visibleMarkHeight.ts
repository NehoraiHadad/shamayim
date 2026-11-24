import type { WorldMark } from './markGeometry'
import { apparentHeight, baseAngle } from '../data/terrain/apparentHeight'
import { anglePx } from '../data/terrain/angleScale'

/** Physical visible height at the final base, clipped only by intervening terrain. */
export function visibleMarkHeight(heightM: number, sightKm: number, base: number,
  horizonY: number, crestPx = Infinity) {
  return Math.min(crestPx, apparentHeight(heightM, sightKm, baseAngle(base, horizonY)))
}

export function neighbourHeight(mark: WorldMark, base: number, horizonY: number) {
  if (mark.heightM === undefined || mark.sightKm === undefined) return mark.trueHeightPx ?? mark.h * mark.scale
  return visibleMarkHeight(mark.heightM, mark.sightKm, base, horizonY, mark.crestPx)
}

/** The relief slope peaks at the horizon and falls symmetrically. The largest
 * apparent rise is at an interval endpoint or when the source straddles the horizon evenly.
 */
export function neighbourHeightRange(mark: WorldMark, lo: number, hi: number, horizonY: number) {
  const a = neighbourHeight(mark, lo, horizonY), b = neighbourHeight(mark, hi, horizonY)
  if (mark.heightM === undefined || mark.sightKm === undefined) return [a, a] as const
  const halfRise = Math.atan2(mark.heightM, mark.sightKm * 1000) * 90 / Math.PI
  const peakBase = horizonY - anglePx(-halfRise)
  const peak = peakBase > lo && peakBase < hi ? neighbourHeight(mark, peakBase, horizonY) : 0
  return [Math.min(a, b), Math.max(a, b, peak)] as const
}
