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
import { airDim, discShare, SHADING, viewDir } from './livingLight'
import { SCENE_W } from './sceneBox'
import type { Skyline } from './skyline'
import { sunAt, sunOverRidge } from './sunPath'
import { twilight } from './twilight'
import type { Body, Light, MoonBody, RGB } from './types'

/** Moonlight: the night eye sees it cool and without colour (as the SVG's moon tone, #B9C4DE). */
export const MOON_RGB: RGB = [185 / 255, 196 / 255, 222 / 255]
/** Round this much haze-passed sunlight the direct light fades out (as `useRidgeLighting`'s cut, now a ramp). */
const MIN_HAZE_DIRECT = 0.08
/**
 * Under this direct share the light is the sky's alone (a sun dimmed to a pale patch behind a deck, the last of a disc
 * behind the land): no ray, no side, no source. Every directional effect eases in from it (`livingLight.ts` `SHADING`),
 * so the label's change shows nowhere.
 */
const SKY_ONLY = SHADING[0]
/** The direct share over which the light's colour turns from the sky's to its source's (four times this). */
const MIN_DIRECT = 0.05

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
 * The one light of the scene at the shown minute (the living light, 2026-11-20): a continuous function of the world state.
 * The sun's direct share is the part of its true disc over the drawn land (`visible`, softened at the edge) times what the
 * air mass and the hour's aerosol let through (`airDim`: it dims and warms as it sinks) times what the cloud in front lets
 * through; by night the moon's the same way, fainter; with neither, the sky alone. Nothing switches: the source's label
 * changes only where its share is nil, the direction (`dir`) is the one giving the direct light, and the colour fades to
 * the sky's as the direct share goes. Every face, shadow and glint takes its direction, colour and strength.
 */
export function lightOf(input: LightInput): Light {
  const { sun, moon, camera, aerosol, covers, palette } = input
  const ambient = rgbOf(palette.mid)
  const glow = glowOf(input)
  const afterglow = sun.altitude < AFTERGLOW.from && sun.altitude > AFTERGLOW.to
    ? { x: sun.x, altitude: sun.altitude, rgb: afterglowColour(sun.altitude, aerosol) as RGB } : null
  const noonWeight = sun.t === null ? 0 : 1 - smoothstep(0, 0.18, Math.abs(sun.t - 0.5))
  const transmit = cloudTransmit(covers)
  const base = { ambient, glow, afterglow, palette, diffuse: 1 - transmit }

  // The sun: its disc over the drawn land, through the air (a haze too thick lets nothing through), through the cloud.
  const visible = sun.visible ?? discShare(sun.clearance)
  const haze = hazeDirect(sun.altitude, aerosol)
  const sunShare = visible * airDim(sun.altitude, aerosol) * smoothstep(MIN_HAZE_DIRECT * 0.5, MIN_HAZE_DIRECT * 1.5, haze) * transmit
  // The moon: by its phase, height and veil (`moonlightStrength`, nil while the sky is light), its disc over the land.
  const moonShare = moonlightStrength({ altitude: moon.altitude, azimuth: moon.azimuth, fraction: moon.illumination }, sun.altitude,
    moonCloud(input.cloudCover, input.thickCloud), input.farFade) * (moon.visible ?? (moon.overLand ? 1 : 0))
  const byMoon = moonShare > sunShare
  const body = byMoon ? moon : sun
  const direct = sunShare + moonShare
  const across = lateral(body.azimuth, camera)
  const ray = ridgeLightRay(across, body.altitude)
  // Its colour, faded to the sky's as its share goes (a sun sinking behind the land leaves the sky's light, not a switch).
  const own = byMoon ? MOON_RGB : sunLight(sun.altitude, aerosol).rgb
  const colour = mixRgb(ambient, own, smoothstep(SHADING[0], 4 * MIN_DIRECT, direct))
  const source: Light['source'] = direct < SKY_ONLY ? 'sky' : byMoon ? 'moon' : 'sun'
  return {
    ...base,
    source, azimuth: body.azimuth, altitude: body.altitude,
    side: direct >= MIN_DIRECT * 0.2 ? sideOf(across) : null, ray: source === 'sky' ? null : ray,
    colour, direct, shares: { sun: sunShare, moon: moonShare },
    dir: viewDir(body.azimuth, body.altitude, camera),
    // The cast shadow's side and reach follow the source; its strength (every consumer multiplies by `direct`) and its
    // softness follow the share. Moon shadows are faint: soft at best.
    shadow: { dx: -Math.max(-1, Math.min(1, across)), length: shadowReach(ray),
      softness: byMoon ? Math.max(0.6, 1 - moonShare) : 1 - smoothstep(0.2, 0.6, direct) },
    noonWeight: byMoon ? 0 : noonWeight,
    rimX: direct >= SKY_ONLY ? body.x : glow ? glow.x : null,
  }
}

const mixRgb = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
