import { useMemo } from 'react'
import type { AirState } from '../../atmo/airTypes'
import { sunPosition as sunSky } from '../../astro/sun'
import { utcOf } from '../../astro/utc'
import type { Place } from '../../config/place'
import type { LocalTime } from '../../domain/types'
import { afterglowAttrs } from './afterglow'
import { discLook, worldLight } from './sceneLight'
import type { RidgeLighting } from './useRidgeLighting'
import { SCENE_W, type SunPoint } from './sunPath'

type Point = readonly [number, number]

interface Args {
  /** The lit scene is on (not `?scene=flat`). */
  on: boolean
  at: LocalTime
  place: Place
  air: AirState
  lighting: RidgeLighting | null
  near: readonly Point[]
  width: number
  sun: SunPoint | null
  night: boolean
  cloudCover: number
  /** Where the twilight glow stands on the ridge (scene fraction), or null. */
  rimX: number | null
}

/**
 * The sun as the rest of the scene sees it at the shown minute: the disc's look, the light on the land and marks, the
 * sun-side x for the marks, and (as data attributes the air reads) the afterglow on clouds around sunset and sunrise.
 */
export function useSceneSun({ on, at, place, air, lighting, near, width, sun, night, cloudCover, rimX }: Args) {
  const minute = at.slice(0, 16)
  const { visibilityKm } = air.haze
  const dust = air.sunCoin > 0
  const altitude = useMemo(() => on ? sunSky(utcOf(minute, place.timezone), place.lat, place.lon).altitude : null,
    [on, minute, place.timezone, place.lat, place.lon])
  const look = useMemo(() => altitude === null ? undefined : discLook(altitude, { visibilityKm, dust }),
    [altitude, visibilityKm, dust])
  const world = useMemo(() => worldLight(lighting, near, width, SCENE_W, { visibilityKm, dust }),
    [lighting, near, width, visibilityKm, dust])
  const sunX = sun && !night && cloudCover < 80 && (on ? Boolean(lighting?.ray) : air.haze.farFade <= .5)
    ? sun.x * width : null
  const afterglow = useMemo(() => afterglowAttrs(altitude, rimX, { visibilityKm, dust }),
    [altitude, rimX, visibilityKm, dust])
  return { look, world, sunX, afterglow }
}
