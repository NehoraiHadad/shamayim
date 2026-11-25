import type { SolarEclipseElements } from './solarEclipseElements'

const RAD = Math.PI / 180
const HOUR = 3_600_000
/** The elements are fitted over six hours centered on the reference epoch. */
const ELEMENTS_RADIUS_HOURS = 3
export const ELEMENTS_RADIUS_MS = ELEMENTS_RADIUS_HOURS * HOUR
const EARTH_RADIUS_M = 6_378_137
const POLAR_RATIO = 1 - 1 / 298.257223563
const EARTH_TURN_PER_SECOND = 360.985647 / 86_400
const QUARTER_SECOND_IN_HOURS = 250 / HOUR

interface Observer { lat: number; lon: number; elevation?: number }

interface EclipsePhase { from: number; to: number; peak: number }

interface LocalEclipse {
  partial: EclipsePhase
  central: (EclipsePhase & { kind: 'total' | 'annular' }) | null
  sunAt: (ms: number) => { altitude: number; azimuth: number }
}

function polynomial([constant, linear, quadratic = 0, cubic = 0]: SolarEclipseElements['elements'][number], t: number) {
  return constant + t * (linear + t * (quadratic + t * cubic))
}

/** Search the single minimum as the shadow passes the observer. Times are decimal hours from the epoch. */
function minimum(from: number, to: number, valueAt: (t: number) => number) {
  while (to - from > QUARTER_SECOND_IN_HOURS) {
    const left = from + (to - from) / 3, right = to - (to - from) / 3
    if (valueAt(left) <= valueAt(right)) to = right
    else from = left
  }
  return (from + to) / 2
}

/** Find an eclipse contact from its outside and inside; return the side where the discs still touch. */
function contact(outside: number, inside: number, gap: (t: number) => number) {
  if (gap(outside) <= 0) return outside
  while (Math.abs(outside - inside) > QUARTER_SECOND_IN_HOURS) {
    const mid = (outside + inside) / 2
    if (gap(mid) > 0) outside = mid
    else inside = mid
  }
  return inside
}

/**
 * Topocentric contact predictions for one eclipse. The shadow cone's position and radius in the Besselian fundamental
 * plane are compared to the observer's position projected into that plane. A negative inner cone radius means totality.
 * The shadow axis gives the solar direction to the accuracy needed for terrain and the horizon.
 */
export function localSolarEclipse(eclipse: SolarEclipseElements, { lat, lon, elevation = 0 }: Observer): LocalEclipse | null {
  const [x, y, d, l1, l2, mu] = eclipse.elements
  const latitude = lat * RAD, sinLat = Math.sin(latitude), cosLat = Math.cos(latitude)
  const reducedLatitude = Math.atan2(POLAR_RATIO * sinLat, cosLat)
  const rhoSin = POLAR_RATIO * Math.sin(reducedLatitude) + elevation / EARTH_RADIUS_M * sinLat
  const rhoCos = Math.cos(reducedLatitude) + elevation / EARTH_RADIUS_M * cosLat
  const meridian = lon - EARTH_TURN_PER_SECOND * eclipse.deltaT
  const angleAt = (t: number) => {
    const declination = polynomial(d, t) * RAD, hourAngle = (polynomial(mu, t) + meridian) * RAD
    return { sinD: Math.sin(declination), cosD: Math.cos(declination), sinH: Math.sin(hourAngle), cosH: Math.cos(hourAngle) }
  }
  const shadowAt = (t: number) => {
    const { sinD, cosD, sinH, cosH } = angleAt(t)
    const xi = rhoCos * sinH, eta = rhoSin * cosD - rhoCos * cosH * sinD
    const zeta = rhoSin * sinD + rhoCos * cosH * cosD
    return {
      distance: Math.hypot(polynomial(x, t) - xi, polynomial(y, t) - eta),
      outerRadius: polynomial(l1, t) - zeta * eclipse.tanF1,
      innerRadius: polynomial(l2, t) - zeta * eclipse.tanF2,
    }
  }
  const ms = (t: number) => eclipse.epoch + t * HOUR
  const phaseOf = (gap: (t: number) => number, from: number, to: number) => {
    const middle = minimum(from, to, gap)
    if (gap(middle) >= 0) return null
    return { from: ms(contact(from, middle, gap)), to: ms(contact(to, middle, gap)), peak: ms(middle) }
  }
  const partial = phaseOf((t) => {
    const { distance, outerRadius } = shadowAt(t)
    return distance - outerRadius
  }, -ELEMENTS_RADIUS_HOURS, ELEMENTS_RADIUS_HOURS)
  if (!partial) return null

  const hours = (at: number) => (at - eclipse.epoch) / HOUR
  const inner = phaseOf((t) => {
    const { distance, innerRadius } = shadowAt(t)
    return distance - Math.abs(innerRadius)
  }, hours(partial.from), hours(partial.to))
  const central = inner ? {
    ...inner, kind: shadowAt(hours(inner.peak)).innerRadius < 0 ? 'total' as const : 'annular' as const,
  } : null

  return { partial, central, sunAt: (at) => {
    const { sinD, cosD, sinH, cosH } = angleAt(hours(at))
    const sinAltitude = sinLat * sinD + cosLat * cosD * cosH
    const altitude = Math.asin(Math.min(1, Math.max(-1, sinAltitude))) / RAD
    const azimuth = Math.atan2(-cosD * sinH, cosLat * sinD - sinLat * cosD * cosH) / RAD
    return { altitude, azimuth: (azimuth + 360) % 360 }
  } }
}
