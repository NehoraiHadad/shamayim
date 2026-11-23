import { SCENE_CAMERA, wrap180 } from '../../domain/camera'
import { smoothstep } from '../../world/ridgeLighting'
import type { RGB, WorldState } from '../../world/types'
import { illustratedAerialFor as aerialFor, illustratedHazeOf as hazeOf } from './illustratedHaze'
import { directK } from './marks'
import { mixRgb, rgbOf } from './tone'
import type { Tones } from './types'

/** The illustrated palette: the tones of what is built or grown, with a body's reflected edge and the gilding. */
export interface IllustratedTones extends Tones { refl: RGB; gold: RGB }

/** Plaster, limestone and concrete; red clay tile; olive and pine foliage; a solar panel's blue; the Báb's gilding. */
const STONE: RGB = [0.87, 0.84, 0.78]
const TILE: RGB = [0.71, 0.33, 0.24]
const LEAF: RGB = [0.2, 0.29, 0.23]
const PANEL: RGB = [0.12, 0.18, 0.32]
const GOLD: RGB = [0.86, 0.68, 0.3]
const LAMP: RGB = [1, 0.85, 0.63]
const BLACK: RGB = [0, 0, 0]

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/**
 * How much the light stands beyond the land (C9 defect 1): the walls the eye sees face it, so with the sun low in the
 * half of the sky the eye looks into (its azimuth within 90° of the view's heading) they face away from the sun and from
 * the bright half of the sky, and see only the dim sky behind the eye. 1 for a low sun ahead (sunrise and sunset over the
 * land), falling as it climbs (a high sun lights the ground in front, which lights the walls back) and as it turns to the
 * eye's side; through twilight while its glow is still beyond the land; none by night.
 */
export function againstLight(world: WorldState): number {
  const sun = world.bodies.sun
  const ahead = smoothstep(-0.1, 0.4, Math.cos(wrap180(sun.azimuth - SCENE_CAMERA.heading) * Math.PI / 180))
  const low = 1 - smoothstep(12, 40, sun.altitude)
  const up = smoothstep(-8, -1, sun.altitude)
  return clamp01(ahead * low * up * (1 - world.night.dark))
}

/**
 * How much the walls the eye sees stand in their own shade (C9 defect 1): against the light (above), or under a sky with
 * no direct light worth the name, where a wall sees only the dim horizon half of an overcast sky (a third of the zenith's)
 * and gives back about what the ground does (pale stone at ~0.4 of the light a slope of dark scrub takes in full): its
 * stone no longer lifts it over the land, only its tops and rims catch the sky.
 */
function wallShade(world: WorldState): number {
  const dull = 1 - smoothstep(0.05, 0.4, clamp01(world.light.direct))
  return Math.max(againstLight(world), 0.7 * dull * (1 - world.night.dark))
}

/**
 * The tones of everything built or grown on the land at a distance (km), from the one world light: walls are the land's
 * own dark lifted toward the air and toward stone by day; faces turned to the light take its colour by the direct share
 * (none under overcast or with no side: then a soft sky light from above); faces away sink toward a sky-lit dark. Every
 * tone but the lamps is then carried toward the air by the land's aerial rule at that distance.
 */
export function illustratedTonesAt(world: WorldState, km: number): IllustratedTones {
  const { light, night } = world
  const ridge = rgbOf(light.palette.ridgeNear)
  const sky = hazeOf(world)
  const dark = night.dark, day = 1 - dark
  // The living light: the direct share as it is (the moon's fainter), never gated by a side; a face takes it by its own
  // normal (`Shine.faces`), so `lit` is a face square to the light at this minute and equals the wall when there is none.
  const sunK = directK(world)
  const sun = light.colour
  // Against the light (C9) a wall facing the eye is in its own shade: its stone does not lift it, the dim sky behind the
  // eye is all it sees (the ridge's own dark, a little of the air between), the bright sky beyond only its rims.
  const against = wallShade(world)
  const wallBase = mixRgb(ridge, sky, (0.13 + 0.07 * dark) * (1 - 0.45 * against))
  const wall = mixRgb(wallBase, STONE, 0.1 * day * (1 - against))
  const litFull = mixRgb(mixRgb(ridge, mixRgb(STONE, sun, 0.45), 0.42 + 0.1 * day), sun, 0.08)
  const lit = mixRgb(wall, litFull, sunK * (0.55 + 0.35 * day))
  // Shade is never flat black: the sky fills it, cooler and bluer than the light (the sky's own tone, more of it the more
  // of the sky is clear), and the sunlit ground in front gives back a little of the sun's warmth.
  const skyFill = mixRgb(light.ambient, sky, 0.4)
  const bounce = mixRgb(ridge, mixRgb(STONE, sun, 0.5), 0.5)
  const shade = mixRgb(mixRgb(mixRgb(wall, BLACK, 0.3), skyFill, (0.06 + 0.07 * (1 - light.diffuse)) * day), bounce, 0.1 * sunK * day)
  const rimSky = mixRgb(ridge, sky, 0.36)
  const rimSun = mixRgb(ridge, mixRgb(sun, STONE, 0.3), 0.45 * sunK + 0.08)
  const rim = mixRgb(rimSky, rimSun, smoothstep(0, 0.35, sunK))
  const roof = mixRgb(ridge, TILE, 0.5 * day + 0.16 * dark)
  const green = mixRgb(ridge, LEAF, 0.5 * day + 0.18 * dark)
  const own: IllustratedTones = {
    wall, lit, shade, rim,
    deep: mixRgb(ridge, BLACK, 0.45),
    refl: mixRgb(shade, sky, 0.28),
    roof, roofLit: mixRgb(roof, mixRgb(TILE, sun, 0.3), 0.45 * sunK),
    stone: mixRgb(wall, STONE, 0.12 * day + 0.04), stoneLit: mixRgb(lit, STONE, 0.16 * day + 0.04),
    glass: mixRgb(mixRgb(ridge, BLACK, 0.12), sky, 0.12), glassLit: mixRgb(ridge, sky, (0.42 * day + 0.12) * (1 - 0.6 * against)),
    soot: mixRgb(ridge, BLACK, 0.4),
    green, greenLit: mixRgb(green, mixRgb(sun, LEAF, 0.4), 0.42 * sunK + 0.04),
    panel: mixRgb(ridge, PANEL, 0.55), gold: mixRgb(ridge, GOLD, 0.72 * day + 0.5 * dark),
    win: LAMP, mist: sky,
  }
  const aerial = aerialFor(world, sky)
  const out = {} as Record<keyof IllustratedTones, RGB>
  for (const name of Object.keys(own) as (keyof IllustratedTones)[]) out[name] = name === 'win' || name === 'mist' ? own[name] : aerial(own[name], km)
  return out as IllustratedTones
}
