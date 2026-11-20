import { lateral, type Camera } from '../domain/camera'
import { addMinutes, minutesBetween } from '../domain/time'
import type { DayPoint, LocalTime } from '../domain/types'
import type { SkyLight } from '../theme/skyLight'
import { rgbOf } from './air'
import { AFTERGLOW, afterglowColour } from './afterglow'
import type { Covers } from './clouds'
import { moonCloud } from './moonShape'
import { moonlightStrength } from './moonlight'
import { ridgeLightRay, smoothstep } from './ridgeLighting'
import { hazeDirect, shadowReach, sunLight, type Aerosol } from './sceneLight'
import { SCENE_W } from './sceneBox'
import type { Skyline } from './skyline'
import { sunAt, sunOverRidge } from './sunPath'
import { twilight } from './twilight'
import type { Body, Light, MoonBody, RGB } from './types'

/** Moonlight: the night eye sees it cool and without colour (as the SVG's moon tone, #B9C4DE). */
export const MOON_RGB: RGB = [185 / 255, 196 / 255, 222 / 255]
/** Under this much haze-passed sunlight nothing is lit (as `useRidgeLighting`). */
const MIN_HAZE_DIRECT = 0.08
/** Below this the light gives no side and no shadow: the source is the sky. */
const MIN_DIRECT = 0.05
/** Moonlight fainter than this is not drawn (as `moonRidgeLight`). */
const MIN_MOON = 0.05

/**
 * The share of direct light the cloud between the eye and the source lets through (0–1). The layers are independent;
 * thick low cloud blocks nearly all of it, mid cloud most, thin high cloud dims it a little. As an expected value over a
 * broken sky: 50 % low cloud lets about half through. A mid layer that closes into a full deck (altostratus) is as thick as
 * low cloud: the share it blocks rises to 0.95 at full cover (C6: until then a full mid and high overcast still let a
 * shadow-casting sun through, hidden only by a NaN in the cover split, `layerCovers`).
 */
export function cloudTransmit({ low, mid, high }: Covers): number {
  return (1 - 0.95 * low) * (1 - (0.85 + 0.1 * mid ** 4) * mid) * (1 - 0.3 * high)
}

/** −1 … 1 → the screen side the light comes from; null straight ahead or behind. */
const sideOf = (across: number): Light['side'] => across > 0.02 ? 'right' : across < -0.02 ? 'left' : null

export interface LightInput {
  at: LocalTime
  day: DayPoint | undefined
  site: { lat: number; lon: number; timezone: string }
  camera: Camera
  skyline: Skyline
  sunSkyline: Skyline
  sun: Body & { clearance: number; t: number | null }
  moon: MoonBody
  aerosol: Aerosol
  covers: Covers
  /** The shown cover (0–100) and its thick part, for the moon's veil (`moonCloud`). */
  cloudCover: number
  thickCloud: number | null
  farFade: number
  palette: SkyLight
}

/**
 * Where the sun crosses a skyline at the start or end of a day: a search along the day (`sunOverRidge`, ~100 sun
 * positions) that depends on the day, the site and the skyline only, never on the shown minute. Kept per skyline object
 * (the world builder keeps one while the terrain is the same), so a scrub frame does not redo it (it cost 30–50 ms a
 * frame through the twilight, CPU ×4).
 */
const crossings = new WeakMap<Skyline, Map<string, ReturnType<typeof sunOverRidge>>>()
function crossingOf(edge: 0 | 1, day: DayPoint, site: LightInput['site'], skyline: Skyline) {
  let known = crossings.get(skyline)
  if (!known) crossings.set(skyline, (known = new Map()))
  const key = `${edge}|${day.sunrise}|${day.sunset}|${site.lat}|${site.lon}|${site.timezone}`
  let crossing = known.get(key)
  if (!crossing) known.set(key, (crossing = sunOverRidge(edge, day.sunrise, day.sunset, site, skyline)))
  return crossing
}

/**
 * The day with its visible sunrise and sunset judged on `skyline` (the drawn land): when the sun's top clears it and goes
 * behind it. Kept with the crossings, so a scrub reads it back.
 */
