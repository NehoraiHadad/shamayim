import { smoothstep, unit } from './genus'
import type { Lattice } from './types'

/** Input cover knots for the per-lattice calibration. */
export const COVER_KNOTS = [0, 0.02, 0.05, 0.1, 0.15, 0.25, 0.4, 0.5, 0.6, 0.75, 0.85, 0.9, 0.95, 0.98, 1] as const

/** Corrected cover at each input knot, interpolated in cover space. */
export const COVER_CORRECTION: Record<Lattice, readonly number[]> = {
  low: [0, 0.0268, 0.0517, 0.1, 0.1461, 0.2389, 0.3639, 0.4449, 0.5265, 0.6582, 0.7553, 0.8109, 0.8783, 0.98, 1],
  tower: [0, 0.0241, 0.051, 0.1036, 0.1525, 0.2432, 0.3699, 0.4525, 0.5348, 0.6628, 0.7583, 0.8122, 0.8777, 0.98, 1],
  mid: [0, 0.0433, 0.0695, 0.1024, 0.1426, 0.2282, 0.3438, 0.4271, 0.5103, 0.6381, 0.7347, 0.7934, 0.8621, 0.98, 1],
  high: [0, 0.0431, 0.0691, 0.1052, 0.1504, 0.2327, 0.3686, 0.4528, 0.5389, 0.6725, 0.7706, 0.8248, 0.8866, 0.98, 1],
}

// π E[r²] / pitch² for the clipped lognormal, divided by 3 for the high ellipse. The tower's scales with (median / pitch)²
// from its calibrated 0.0951 at 1.2 / 8 km (same sigma, so the same clipped shape).
const area = { low: 0.177, tower: 0.0951 * ((2.5 / 18) / (1.2 / 8)) ** 2, mid: 0.568, high: 0.507 }

/** The share of the low cover that stands as towers (Cu con and Cb) on a fully convective day: a storm is a few large
 *  cells with Cu and Sc between, not a sky of towers. */
export const TOWER_SHARE = 0.35

/** The towers' cover from the low cover at full convection. */
export const towerCoverOf = (low: number) => TOWER_SHARE * unit(low)

/** Boolean-model intensity, capped at the last open-deck cover. */
export function lambdaOf(c: number): number {
  return -Math.log1p(-Math.min(0.98, unit(c)))
}

/** Partition low cover so the union of the two lattices preserves it. */
export function splitLowCover(low: number, conv: number) {
  const tower = conv * towerCoverOf(low)
  return { low: (low - tower) / (1 - tower), tower }
}

/** Occupied fraction, radius multiplier and dimensionless floor weight. */
export function occupancyOf(lattice: Lattice, c: number, calibrated = true) {
  const hi = COVER_KNOTS.findIndex(knot => knot >= unit(c))
  const row = COVER_CORRECTION[lattice]
  const lo = Math.max(0, hi - 1)
  const fraction = hi > 0 ? (unit(c) - COVER_KNOTS[lo]) / (COVER_KNOTS[hi] - COVER_KNOTS[lo]) : 0
  const corrected = row[lo] + (row[hi] - row[lo]) * fraction
  const intensity = lambdaOf(calibrated ? corrected : c) / area[lattice]
  return { Q: Math.min(1, intensity), g: Math.max(1, Math.sqrt(intensity)), floorTau: 0.5 * smoothstep(0.9, 1, c) }
}

/** Smooth fractional cell occupancy from the current rank. */
export function shareOf(rankAtT: number, Q: number, width = 0.25): number {
  // Cap the sub-threshold tail at clear sky. The ramp is 1.5 / width-Lipschitz in rank and Q.
  return smoothstep(0, width, Math.min(Q, Q - rankAtT + width / 2))
}
