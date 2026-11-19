import { useMemo } from 'react'
import type { AirState } from '../../atmo/airTypes'
import { sunPosition as sunSky } from '../../astro/sun'
import { utcOf } from '../../astro/utc'
import type { Place } from '../../config/place'
import type { DayPoint, LocalTime } from '../../domain/types'
import { lateral } from '../../domain/camera'
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
  /** How strongly the sun lights the land (0..1): low at a sun just up or through haze; 0 for the moon. */
  day: number
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
  /**
   * The land the sun is judged against (whether it is over the ridge in its own direction): the place's south panorama,
   * which holds the sun's whole path. Absent: `skyline` (the view is that panorama).
   */
  sunSkyline?: Skyline
  air: AirState
  cloudCover: number
  /** Twilight glow opacity and its x (scene fraction), or null when there is none. */
  glow: { opacity: number; x: number } | null
}

/**
 * Sun lighting for both ridge layers at the shown minute, or null when the flag is off or nothing is lit
 * (night, overcast, heavy haze). Recomputed per shown minute, never per frame.
 */
export function useRidgeLighting({ input, at, day, place, lat, skyline, sunSkyline, air, cloudCover, glow }: Args): RidgeLighting | null {
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
    const point = sunPosition(minute, sunrise, sunset, place, skyline)
    const seen = sunSkyline ? sunPosition(minute, sunrise, sunset, place, sunSkyline) : point
    const daylight = seen ? smoothstep(0, 2, (sunSkyline ?? skyline)(seen.x) - seen.y) : 0
    if (!daylight && !glowOpacity) return null
    const sky = sunSky(utcOf(minute, place.timezone), place.lat, place.lon)
    // Only the light that gets through the haze lights the land; too little left and nothing is lit.
    const direct = hazeDirect(sky.altitude, { visibilityKm, dust })
    if (direct < .08 && !glowOpacity) return null
    const noonWeight = point ? 1 - smoothstep(0, .18, Math.abs(point.t - .5)) : 0
    // Light from the sun's side as the camera sees it (+1 from the right … −1 from the left), as the disc is drawn.
    const ray = point && daylight ? ridgeLightRay(lateral(sky.azimuth, skyline.camera), sky.altitude) : null
    const rimX = point && daylight ? point.x * SCENE_W : glowX < 0 ? null : glowX * SCENE_W
    const tone = { ...sky, camera: skyline.camera, day: daylight * direct, noonWeight, glow: glowOpacity, cover: cloudCover, wet, farFade, nearFade,
      palette: { mid, horizon, accent, ridgeFar, ridgeNear } }
    return { ray, rimX, noonWeight, altitude: sky.altitude, day: daylight * direct, near: ridgeLightTone({ ...tone, layer: 'near' }), far: ridgeLightTone({ ...tone, layer: 'far' }) }
  }, [minute, sunrise, sunset, lat, skyline, place.timezone, place.lat, place.lon,
    sunSkyline, mid, horizon, accent, ridgeFar, ridgeNear, cloudCover, wet, farFade, nearFade, glowOpacity, glowX, visibilityKm, dust])
}