export function visibleDay(day: DayPoint, site: LightInput['site'], skyline: Skyline): DayPoint {
  const length = minutesBetween(day.sunrise, day.sunset)
  if (length <= 0) return day
  const rise = crossingOf(0, day, site, skyline), set = crossingOf(1, day, site, skyline)
  return { ...day, visibleSunrise: addMinutes(day.sunrise, rise.t * length), visibleSunset: addMinutes(day.sunrise, set.t * length) }
}

/** Where the twilight glow stands: where the sun really crosses the land today, drawn where that direction is in view. */
function glowOf(input: LightInput): Light['glow'] {
  const { day, at, site, skyline, sunSkyline } = input
  // Both crossings of the day are found on the first build that has the day (a cold world), not on the first scrub frame
  // into a twilight (a 30–40 ms frame, CPU ×4): later builds read them back.
  if (day) for (const edge of [0, 1] as const) crossingOf(edge, day, site, sunSkyline)
  const glow = twilight(day, at)
  if (!glow || !day) return null
  const edge = glow.side === 'east' ? 0 : 1
  const crossing = crossingOf(edge, day, site, sunSkyline)
  const point = sunSkyline === skyline ? crossing : { ...sunAt(crossing.t, day.sunrise, day.sunset, site, skyline), y: crossing.y }
  return { side: glow.side, opacity: glow.opacity, x: point.x * SCENE_W, y: point.y }
}

/**
 * The one light of the scene at the shown minute. The sun when it stands over the land in its own direction and enough
 * of it gets through the haze and the cloud; by night the moon, by its phase and height; otherwise the sky alone (overcast,
 * twilight, a moonless night): no side, no shadow. Every face, shadow and glint takes its side, colour and strength.
 */
export function lightOf(input: LightInput): Light {
  const { sun, moon, camera, aerosol, covers, palette } = input
  const ambient = rgbOf(palette.mid)
  const glow = glowOf(input)
  const afterglow = sun.altitude < AFTERGLOW.from && sun.altitude > AFTERGLOW.to
    ? { x: sun.x, altitude: sun.altitude, rgb: afterglowColour(sun.altitude, aerosol) as RGB } : null
  const noonWeight = sun.t === null ? 0 : 1 - smoothstep(0, 0.18, Math.abs(sun.t - 0.5))
  const base = { ambient, glow, afterglow, palette }

  const daylight = smoothstep(0, 2, sun.clearance)
  const haze = hazeDirect(sun.altitude, aerosol)
  if (daylight > 0 && haze >= MIN_HAZE_DIRECT) {
    const direct = daylight * haze * cloudTransmit(covers)
    const across = lateral(sun.azimuth, camera)
    const ray = ridgeLightRay(across, sun.altitude)
    const lit = direct >= MIN_DIRECT
    return {
      ...base,
      source: lit ? 'sun' : 'sky', azimuth: sun.azimuth, altitude: sun.altitude,
      side: lit ? sideOf(across) : null, ray: lit ? ray : null,
      colour: sunLight(sun.altitude, aerosol).rgb, direct,
      shadow: lit ? { dx: -Math.max(-1, Math.min(1, across)), length: shadowReach(ray), softness: 1 - smoothstep(0.2, 0.6, direct) }
        : { dx: 0, length: 0, softness: 1 },
      noonWeight, rimX: sun.x,
    }
  }

  const strength = moon.overLand
    ? moonlightStrength({ altitude: moon.altitude, azimuth: moon.azimuth, fraction: moon.illumination }, sun.altitude,
      moonCloud(input.cloudCover, input.thickCloud), input.farFade)
    : 0
  if (strength >= MIN_MOON) {
    const across = lateral(moon.azimuth, camera)
    const ray = ridgeLightRay(across, moon.altitude)
    return {
      ...base,
      source: 'moon', azimuth: moon.azimuth, altitude: moon.altitude, side: sideOf(across), ray,
      colour: MOON_RGB, direct: strength,
      // Moon shadows are faint: soft at best.
      shadow: { dx: -Math.max(-1, Math.min(1, across)), length: shadowReach(ray), softness: Math.max(0.6, 1 - strength) },
      noonWeight: 0, rimX: moon.x,
    }
  }

  return {
    ...base,
    source: 'sky', azimuth: sun.azimuth, altitude: sun.altitude, side: null, ray: null,
    colour: ambient, direct: 0, shadow: { dx: 0, length: 0, softness: 1 },
    noonWeight, rimX: glow ? glow.x : null,
  }
}
