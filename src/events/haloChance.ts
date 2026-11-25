import { moonIllumination } from '../astro/moon'
import type { HourPoint } from '../domain/types'
import { satIce, satWater } from '../world/contrails'
import { HALO_DEG, onCircle } from '../world/optics'
import { clearVisibility } from './clearVisibility'
import type { Candidate, Detector, EventSky } from './types'

/** Look for cold, ice-saturated model air aloft and widespread high cloud. Crystal shape and cloud transparency remain unknown. */
function iceCloud(hour: HourPoint | null): boolean {
  if (!hour || (clearVisibility(hour) ?? 0) < 25 || (hour.cloudHigh ?? 0) < 65 || hour.cloudLow == null || hour.cloudMid == null) return false
  const cruise = hour.cruise
  if (!cruise || cruise.temperature > -38) return false
  const kelvin = cruise.temperature + 273.15
  return cruise.humidity / 100 * satWater(kelvin) >= satIce(kelvin)
}

function candidate(sky: EventSky, solar: boolean): Candidate {
  return {
    what: solar ? 'תיתכן הילה סביב השמש' : 'תיתכן הילה סביב הירח', perYear: solar ? 12 : 4,
    ...(solar ? { kind: 'solar-halo' } : { sunBelow: -12 }),
    tell: 'span', weatherDependent: true, from: solar ? sky.from : sky.night.from, to: solar ? sky.night.from : sky.night.to,
    stepMin: 15, leastMin: 60, cloud: { thick: 0.15 },
    at: (ms) => {
      if (!iceCloud(sky.hourAt(ms))) return null
      const body = solar ? sky.sunAt(ms) : sky.moonAt(ms)
      if (body.altitude < (solar ? 12 : 20) || !sky.clear(body)) return null
      if (!solar && moonIllumination(new Date(ms)).fraction < 0.9) return null
      // Point to the halo's upper arc, which is separated from the light source by 22 degrees.
      const arc = onCircle(body, HALO_DEG, 0)
      return { ...arc, azimuth: (arc.azimuth + 360) % 360 }
    },
  }
}

/** A possible 22° solar or lunar halo, based on the forecast rather than the scene's synthetic cloud field. */
export const haloChance: Detector = (sky) => [candidate(sky, true), candidate(sky, false)]
