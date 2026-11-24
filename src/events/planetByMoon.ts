import { moonIllumination } from '../astro/moon'
import { planetPosition, type PlanetName } from '../astro/planets'
import { horizontalPosition } from '../astro/sun'
import { skyLimit } from '../world/nightSky'
import { separation } from '../world/optics'
import { apparentAltitude } from '../world/skyProjection'
import type { Candidate, Detector, EventSky } from './types'

/** Side by side to the eye: about six moons apart (deg). */
const NEAR = 3
/** The moon moves about half a degree an hour: further apart than this now, they do not meet before the next sunrise. */
const REACH = 20
/** Over the sky's faintest magnitude by this much, a planet is plain beside the moon. */
const PLAIN = 1.5

const NAMES = { venus: 'נוגה', mars: 'מאדים', jupiter: 'צדק', saturn: 'שבתאי' } as const satisfies Partial<Record<PlanetName, string>>
type Told = keyof typeof NAMES

function candidate(name: Told, sky: EventSky): Candidate | null {
  const look = (ms: number) => {
    const at = new Date(ms), planet = planetPosition(name, at)
    const { azimuth, altitude } = horizontalPosition(planet, at, sky.place.lat, sky.place.lon)
    const where = { azimuth, altitude: apparentAltitude(altitude) }, moon = sky.moonAt(ms)
    return { where, moon, magnitude: planet.magnitude, apart: separation(moon, where) }
  }
  if (look((sky.from + sky.to) / 2).apart > REACH) return null
  return {
    what: `${NAMES[name]} ליד הירח`, perYear: 3, tell: 'from', sunBelow: -3, cloud: { thick: 0.5, all: 0.8 },
    from: sky.from, to: sky.to,
    at: (ms) => {
      const { where, moon, magnitude, apart } = look(ms)
      if (apart > NEAR || !sky.clear(moon)) return null
      const limit = skyLimit(sky.sunAt(ms).altitude, { altitude: moon.altitude, illumination: moonIllumination(new Date(ms)).fraction })
      return magnitude < limit - PLAIN ? where : null
    },
  }
}

/** A bright planet beside the moon. */
export const planetByMoon: Detector = (sky) =>
  (Object.keys(NAMES) as Told[]).map((name) => candidate(name, sky)).filter((c) => c !== null)
