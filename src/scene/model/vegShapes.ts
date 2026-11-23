//# allFunctionsCalledOnLoad
import type { Footprint } from './vegFootprint'

export const PALM_CROWN_HEIGHT = 0.62
export const PALM_FROND_LENGTH = 1.55
export const PALM_FROND_MAX_JITTER = 1.14
export const PALM_FROND_MAX_RISE = 1.16
export const PALM_FROND_MAX_DROOP = 0.82
export const palmBend = (r: number, phase: number) => Math.sin(phase) * r * 0.42

/** Includes the trunk, frond Bézier control points, stroke caps, crown and ground shadow. */
export function treeExtent(x: number, y: number, r: number, height: number, phase: number, kind: number, sx: number): Footprint {
  if (kind !== 3) {
    // Bounds share the largest lobe, shaded lobe and understory multipliers in landVegCrowns.
    return [x - r * 1.49 / sx, y - r * 1.68, x + r * 1.49 / sx, y + Math.max(0.7, r * 0.76)]
  }
  const crownX = x + palmBend(r, phase) / sx, crownY = y - height * PALM_CROWN_HEIGHT
  const cap = Math.max(0.55, r * 0.38) / 2
  const reach = (r * PALM_FROND_LENGTH * PALM_FROND_MAX_JITTER + cap) / sx
  return [Math.min(x - r / sx, crownX - reach), crownY - r * PALM_FROND_MAX_RISE - cap,
    Math.max(x + r / sx, crownX + reach), Math.max(y + 0.25 + Math.max(0.32, r * 0.25), crownY + r * PALM_FROND_MAX_DROOP + cap)]
}

/** Both tuft silhouettes and their shifted ground shadow fit in this envelope. */
export function tuftExtent(x: number, y: number, r: number, sx: number): Footprint {
  return [x - r * 1.19 / sx, y - Math.max(r * 0.97, r * 0.84 + 0.225),
    x + r * 1.19 / sx, y + r * 0.24 + Math.max(0.30, r * 0.28)]
}
