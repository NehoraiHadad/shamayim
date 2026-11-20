import { moonIllumination, moonPosition } from '../astro/moon'
import { sunPosition } from '../astro/sun'
import { utcOf } from '../astro/utc'
import { fractionOf } from '../domain/camera'
import type { LocalTime } from '../domain/types'
import type { WaterLight } from '../data/water/glint'
import type { SceneTerrain } from '../data/terrain/terrain'
import type { Skyline } from './skyline'

/** Cloud cover (%) from which the sun's path on the water starts to dim, and at which it is gone. */
const CLOUD_FROM = 40
const CLOUD_GONE = 90

/**
 * The light on the water at `at`: the sun by day; by night the moon, faint and by its phase. `lit` says whether it stands
 * above the drawn land in its own direction (a sun behind a ridge leaves the water under it in shade).
 */
export function waterLight(at: LocalTime, site: { lat: number; lon: number; timezone: string }, terrain: SceneTerrain,
  skyline: Skyline, cloudCover: number): { light: WaterLight | null; lit: boolean; moon: boolean } {
  const instant = utcOf(at, site.timezone)
  const sun = sunPosition(instant, site.lat, site.lon)
  const clear = Math.max(0, Math.min(1, (CLOUD_GONE - cloudCover) / (CLOUD_GONE - CLOUD_FROM)))
  let light: WaterLight | null = null
  let byMoon = false
  if (sun.altitude > 0) light = { azimuth: sun.azimuth, altitude: sun.altitude, strength: clear }
  else if (sun.altitude < -6) {
    const moon = moonPosition(instant, site.lat, site.lon)
    if (moon.altitude > 0) {
      light = { azimuth: moon.azimuth, altitude: moon.altitude, strength: 0.4 * moonIllumination(instant).fraction * clear }
      byMoon = true
    }
  }
  if (!light || !terrain.angleY) return { light, lit: false, moon: byMoon }
  const x = fractionOf(light.azimuth, terrain.camera)
  return { light, lit: x <= 1 && terrain.angleY(light.altitude) <= skyline(x), moon: byMoon }
}
