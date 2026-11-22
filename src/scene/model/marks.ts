//# allFunctionsCalledOnLoad
import { SCENE_CAMERA, wrap180 } from '../../domain/camera'
import { smoothstep } from '../../world/ridgeLighting'
import type { RGB, WorldState } from '../../world/types'
import { colourKey, landBoxKey, layerKey } from './keys'
import { nearGroundAlbedo } from './landColour'
import {
  albedoLinear, FLAT_NORMAL, landIrradiance, linearRgbToSrgb, shadeLinearRgb, srgbRgbToLinear,
} from './landRadiance'
import { aerialFor, hazeOf } from './landVeil'
import { mixRgb } from './tone'
import { faceLight, NORMALS, type Normal } from '../../world/livingLight'
import type { Box, GlyphDesc, LayerOf, SceneBox, Shine, Tones } from './types'
import { farNeighbourMarks } from './farNeighbourMarks'
import { glyphGeometryKey } from './markDescriptor'
import type { DrawnMass } from './markOcclusion'
import type { HomeRoofline } from './neighbourPlacement'

/** Far and plain marks lie over the far towns and under the near ridge. The portrait lies over the near ridge and its water. */
const Z = { far: 17, near: 40 }
/** The trees' sway (C7): four frames at two a second, a two-second rock about the lean. */
export const SWAY_FRAMES = { count: 4, fps: 2 }

/** Plaster, limestone and concrete; red clay tile; olive and pine foliage; a solar panel's blue; the Báb's gilding. */
const WALL_ALBEDO: RGB = [0.64, 0.63, 0.60]
const STONE: RGB = [0.82, 0.80, 0.74]
const TILE: RGB = [0.64, 0.30, 0.21]
const LEAF: RGB = [0.19, 0.28, 0.21]
const PANEL: RGB = [0.11, 0.17, 0.30]
const GOLD: RGB = [0.84, 0.66, 0.28]
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
export function wallShade(world: WorldState): number {
  const dull = 1 - smoothstep(0.05, 0.4, clamp01(world.light.direct))
  return Math.max(againstLight(world), 0.7 * dull * (1 - world.night.dark))
}

/**
 * Physical material lighting for built & grown objects on the land (Stage 7 round 2):
 * lights stone, plaster, tile and foliage using their own albedos and wall/roof normals under the shared
 * `landIrradiance`, with local ground contributing ONLY a bounded upward bounce (`<= 0.10`), then applies linear
 * Koschmieder aerial haze once at distance `km` (never inheriting soil tint).
 */
