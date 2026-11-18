import { useMemo } from 'react'
import { moonIllumination, moonPosition } from '../../astro/moon'
import { sunPosition as sunSky } from '../../astro/sun'
import { utcOf } from '../../astro/utc'
import type { Place } from '../../config/place'
import type { LocalTime } from '../../domain/types'
import { skyPoint } from './moonShape'
import { moonlightStrength, moonRidgeLight } from './moonlight'
import type { Skyline } from './skyline'
import { SCENE_W } from './sunPath'
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
    return moonRidgeLight(moon, strength, skyPoint(altitude, azimuth, skyline).x * SCENE_W)
  }, [on, minute, place.timezone, place.lat, place.lon, skyline, cloudCover, farFade])
}
