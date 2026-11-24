import { moonIllumination, moonPosition } from '../astro/moon'
import { sunPosition as sunSky } from '../astro/sun'
import { utcOf } from '../astro/utc'
import { daylightFraction, minutesBetween } from '../domain/time'
import type { DayPoint, LocalTime } from '../domain/types'
import { moonScenePoint } from './moonPath'
import { brightLimbAngle, type ScenePoint } from './moonShape'
import { SCENE_CAMERA } from '../domain/camera'
import { SCENE_W } from './sceneBox'
import type { Skyline } from './skyline'
import { apparentAltitude, apparentSunAltitude, horizonLine, projectSky } from './skyProjection'
import { sunAt } from './sunPath'
import type { Body, MoonBody } from './types'
import { discShare } from './livingLight'

interface Site { lat: number; lon: number; timezone: string }

/**
 * The sun's drawn point: on its arc between today's sunrise and sunset (`sunAt`, which runs on before and after them,
 * behind the land), exactly where the SVG scene draws the disc; on a day with no sunrise, straight from its true
 * altitude and azimuth.
 */
function sunPoint(at: LocalTime, day: DayPoint | undefined, site: Site, skyline: Skyline, azimuth: number, altitude: number): ScenePoint {
  if (day && minutesBetween(day.sunrise, day.sunset) > 0) return sunAt(daylightFraction(at, day.sunrise, day.sunset), day.sunrise, day.sunset, site, skyline)
  return projectSky(apparentSunAltitude(altitude), azimuth, horizonLine(azimuth, azimuth, skyline))
}

/**
 * The sun: true azimuth and altitude, its drawn point on the view's land (`skyline`), and whether it stands over the land
 * in its own direction, judged against `sunSkyline`: the top of the land and structures the scene draws in front of it
 * (`drawnSkyline.ts`, the view's own skyline when absent), so the light and the picture agree.
 */
export function sunBody(at: LocalTime, day: DayPoint | undefined, site: Site, skyline: Skyline, sunSkyline: Skyline = skyline): Body & { clearance: number; t: number | null } {
  const { altitude, azimuth } = sunSky(utcOf(at, site.timezone), site.lat, site.lon)
  const point = sunPoint(at, day, site, skyline, azimuth, altitude)
  const judged = sunSkyline === skyline ? point : sunPoint(at, day, site, sunSkyline, azimuth, altitude)
  const clearance = sunSkyline(judged.x) - judged.y
  const t = day && minutesBetween(day.sunrise, day.sunset) > 0 ? daylightFraction(at, day.sunrise, day.sunset) : null
  return {
    azimuth, altitude, x: point.x * SCENE_W, y: point.y,
    up: apparentSunAltitude(altitude) > 0,
    overLand: clearance > 0,
    clearance, t, visible: discShare(clearance),
  }
}

/**
 * The moon: true position, its drawn point on its pass, phase, lit fraction and the lit limb's screen angle; over the land
 * judged against `judge` (the drawn land's top, `drawnSkyline.ts`; the view's own skyline when absent).
 */
export function moonBody(at: LocalTime, site: Site, skyline: Skyline, sun: { altitude: number; azimuth: number }, judge: Skyline = skyline): MoonBody {
  const instant = utcOf(at, site.timezone)
  const { altitude, azimuth } = moonPosition(instant, site.lat, site.lon)
  const { fraction, phase } = moonIllumination(instant)
  const camera = skyline.camera ?? SCENE_CAMERA
  const point = moonScenePoint(instant, site, skyline)
  const clearance = judge(point.x) - point.y
  return {
    azimuth, altitude, x: point.x * SCENE_W, y: point.y,
    up: apparentAltitude(altitude) > 0,
    overLand: clearance > 0, clearance, visible: discShare(clearance),
    phase, illumination: fraction,
    tilt: brightLimbAngle({ altitude, azimuth }, sun, camera.handed),
  }
}
