import { moonIllumination } from '../astro/moon'
import { peakNear, SHOWERS } from '../astro/showers'
import { horizontalPosition } from '../astro/sun'
import { limitingMagnitude } from '../world/nightSky'
import type { Detector } from './types'

const RAD = Math.PI / 180
const HALF_DAY = 43_200_000
/** Fewer an hour than this is not worth going out for. */
const WORTH = 12

const NAMES: Record<string, string> = {
  Quadrantids: 'קוודרנטידים', Lyrids: 'ליירידים', 'eta Aquariids': 'אטא אקווארידים', 'Southern delta Aquariids': 'דלתא אקווארידים',
  Perseids: 'פרסאידים', Draconids: 'דרקונידים', Orionids: 'אוריונידים', Leonids: 'ליאונידים', Geminids: 'גמינידים', Ursids: 'אורסידים',
}

/** A meteor shower on the night nearest to its peak, when the place's sky shows enough of it. */
export const meteorShower: Detector = (sky) => {
  const middle = (sky.night.from + sky.night.to) / 2
  return SHOWERS.map((shower) => ({ shower, peak: peakNear(shower, middle) })).filter(({ peak }) => Math.abs(peak - middle) <= HALF_DAY)
    .map(({ shower, peak }) => ({
      what: `מטר מטאורים: ${NAMES[shower.name] ?? shower.name}`, perYear: 1, tell: 'at' as const, sunBelow: -12, cloud: { all: 0.5 },
      from: sky.night.from, to: sky.night.to, stepMin: 30,
      at: (ms: number) => {
        const at = new Date(ms)
        const radiant = horizontalPosition({ rightAscension: shower.ra * RAD, declination: shower.dec * RAD, distanceKm: Infinity }, at,
          sky.place.lat, sky.place.lon)
        if (radiant.altitude <= 0) return null
        const limit = limitingMagnitude(sky.sunAt(ms).altitude, { altitude: sky.moonAt(ms).altitude,
          illumination: moonIllumination(at).fraction }, sky.glow)
        const active = Math.exp(-0.5 * ((ms - peak) / (2 * HALF_DAY * shower.sigma)) ** 2)
        const score = shower.zhr * active * Math.sin(radiant.altitude * RAD) * 2.2 ** (limit - 6.5)
        return score >= WORTH ? { azimuth: radiant.azimuth, altitude: radiant.altitude, score } : null
      },
    }))
}