export function tonesAt(world: WorldState, km: number): Tones {
  const { light, night } = world
  const sky = hazeOf(world)
  const dark = night.dark, day = 1 - dark
  const sunK = directK(world)
  const sun = light.colour
  const against = wallShade(world)
  const irr = landIrradiance(world)
  // Bounded upward bounce from the sunlit local ground onto vertical walls (`<= 0.10`, never tinting stone khaki).
  const gRho = albedoLinear(nearGroundAlbedo(world), 1)
  const gSun = Math.max(0, irr.sunDir.up) * (1 - against)
  const bounceVec: [number, number, number] = [
    0.09 * gRho[0] * (irr.eSunVec[0] * gSun + irr.eSkyVec[0]),
    0.09 * gRho[1] * (irr.eSunVec[1] * gSun + irr.eSkyVec[1]),
    0.09 * gRho[2] * (irr.eSunVec[2] * gSun + irr.eSkyVec[2]),
  ]
  const eWallSky: [number, number, number] = [
    irr.eSkyVec[0] + bounceVec[0], irr.eSkyVec[1] + bounceVec[1], irr.eSkyVec[2] + bounceVec[2],
  ]
  const shadeMat = (albedo: RGB, n: Normal, sMul: number, vSky: number, withBounce: boolean): RGB => {
    const rho = srgbRgbToLinear(albedo)
    const ndS = Math.max(0, n[0] * irr.sunDir.across + n[1] * irr.sunDir.ahead + n[2] * irr.sunDir.up) * sMul
    const ndM = Math.max(0, n[0] * irr.moonDir.across + n[1] * irr.moonDir.ahead + n[2] * irr.moonDir.up) * sMul
    return linearRgbToSrgb(shadeLinearRgb(rho, irr.eSunVec, irr.eMoonVec, withBounce ? eWallSky : irr.eSkyVec, ndS, ndM, vSky, irr.yHorizon))
  }
  // Viewer-facing vertical wall (`NORMALS.front`): against a low sun it sees only the dim back-half of the sky (C9).
  const wallVSky = 0.50 * (1 - 0.52 * against)
  const wallDirect = 0.28 * (1 - against) * smoothstep(10, 38, irr.sunAlt)
  const wall = linearRgbToSrgb(shadeLinearRgb(
    srgbRgbToLinear(WALL_ALBEDO), irr.eSunVec, irr.eMoonVec, eWallSky, wallDirect, 0.15 * (1 - against), wallVSky, irr.yHorizon,
  ))
  // Sun-facing architectural wall (`lit`): receives direct beam square to its normal; equals wall when direct share is 0.
  const litFull = linearRgbToSrgb(shadeLinearRgb(
    srgbRgbToLinear(STONE), irr.eSunVec, irr.eMoonVec, eWallSky, 0.85, 0.85, 0.52, irr.yHorizon,
  ))
  const lit = mixRgb(wall, litFull, sunK * (0.55 + 0.35 * day))
  const shade = mixRgb(shadeMat(WALL_ALBEDO, NORMALS.front, 0, 0.24 * (1 - 0.3 * against), true), sky, 0.06 * day)
  const rimSky = mixRgb(wall, sky, 0.32)
  const rimSun = mixRgb(lit, mixRgb(sun, STONE, 0.3), 0.35 * sunK + 0.08)
  const rim = mixRgb(rimSky, rimSun, smoothstep(0, 0.35, sunK))
  const roof = shadeMat(TILE, FLAT_NORMAL, 0.85 * (1 - 0.5 * against), 0.92, false)
  const green = shadeMat(LEAF, FLAT_NORMAL, 0.7 * (1 - 0.4 * against), 0.85, false)
  const own: Tones = {
    wall, lit, shade, rim,
    deep: mixRgb(shade, BLACK, 0.48),
    refl: mixRgb(shade, sky, 0.28),
    roof, roofLit: shadeMat(TILE, FLAT_NORMAL, 1, 1, false),
    stone: mixRgb(wall, litFull, 0.16 * day * (1 - against) + 0.04),
    stoneLit: mixRgb(lit, litFull, 0.22 * day + 0.04),
    glass: mixRgb(mixRgb(shade, BLACK, 0.16), sky, 0.14),
    glassLit: mixRgb(wall, sky, (0.42 * day + 0.12) * (1 - 0.6 * against)),
    soot: mixRgb(shade, BLACK, 0.45),
    green, greenLit: shadeMat(LEAF, FLAT_NORMAL, 1, 1, false),
    panel: shadeMat(PANEL, FLAT_NORMAL, 0.7, 0.85, false),
    gold: shadeMat(GOLD, FLAT_NORMAL, 0.9, 0.95, false),
    win: LAMP, mist: sky,
  }
  const aerial = aerialFor(world, sky)
  const out = {} as Record<keyof Tones, RGB>
  for (const name of Object.keys(own) as (keyof Tones)[]) out[name] = name === 'win' || name === 'mist' ? own[name] : aerial(own[name], km)
  return out as Tones
}

/** The direct light a lit face takes: the sun's share, the moon's at under half (its light is faint and colourless). */
export const directK = (world: WorldState) => clamp01(world.light.shares.sun + 0.45 * world.light.shares.moon)

/**
 * The light the glyphs share: dark, direct light, each face's share of it by its normal (`faces`), cast shadow away from
 * the light, lit windows, aviation lights, lean.
 */
