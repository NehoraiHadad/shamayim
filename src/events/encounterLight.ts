import { moonIllumination } from '../astro/moon'
import { extinction, limitingMagnitude } from '../world/nightSky'
import type { Direction, EventSky } from './types'

/** Visibility for a named object that needs to stand out in twilight, moonlight and haze. */
export function encounterLimit(sky: EventSky, ms: number, { altitude }: Direction, illumination = moonIllumination(new Date(ms)).fraction): number {
  const visibility = sky.hourAt(ms)?.visibility
  const visibilityKm = visibility == null ? 25 : visibility / 1000
  const moon = { altitude: sky.moonAt(ms).altitude, illumination }
  return limitingMagnitude(sky.sunAt(ms).altitude, moon, sky.glow) - extinction(altitude, visibilityKm)
}
