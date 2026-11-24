import { OUTLINE_ALT } from '../../world/field/edges'

/*
 * The clouds' vertical scale: a layout, not a projection. Three choices of look: where the dome takes over, how far under
 * the screen's top its zenith stands, and that it is spread over the sky between at an even px a degree on average.
 */

/** Look. Up to this altitude (deg) clouds stand on the relief, with the land and the bodies; above it the dome is spread,
 *  and the outlines are the air's: one altitude, so that a cloud meets one change. */
export const DOME_ALT = OUTLINE_ALT
/** Look. The dome's zenith stands this far under the sky surface's top (px): the rim of a cloud overhead shows. */
const DOME_TOP = 18
/** The step (deg) the relief's derivative is taken over: far over a double's rounding, far under the relief's 6° bend. */
const STEP = 1e-3
/** A Hermite cubic is monotone while neither end is steeper than three times its mean slope (Fritsch and Carlson 1980). */
const STEEPEST = 3
/** A root is found to this (px): some 1e-10°. The scale has no flat stretch, so a few steps find it; more only guard it. */
const CLOSE = 1e-10, STEPS = 60

/** Where a falling function crosses `px` between two altitudes: false position, an end kept twice counting half (Illinois). */
function crossing(y: (altitude: number) => number, px: number, low: number, high: number): number {
  let under = y(low) - px, over = y(high) - px, kept = 0, at = low
  for (let i = 0; i < STEPS; i++) {
    at = (low * over - high * under) / (over - under)
    const off = y(at) - px
    if (Math.abs(off) < CLOSE) break
    if (off > 0) {
      low = at
      under = off
      if (kept === 1) over /= 2
      kept = 1
    } else {
      high = at
      over = off
      if (kept === -1) under /= 2
      kept = -1
    }
  }
  return at
}

/**
 * Up to `DOME_ALT` the relief (`y`). Above, the rest of the dome over the sky the screen shows; it leaves the relief at the
 * relief's own px a degree: with no kink there, a cloud across the join is foreshortened more and more down to its base,
 * as an eye sees it, not stretched above a line and squashed below it. A cubic (Hermite), from the relief's slope at the
 * join to the dome's mean scale at the zenith.
 */
export function domeOf(y: (altitude: number) => number) {
  const join = y(DOME_ALT), top = Math.min(DOME_TOP, join * 0.5), span = join - top
  // The relief's derivative at the join, as a share of the dome's mean slope.
  const perDeg = (y(DOME_ALT - STEP) - y(DOME_ALT + STEP)) / (2 * STEP)
  const slope = span > 0 ? Math.min(STEEPEST, perDeg * (90 - DOME_ALT) / span) : 1
  const dome = (altitude: number) => {
    if (altitude <= DOME_ALT) return y(altitude)
    const t = (Math.min(90, altitude) - DOME_ALT) / (90 - DOME_ALT)
    return join - span * t * (slope * (1 - t) ** 2 + t * (2 - t))
  }
  const domeAltitudeAt = (px: number) => {
    if (px <= top) return 90
    const level = y(0)
    if (px === level) return 0
    // The relief combines sine and tanh, the dome is a cubic: both are monotone, so invert them numerically.
    if (px < join) return crossing(dome, px, DOME_ALT, 90)
    if (px < level) return crossing(y, px, 0, DOME_ALT)
    return px < y(-90) ? crossing(y, px, -90, 0) : -90
  }
  return { dome, domeAltitudeAt }
}
