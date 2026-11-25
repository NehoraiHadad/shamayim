import { fullMoonNear } from '../astro/fullMoon'
import { moonEquatorial, moonIllumination } from '../astro/moon'
import type { Candidate, Detector, EventSky } from './types'

const HOUR = 3_600_000
/** Up to this height (deg) it still looks low over the land. */
const LOW = 10
/** An observational cutoff, checked against the Nov–Dec 2026 supermoons and a regular October full moon. */
const SUPERMOON_DISTANCE_KM = 362_000
const NEARLY_FULL = 0.97

function supermoon(sky: EventSky, sunset: number): Candidate {
  return {
    what: 'סופרמון', perYear: 3, tell: 'from', stepMin: 2, leastMin: 12, sunBelow: 3,
    cloud: { thick: 0.6, all: 0.95 }, from: sunset - 2 * HOUR, to: sky.night.to,
    at: (ms) => {
      const moon = sky.moonAt(ms)
      if (moon.altitude < 0.5) return null
      const at = new Date(ms)
      if (moonEquatorial(at).distanceKm > SUPERMOON_DISTANCE_KM || moonIllumination(at).fraction < NEARLY_FULL) return null
      return moon
    },
  }
}

/** The full moon coming up over the land near sunset, on the evening nearest to it. */
export const fullMoonRise: Detector = (sky) => {
  const sunset = sky.night.from
  const full = fullMoonNear(sunset)
  const hoursFromFull = Math.abs(full - sunset) / HOUR
  if (hoursFromFull <= 36 && moonEquatorial(new Date(full)).distanceKm <= SUPERMOON_DISTANCE_KM) return [supermoon(sky, sunset)]
  if (hoursFromFull > 12) return []
  return [{
    what: 'ירח מלא זורח', perYear: 12, tell: 'at', stepMin: 2, sunBelow: 3, cloud: { thick: 0.6, all: 0.95 },
    from: sunset - 2 * HOUR, to: sunset + 5 * HOUR,
    at: (ms) => {
      const moon = sky.moonAt(ms)
      // The sooner the better: the moment it comes clear of the land.
      return moon.altitude > LOW || moon.azimuth > 180 ? null : { ...moon, score: -ms }
    },
  }]
}
