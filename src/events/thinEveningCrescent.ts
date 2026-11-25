import { moonIllumination } from '../astro/moon'
import { separation } from '../world/optics'
import { clearVisibility } from './clearVisibility'
import type { Detector } from './types'

const THIN = 0.07
const MIN_ALTITUDE = 8
const MIN_ELONGATION = 17

/** A young waxing Moon with enough separation and altitude to pick out in evening twilight. */
export const thinEveningCrescent: Detector = (sky) => {
  const sunset = sky.night.from, middle = (sunset + sky.night.to) / 2
  const phase = moonIllumination(new Date(sunset))
  if (!phase.waxing || phase.fraction > THIN || sky.from >= middle) return []

  return [{
    what: 'סהר ירח דק', perYear: 6, tell: 'span', from: sunset, to: middle, stepMin: 5, leastMin: 20,
    cloud: { thick: 0.2, all: 0.35 },
    at: (ms) => {
      const sun = sky.sunAt(ms), moon = sky.moonAt(ms)
      // Leave margin for twilight glare, extinction near the horizon and the approximate ephemeris.
      if (sun.altitude > -5 || sun.altitude < -12 || moon.altitude < MIN_ALTITUDE || separation(sun, moon) < MIN_ELONGATION) return null
      if ((clearVisibility(sky.hourAt(ms)) ?? 0) < 20 || moonIllumination(new Date(ms)).fraction > THIN) return null
      return moon
    },
  }]
}
