import type { CometTrack } from '../events/cometFeed'
import { horizontalPosition } from './sun'

const RAD = Math.PI / 180
const EARTH_RADIUS_KM = 6378.14

/** Interpolate only within the Horizons table, unwrapping right ascension across 0°. */
export function cometPosition(track: CometTrack, ms: number, lat: number, lon: number) {
  const last = track.samples.findIndex((sample) => sample[0] >= ms)
  if (last < 0 || ms < track.samples[0][0]) return null
  const a = track.samples[Math.max(0, last - 1)], b = track.samples[last]
  const t = last === 0 ? 0 : (ms - a[0]) / (b[0] - a[0])
  const raDelta = (b[1] - a[1] + 540) % 360 - 180
  const mix = (i: 2 | 3 | 4) => a[i] + t * (b[i] - a[i])
  const distanceKm = mix(3)
  const { altitude, azimuth } = horizontalPosition({ rightAscension: (a[1] + t * raDelta) * RAD,
    declination: mix(2) * RAD, distanceKm }, new Date(ms), lat, lon)
  const aboveObserver = distanceKm * Math.sin(altitude * RAD) - EARTH_RADIUS_KM
  const horizontal = distanceKm * Math.cos(altitude * RAD)
  return { azimuth, altitude: Math.atan2(aboveObserver, horizontal) / RAD, elongation: mix(4) }
}
