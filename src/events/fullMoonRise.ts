import { fullMoonNear } from '../astro/fullMoon'
import type { Detector } from './types'

const HOUR = 3_600_000
/** Up to this height (deg) it still looks low over the land. */
const LOW = 10

/** The full moon coming up over the land near sunset, on the evening nearest to it. */
export const fullMoonRise: Detector = (sky) => {
  const sunset = sky.night.from
  if (Math.abs(fullMoonNear(sunset) - sunset) > 12 * HOUR) return []
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