export function shineOf(world: WorldState): Shine {
  const { light, night, wind } = world
  const direct = clamp01(light.direct)
  const on = smoothstep(0, 0.12, night.litShare) * (0.3 + 0.7 * smoothstep(0.05, 0.6, night.dark))
  const aviationStrength = Math.max(smoothstep(0, 0.04, night.litShare), smoothstep(0.2, 0.4, night.dark))
  const moonK = light.direct > 0 ? (light.shares.sun + 0.4 * light.shares.moon) / light.direct : 1
  return {
    night: night.dark,
    direct,
    faces: faceLight(light.dir, directK(world)),
    // The low sun's glint in the glass of the faces turned to it (strongest a little over the horizon, none at noon).
    glint: clamp01(light.shares.sun * 1.4) * (1 - smoothstep(6, 22, light.altitude)) * smoothstep(-1, 1.5, light.altitude),
    cast: { dx: light.shadow.dx, length: Math.min(2.5, light.shadow.length),
      alpha: 0.55 * direct * (1 - light.shadow.softness) * moonK },
    // `litShare` is how lit the evening is (1 from 17 to 23 h); about two windows in five are lit then.
    windows: 0.4 * night.litShare * on,
    aviationStrength,
    lean: Math.max(-0.22, Math.min(0.22, wind.across * Math.min(1, wind.ms / 14) * 0.22)),
    // C7: the gusts rock the crowns about their lean, from a breeze up (the gust over the mean wind adds to it).
    sway: wind.ms < 2.5 ? 0 : Math.min(0.09, 0.012 * wind.ms + 0.006 * Math.max(0, wind.gustMs - wind.ms)),
  }
}

/**
 * A glyph's box with the longest cast shadow it can have on either side and its lamps' halos (px): independent of the
 * light, so a scrub never resizes the layer (a resize repaints it whole).
 */
function reachOf(g: GlyphDesc) {
  const half = g.w / 2 + 2
  const top = g.base - g.h * g.scale - 4
  const cast = Math.min(15, 2.5 * g.h * g.scale * 0.6 + 1)
  return { left: g.x - half - cast, right: g.x + half + cast, top,
    bottom: g.base + (g.ground ? Math.max(...g.ground) + 8 : 2) }
}

function boundsOf(boxes: { left: number; right: number; top: number; bottom: number }[], box: SceneBox): Box | null {
  if (!boxes.length) return null
  const x0 = Math.max(0, Math.floor(Math.min(...boxes.map((b) => b.left)))), x1 = Math.min(box.width, Math.ceil(Math.max(...boxes.map((b) => b.right))))
  const y0 = Math.max(0, Math.floor(Math.min(...boxes.map((b) => b.top)))), y1 = Math.min(box.landHeight, Math.ceil(Math.max(...boxes.map((b) => b.bottom))))
  return x1 > x0 && y1 > y0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null
}

const tonesKey = (t: Tones) => (Object.keys(t) as (keyof Tones)[]).map((k) => colourKey(t[k]))
export const facesKey = (s: Shine) => [s.faces.front, s.faces.left, s.faces.right, s.faces.top, s.faces.rim, s.faces.across,
  s.glint ?? 0].map((v) => Math.round(v * 64))
  // Both marks and outside use this fragment. Include lamp strength at alpha-byte precision.
  .concat(Math.round(s.aviationStrength * 255))
const shineKey = (s: Shine) => [facesKey(s), Math.round(s.night * 64), Math.round(s.direct * 64), Math.round(s.cast.dx * 32), Math.round(s.cast.length * 16),
  Math.round(s.cast.alpha * 64), Math.round(s.windows * 64), Math.round(s.lean * 100), Math.round((s.sway ?? 0) * 200)]

/**
 * The glyphs and the landmarks on the far ridge and the plain (stage C4), as one layer in the one world light
 * (`marks.far`): their shapes follow from the place and the box; every colour, side and shadow is light (a layer all of
 * light, repainted alone while scrubbing over an empty form, as the far towns). The place's own marks stand among its
 * mass, in the outside view's layer (`outside.ts`, C5).
 */
export function marksLayers(world: WorldState, box: SceneBox, towns: LayerOf<'farCities'> | null = null,
  home: HomeRoofline | null = null, clear: readonly Box[] = [], foreground: readonly DrawnMass[] = []): LayerOf<'marks'>[] {
  const shine = shineOf(world)
  const formKey = (id: string) => layerKey(id, world.keys.marks, world.keys.place, landBoxKey(box), glyphs.map(glyphGeometryKey))
  const glyphs = farNeighbourMarks(world, box, towns, home, clear, foreground)
  const bounds = boundsOf(glyphs.map(reachOf), box)
  if (!bounds) return []
  return [{ kind: 'marks', id: 'marks.far', surface: 'land', z: Z.far, bounds, key: formKey('marks.far'), glyphs, shine,
    light: { key: layerKey('marks.far:light', formKey('marks.far'), glyphs.map((g) => tonesKey(g.tones)), Math.round(world.light.across * 64), shineKey(shine)),
      blend: 'source-over', tint: glyphs[0].tones.wall, faces: [] } }]
}
