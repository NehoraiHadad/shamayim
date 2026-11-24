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
/** Halvings of a range of altitudes that take it past a double's precision. */
const HALVINGS = 50

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
    if (px === y(0)) return 0
    // The relief combines sine and tanh, the dome is a cubic: both are monotone, so invert them numerically.
    let low = px < join ? DOME_ALT : -90, high = px < join ? 90 : DOME_ALT
    for (let i = 0; i < HALVINGS; i++) {
      const mid = (low + high) / 2
      if (dome(mid) > px) low = mid
      else high = mid
    }
    return (low + high) / 2
  }
  return { dome, domeAltitudeAt }
}
