import { cometPosition } from '../astro/comet'
import { moonIllumination } from '../astro/moon'
import { ltr } from '../text/isolate'
import { extinction, limitingMagnitude } from '../world/nightSky'
import { apparentAltitude } from '../world/skyProjection'
import { COMET_OBSERVATION_MAX_AGE, evidenceUntil, type CometTrack } from './cometFeed'
import type { Detector, Direction } from './types'

const RAD = Math.PI / 180
const SUN_BELOW = -8
const LOWEST = 8
const SOLAR_ELONGATION = 20

function separation(a: Direction, b: Direction): number {
  const x = a.altitude * RAD, y = b.altitude * RAD
  const cos = Math.sin(x) * Math.sin(y) + Math.cos(x) * Math.cos(y) * Math.cos((a.azimuth - b.azimuth) * RAD)
  return Math.acos(Math.max(-1, Math.min(1, cos))) / RAD
}

/** A recent bright comet, given a clear and sufficiently dark local view of its coma. */
export const cometEvents = (tracks: readonly CometTrack[]): Detector => (sky) => tracks.flatMap((track) => {
  const from = Math.max(sky.night.from, track.observedAt, track.samples[0][0])
  const to = Math.min(sky.night.to, evidenceUntil(track), track.samples.at(-1)![0])
  if (from >= to || to <= sky.from || from >= sky.to) return []
  return [{
    what: `שביט ${ltr(track.designation)}`, kind: 'comet', perYear: 0.15, tell: 'at',
    from, to, stepMin: 5, leastMin: 15, sunBelow: SUN_BELOW, cloud: { thick: 0.35, all: 0.5 },
    at: (ms) => {
      const sun = sky.sunAt(ms)
      if (sun.altitude >= SUN_BELOW) return null
      const position = cometPosition(track, ms, sky.place.lat, sky.place.lon)
      if (!position || position.altitude < LOWEST || position.elongation < SOLAR_ELONGATION) return null
      const altitude = apparentAltitude(position.altitude)
      const moon = sky.moonAt(ms), illumination = moonIllumination(new Date(ms)).fraction
      if (illumination >= 0.35 && moon.altitude > 0 && separation({ azimuth: position.azimuth, altitude }, moon) < 10 + 20 * illumination) return null
      const limit = limitingMagnitude(sun.altitude, { altitude: moon.altitude, illumination }, sky.glow)
      const visibility = sky.hourAt(ms)?.visibility
      if (visibility != null && visibility < 8000) return null
      // A diffuse coma needs more contrast than a star of the same total magnitude, particularly if there's no
      // confirmed unaided sighting. Allow more room as the estimate ages, since the comet can fade between observations.
      const nakedEye = track.nakedEyeAt !== undefined && ms - track.nakedEyeAt <= COMET_OBSERVATION_MAX_AGE
      const allowance = (nakedEye ? 0.65 : 1.5) + 0.5 * (ms - track.observedAt) / COMET_OBSERVATION_MAX_AGE
      const score = limit - track.magnitude - extinction(altitude, visibility == null ? 20 : visibility / 1000) - allowance
      return score >= 0 ? { azimuth: position.azimuth, altitude, score } : null
    },
  }]
})
