import { galacticToEquatorial } from '../astro/galaxy'
import { moonIllumination } from '../astro/moon'
import { horizontalPosition } from '../astro/sun'
import { unionOf } from '../world/clouds'
import { milkyWayStrength } from '../world/nightSky'
import { clearVisibility } from './clearVisibility'
import type { Detector } from './types'

/** The bright Sagittarius Star Cloud, close to the centre of the galaxy. */
const SAGITTARIUS = galacticToEquatorial(4, 0)
const MAX_GLOW = 0.52
const MIN_STRENGTH = 0.8
const ASTRONOMICAL_NIGHT = -18
const EARLY_NIGHT = 2.5 * 3_600_000

/** A long moonless window early in the night, with the bright inner Milky Way well above the horizon. */
export const milkyWayWindow: Detector = (sky) => {
  if (sky.glow > MAX_GLOW) return []
  return [{
    what: 'שביל החלב הבהיר', perYear: 24, tell: 'span', from: sky.night.from, to: sky.night.to, stepMin: 15, leastMin: 90,
    cloud: { all: 0.15 },
    at: (ms) => {
      const sun = sky.sunAt(ms)
      if (sun.altitude >= ASTRONOMICAL_NIGHT || sky.sunAt(ms - EARLY_NIGHT).altitude < ASTRONOMICAL_NIGHT) return null
      const moon = sky.moonAt(ms)
      if (moon.altitude > -2) return null
      const visibilityKm = clearVisibility(sky.hourAt(ms)), covers = sky.coversAt(ms)
      if (visibilityKm == null || !covers) return null
      const instant = new Date(ms)
      const where = horizontalPosition(SAGITTARIUS, instant, sky.place.lat, sky.place.lon)
      if (where.altitude < 24) return null
      const strength = milkyWayStrength({ sun, moon: { altitude: moon.altitude, illumination: moonIllumination(instant).fraction },
        starsThrough: 1 - unionOf(covers), visibilityKm, glow: sky.glow })
      return strength >= MIN_STRENGTH ? where : null
    },
  }]
}
