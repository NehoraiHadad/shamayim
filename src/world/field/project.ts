import type { FieldCell } from './types'

/** Effective Earth radius in km with standard refraction. */
export const R_EFF_KM = 7433
const degrees = 180 / Math.PI

/** Apparent altitude in degrees using the spec's parabolic curvature. */
export function altitudeOf(zKm: number, dKm: number): number {
  // The quadratic sagitta differs from the circular sagitta by under 1.2 m at 250 km.
  return Math.atan2(zKm - dKm ** 2 / (2 * R_EFF_KM), dKm) * degrees
}

/** Ground distance in km to a given height along a ray in degrees. */
export function groundRangeAt(zKm: number, altDeg: number): number {
  if (altDeg === 90) return 0
  const slope = Math.tan(altDeg / degrees)
  const root = Math.sqrt(slope ** 2 + 2 * zKm / R_EFF_KM)
  return slope > 0 ? 2 * zKm / (root + slope) : R_EFF_KM * (root - slope)
}

/** Apparent footprint, top and width in degrees, and slant range in km. */
export function projectCell(cell: FieldCell) {
  const dKm = Math.hypot(cell.x, cell.y)
  const rangeKm = Math.hypot(dKm, cell.baseKm)
  return {
    az: (Math.atan2(cell.x, cell.y) * degrees + 360) % 360,
    aFar: altitudeOf(cell.baseKm, dKm + cell.r),
    aNear: dKm <= cell.r ? 90 : altitudeOf(cell.baseKm, dKm - cell.r),
    aTop: altitudeOf(cell.baseKm + cell.vKm, dKm),
    rangeKm,
    widthDeg: 2 * Math.atan2(cell.r, rangeKm) * degrees,
  }
}
