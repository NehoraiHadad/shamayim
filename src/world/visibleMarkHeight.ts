import { apparentHeight, baseAngle } from '../data/terrain/apparentHeight'

/** Physical visible height at the final base, clipped only by intervening terrain. */
export function visibleMarkHeight(heightM: number, sightKm: number, base: number,
  horizonY: number, crestPx = Infinity) {
  return Math.min(crestPx, apparentHeight(heightM, sightKm, baseAngle(base, horizonY)))
}
