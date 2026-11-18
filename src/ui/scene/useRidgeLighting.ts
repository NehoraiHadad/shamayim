import { useMemo } from 'react'
import type { AirState } from '../../atmo/airTypes'
import { sunPosition as sunSky } from '../../astro/sun'
import { utcOf } from '../../astro/utc'
import type { Place } from '../../config/place'
import type { DayPoint, LocalTime } from '../../domain/types'
import { ridgeLightRay, smoothstep } from './ridgeLighting'
import { hazeDirect } from './sceneLight'
import { ridgeLightTone, type RidgePalette, type RidgeTone } from './ridgeLightTone'
import type { Skyline } from './skyline'
import { SCENE_W, sunPosition } from './sunPath'

/** The lit scene: ridge lighting needs the shown sky palette and whether the shown hour is wet. */
export interface RidgeLightInput { palette: RidgePalette; wet: boolean }

export interface RidgeLighting {
  ray: [number, number] | null
  rimX: number | null
  noonWeight: number
  /** True sun altitude in degrees, for the light's colour, the disc's shape and shadow lengths. */
  altitude: number
  near: RidgeTone | null
  far: RidgeTone | null
}

interface Args {
  input: RidgeLightInput | undefined
  at: LocalTime
  day: DayPoint | undefined
  place: Place
  lat: number
  skyline: Skyline
  air: AirState
  cloudCover: number
  /** Twilight glow opacity and its x (scene fraction), or null when there is none. */
  glow: { opacity: number; x: number } | null
}

/**
 * Sun lighting for both ridge layers at the shown minute, or null when the flag is off or nothing is lit
 * (night, overcast, heavy haze). Recomputed per shown minute, never per frame.
 */
export function useRidgeLighting({ input, at, day, place, lat, skyline, air, cloudCover, glow }: Args): RidgeLighting | null {
  const { mid, horizon, accent, ridgeFar, ridgeNear } = input?.palette ?? {}
  const wet = input?.wet ?? false
  const { farFade, nearFade, visibilityKm } = air.haze
  const dust = air.sunCoin > 0
  const sunrise = day?.sunrise
  const sunset = day?.sunset
  const minute = at.slice(0, 16)
  const glowOpacity = glow?.opacity ?? 0
  const glowX = glow?.x ?? -1
  return useMemo(() => {
    if (!mid || !horizon || !accent || !ridgeFar || !ridgeNear || !sunrise || !sunset ||
      cloudCover >= 90) return null
    const point = sunPosition(minute, sunrise, sunset, lat, skyline)
    const daylight = point ? smoothstep(0, 2, skyline(point.x) - point.y) : 0
    if (!daylight && !glowOpacity) return null
    const sky = sunSky(utcOf(minute, place.timezone), place.lat, place.lon)
    // Only the light that gets through the haze lights the land; too little left and nothing is lit.
    const direct = hazeDirect(sky.altitude, { visibilityKm, dust })
    if (direct < .08 && !glowOpacity) return null
    const noonWeight = point ? 1 - smoothstep(0, .18, Math.abs(point.t - .5)) : 0
    // The drawn arc is linear in x: t = 0 at the rising point (east, +1), t = 1 at the setting point (west, −1).
    const ray = point && daylight ? ridgeLightRay(1 - 2 * point.t, sky.altitude) : null
    const rimX = point && daylight ? point.x * SCENE_W : glowX < 0 ? null : glowX * SCENE_W
    const tone = { ...sky, day: daylight * direct, noonWeight, glow: glowOpacity, cover: cloudCover, wet, farFade, nearFade,
      palette: { mid, horizon, accent, ridgeFar, ridgeNear } }
    return { ray, rimX, noonWeight, altitude: sky.altitude, near: ridgeLightTone({ ...tone, layer: 'near' }), far: ridgeLightTone({ ...tone, layer: 'far' }) }
  }, [minute, sunrise, sunset, lat, skyline, place.timezone, place.lat, place.lon,
    mid, horizon, accent, ridgeFar, ridgeNear, cloudCover, wet, farFade, nearFade, glowOpacity, glowX, visibilityKm, dust])
}
