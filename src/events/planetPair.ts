import { Illumination } from 'astronomy-engine'
import { BRIGHT_PLANETS } from '../astro/brightPlanets'
import { planetPosition } from '../astro/planets'
import { horizontalPosition } from '../astro/sun'
import { separation } from '../world/optics'
import { apparentAltitude } from '../world/skyProjection'
import { encounterLimit } from './encounterLight'
import type { Detector } from './types'

const DAY = 86_400_000
const DEG = 180 / Math.PI
const NEAR = 1.7

/** Very close pairs of the five naked-eye planets, on their closest night. */
export const planetPair: Detector = (sky) => {
  const from = Math.max(sky.night.from, sky.from)
  if (from >= sky.to) return []
  const mid = (sky.night.from + sky.night.to) / 2
  const positionsByNight = [-DAY, 0, DAY].map((offset) => BRIGHT_PLANETS.map(({ id }) => planetPosition(id, new Date(mid + offset))))
  return BRIGHT_PLANETS.flatMap((first, i) => BRIGHT_PLANETS.slice(i + 1).flatMap((second, j) => {
    const k = i + 1 + j
    const [before, current, after] = positionsByNight.map((positions) => {
      const a = positions[i], b = positions[k]
      return separation({ azimuth: a.rightAscension * DEG, altitude: a.declination * DEG },
        { azimuth: b.rightAscension * DEG, altitude: b.declination * DEG })
    })
    if (current > NEAR + 0.8 || current > before || current >= after) return []
    const perYear = first.id === 'jupiter' && second.id === 'saturn' ? 0.05 : current < 0.3 ? 0.5 : 2

    return [{
      what: `${first.name} ו${second.name} קרובים בשמיים`, perYear,
      from: sky.night.from, to: sky.to, tell: 'from', sunBelow: -5, stepMin: 5, leastMin: 15, cloud: { thick: 0.5, all: 0.75 },
      at: (ms: number) => {
        const time = new Date(ms)
        const [a, b] = [first, second].map(({ id, body }) => {
          const planet = planetPosition(id, time)
          const { azimuth, altitude } = horizontalPosition(planet, time, sky.place.lat, sky.place.lon)
          return { azimuth, altitude: apparentAltitude(altitude), body, elongation: planet.elongation }
        })
        if (a.elongation < 15 || b.elongation < 15 || separation(a, b) > NEAR) return null
        let brighter = a, brightest = Infinity
        for (const planet of [a, b]) {
          if (planet.altitude < 7 || !sky.clear(planet)) return null
          // The ring opening can make Saturn about half a magnitude brighter.
          const { mag } = Illumination(planet.body, time)
          if (mag > 1.8 || mag + 1.2 >= encounterLimit(sky, ms, planet)) return null
          if (mag < brightest) { brighter = planet; brightest = mag }
        }
        return brighter
      },
    }]
  }))
}
