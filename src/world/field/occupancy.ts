import { smoothstep, unit } from './genus'
import type { Lattice } from './types'

/** Input cover knots for the per-lattice calibration. */
export const COVER_KNOTS = [0, 0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.98, 1] as const

/** Corrected cover at each input knot, interpolated in cover space. */
export const COVER_CORRECTION: Record<Lattice, readonly number[]> = {
  low: [0, 0.0475, 0.0982, 0.2427, 0.4511, 0.665, 0.8165, 0.98, 1],
  tower: [0, 0.0418, 0.1035, 0.2396, 0.4439, 0.6686, 0.8277, 0.98, 1],
  mid: [0, 0.0444, 0.0736, 0.2085, 0.4222, 0.644, 0.8024, 0.98, 1],
  high: [0, 0.114, 0.1808, 0.3305, 0.5124, 0.6959, 0.8179, 0.98, 1],
}

// Disc area divided by pitch², using the clipped second moment for low.
const area = { low: 0.177, tower: 0.0973, mid: 0.582, high: 1.558 }

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
