import { useMemo } from 'react'
import { moonIllumination, moonPosition } from '../../astro/moon'
import { sunPosition as sunSky } from '../../astro/sun'
import { utcOf } from '../../astro/utc'
import type { Place } from '../../config/place'
import type { LocalTime } from '../../domain/types'
import { moonScenePoint } from '../../world/moonPath'
import { moonlightStrength, moonRidgeLight } from '../../world/moonlight'
import type { Skyline } from '../../world/skyline'
import { SCENE_W } from '../../world/sunPath'
import type { RidgeLightInput, RidgeLighting } from './useRidgeLighting'

/** The moon's light on the ridges at the shown minute (lit scene only), or null by day, under cloud, or a thin moon. */
export function useMoonlight(input: RidgeLightInput | undefined, at: LocalTime, place: Place, skyline: Skyline,
  cloudCover: number, farFade: number): RidgeLighting | null {
  const minute = at.slice(0, 16)
  const on = Boolean(input)
  return useMemo(() => {
    if (!on) return null
    const instant = utcOf(minute, place.timezone)
    const { altitude, azimuth } = moonPosition(instant, place.lat, place.lon)
    const moon = { altitude, azimuth, fraction: moonIllumination(instant).fraction }
    const strength = moonlightStrength(moon, sunSky(instant, place.lat, place.lon).altitude, cloudCover, farFade)
    // Lit from where the moon is drawn (its arc), not from the raw azimuth, so light and disc agree.
    return moonRidgeLight(moon, strength, moonScenePoint(instant, place, skyline).x * SCENE_W, skyline.camera)
  }, [on, minute, place.timezone, place.lat, place.lon, skyline, cloudCover, farFade])
}
