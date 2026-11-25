import { Horizon, MakeTime, Observer } from 'astronomy-engine'
import { ALCYONE, MOON_STARS, starEquatorial } from '../astro/brightStars'
import { moonIllumination } from '../astro/moon'
import { separation } from '../world/optics'
import { apparentAltitude } from '../world/skyProjection'
import { encounterLimit } from './encounterLight'
import type { Detector } from './types'

const HOUR = 3_600_000
const STARS = [ALCYONE, ...MOON_STARS]

/** Bright ecliptic stars and the Pleiades beside the Moon, where both can actually be seen. */
export const moonByStar: Detector = (sky) => {
  const observer = new Observer(sky.place.lat, sky.place.lon, sky.place.elevation ?? 0)
  const from = Math.max(sky.from, sky.night.from)
  if (from >= sky.to) return []
  const middle = (from + sky.to) / 2
  const middleMoon = sky.moonAt(middle)
  return STARS.flatMap((star) => {
    const cluster = star === ALCYONE
    const near = cluster ? 3.5 : 2
    const look = (ms: number) => {
      const time = MakeTime(new Date(ms)), { ra, dec } = starEquatorial(star, time)
      const { azimuth, altitude } = Horizon(time, observer, ra, dec)
      return { azimuth, altitude: apparentAltitude(altitude) }
    }
    // Allow lunar motion and parallax from the halfway point to either end of the night.
    if (separation(look(middle), middleMoon) > near + 0.5 * (sky.to - from) / HOUR + 1) return []
    return [{
      what: cluster ? 'צביר הכימה ליד הירח' : `${star.name} ליד הירח`, perYear: cluster ? 2 : 6,
      tell: 'from', from: sky.night.from, to: sky.to, sunBelow: cluster ? -12 : -7, leastMin: 20, cloud: { thick: 0.4, all: 0.65 },
      at: (ms: number) => {
        const moon = sky.moonAt(ms), where = look(ms), apart = separation(moon, where)
        if (apart > near || apart < (cluster ? 1.2 : 0.45) || where.altitude < 12 || !sky.clear(moon)) return null
        const illumination = moonIllumination(new Date(ms)).fraction
        if (cluster && illumination > 0.8) return null
        // Judge the cluster by its next-brightest members, since its combined magnitude overstates eye visibility.
        const magnitude = cluster ? 3.7 : star.magnitude
        const glare = 2.4 * illumination / Math.max(1, apart)
        return magnitude + glare + 0.8 < encounterLimit(sky, ms, where, illumination) ? where : null
      },
    }]
  })
}
