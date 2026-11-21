import { smoothstep, unit } from './genus'
import type { Lattice } from './types'

/** Input cover knots for the per-lattice calibration. */
export const COVER_KNOTS = [0, 0.02, 0.05, 0.1, 0.15, 0.25, 0.4, 0.5, 0.6, 0.75, 0.85, 0.9, 0.95, 0.98, 1] as const

/** Corrected cover at each input knot, interpolated in cover space. */
export const COVER_CORRECTION: Record<Lattice, readonly number[]> = {
  low: [0, 0.0213, 0.0512, 0.1003, 0.1463, 0.2397, 0.3651, 0.4462, 0.528, 0.66, 0.7572, 0.8127, 0.8798, 0.98, 1],
  tower: [0, 0.0201, 0.0511, 0.103, 0.1517, 0.2412, 0.3677, 0.4493, 0.5311, 0.6591, 0.7554, 0.8097, 0.8747, 0.98, 1],
  mid: [0, 0.0322, 0.0507, 0.0932, 0.1423, 0.2282, 0.3439, 0.4276, 0.5106, 0.6386, 0.7353, 0.7939, 0.8628, 0.98, 1],
  high: [0, 0.0329, 0.053, 0.1032, 0.1503, 0.2328, 0.3687, 0.4533, 0.5395, 0.6732, 0.7711, 0.8252, 0.887, 0.98, 1],
}

// π E[r²] / pitch² for the clipped lognormal, divided by 3 for the high ellipse.
const area = { low: 0.177, tower: 0.0951, mid: 0.568, high: 0.507 }

/** Boolean-model intensity, capped at the last open-deck cover. */
export function lambdaOf(c: number): number {
  return -Math.log1p(-Math.min(0.98, unit(c)))
}

/** Partition low cover so the union of the two lattices preserves it. */
export function splitLowCover(low: number, conv: number) {
  const tower = conv * Math.min(low, 0.5)
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
export function shareOf(rankAtT: number, Q: number): number {
  // Fade the sub-threshold tail to zero when the forecast clears.
  return smoothstep(0, 0.125, Q) * smoothstep(0, 1, (Q - rankAtT) / 0.25 + 0.5)
}
