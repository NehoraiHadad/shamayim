import { HOUSE_M } from '../../data/village/cellSource'
import type { VillageFrame } from './frame'

/** A landmark is drawn at most this many times its true ratio to the houses beside it. */
const RATIO = 2
/** How far outside its own group's box a landmark is still the settlement's, km. */
const OUTSIDE_KM = .15

/** Whether a landmark at a spot is the settlement's own: it is drawn there, and nowhere else. */
export const isOwnLandmark = ({ frame: { w, e, s, n } }: VillageFrame, dx: number, dy: number) =>
  dx >= w - OUTSIDE_KM && dx <= e + OUTSIDE_KM && dy >= s - OUTSIDE_KM && dy <= n + OUTSIDE_KM

/**
 * What a landmark's drawn height (px, at the middle depth times `nearness`) is multiplied by so that it is at most `RATIO`
 * times its true ratio to a house: 1 where it already is, and 1 for a town's share.
 */
export function heldToHouses(drawnPx: number, trueM: number, { housePx, share }: VillageFrame, nearness = 1): number {
  const most = RATIO * trueM * housePx / HOUSE_M * nearness
  return 1 + (Math.min(1, most / drawnPx) - 1) * share
}