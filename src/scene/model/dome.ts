/** Up to this altitude (deg) clouds stand on the relief; above it the dome is spread over the sky above. */
export const DOME_ALT = 22
/** The dome's zenith stands this far under the sky surface's top (px). */
const DOME_TOP = 18
/** Halvings of a range of altitudes that take it past a double's precision. */
const HALVINGS = 50

/**
 * The clouds' vertical scale. Up to `DOME_ALT` it is the relief (`y`). Above, the rest of the dome is spread over the sky
 * the screen shows, and it leaves the relief at the relief's own px a degree: with no kink there, a cloud across the join
 * is foreshortened more and more down to its base, as an eye sees it, not stretched above a line and squashed below it.
 * A cubic (Hermite), from the relief's slope at the join to the dome's mean scale at the zenith.
 */
export function domeOf(y: (altitude: number) => number) {
  const join = y(DOME_ALT), top = Math.min(DOME_TOP, join * 0.5), span = join - top
  // The relief's slope over the last degree under the join, as a share of the dome's mean one.
  const slope = span > 0 ? (y(DOME_ALT - 1) - join) * (90 - DOME_ALT) / span : 1
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
