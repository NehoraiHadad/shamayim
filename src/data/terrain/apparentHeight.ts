import { anglePx } from './angleScale'

/** One CSS px is the raster coverage floor at the 375 × 128 scene reference, independent of display DPR. */
export const MARK_MIN_PX = 1

/** Elevation angle of a drawn base, on the panorama's monotone relief scale. */
export function baseAngle(baseY: number, horizonY: number): number {
  let lo = -90, hi = 90
  // Forty bisections resolve 180 degrees to < 2e-10 degrees, below scene geometry's floating-point tolerance.
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (anglePx(mid) < horizonY - baseY) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/** Project the angular rise at the base's elevation. Resizing stretches x only. */
export function apparentHeight(heightM: number, km: number, a0 = 0): number {
  const rise = Math.atan2(heightM, km * 1000) * 180 / Math.PI
  return anglePx(a0 + rise) - anglePx(a0)
}
