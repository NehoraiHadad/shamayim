//# allFunctionsCalledOnLoad
import { hashId } from '../../data/landmarks/hash'
import { groundFn } from '../../data/landmarks/seat'
import { SCENE_CAMERA, wrap180 } from '../../domain/camera'
import { smoothstep } from '../../world/ridgeLighting'
import { SCENE_W } from '../../world/sceneBox'
import type { RGB, WorldMark, WorldState } from '../../world/types'
import { colourKey, landBoxKey, layerKey } from './keys'
import { aerialFor, hazeOf } from './planeLight'
import { mixRgb, rgbOf } from './tone'
import type { Box, GlyphDesc, LayerOf, SceneBox, Shine, Tones } from './types'

/** Draw order on the land: the far ridge's and the plain's marks over the far towns, under the near ridge; the near ridge's
 * portrait (houses, trees, the marks among them) over the near ridge and its water. */
const Z = { far: 17, near: 40 }
/** The trees' sway (C7): four frames at two a second, a two-second rock about the lean. */
export const SWAY_FRAMES = { count: 4, fps: 2 }

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
export function wallShade(world: WorldState): number {
  const dull = 1 - smoothstep(0.05, 0.4, clamp01(world.light.direct))
  return Math.max(againstLight(world), 0.7 * dull * (1 - world.night.dark))
}

/**
 * The tones of everything built or grown on the land at a distance (km), from the one world light: walls are the land's
 * own dark lifted toward the air and toward stone by day; faces turned to the light take its colour by the direct share
 * (none under overcast or with no side: then a soft sky light from above); faces away sink toward a sky-lit dark. Every
 * tone but the lamps is then carried toward the air by the land's aerial rule at that distance.
 */
export function tonesAt(world: WorldState, km: number): Tones {
  const { light, night } = world
  const ridge = rgbOf(light.palette.ridgeNear)
  const sky = hazeOf(world)
  const dark = night.dark, day = 1 - dark
  const sunK = light.side ? clamp01(light.direct) * (light.source === 'moon' ? 0.45 : 1) : 0
  const sun = light.colour
  // Against the light (C9) a wall facing the eye is in its own shade: its stone does not lift it, the dim sky behind the
  // eye is all it sees (the ridge's own dark, a little of the air between), the bright sky beyond only its rims.
  const against = wallShade(world)
  const wallBase = mixRgb(ridge, sky, (0.13 + 0.07 * dark) * (1 - 0.45 * against))
  const wall = mixRgb(wallBase, STONE, 0.1 * day * (1 - against))
  const litFull = mixRgb(mixRgb(ridge, mixRgb(STONE, sun, 0.45), 0.42 + 0.1 * day), sun, 0.08)
  const lit = sunK > 0 ? mixRgb(wall, litFull, sunK * (0.55 + 0.35 * day)) : mixRgb(wall, sky, 0.12)
  const shade = mixRgb(mixRgb(wall, BLACK, 0.3), light.ambient, 0.06 * day)
  const rim = sunK > 0 ? mixRgb(ridge, mixRgb(sun, STONE, 0.3), 0.45 * sunK + 0.08) : mixRgb(ridge, sky, 0.36)
  const roof = mixRgb(ridge, TILE, 0.5 * day + 0.16 * dark)
  const green = mixRgb(ridge, LEAF, 0.5 * day + 0.18 * dark)
  const own: Tones = {
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
  const out = {} as Record<keyof Tones, RGB>
  for (const name of Object.keys(own) as (keyof Tones)[]) out[name] = name === 'win' || name === 'mist' ? own[name] : aerial(own[name], km)
  return out as Tones
}

/** The light the glyphs share: dark, direct light, cast shadow away from the light, lit windows, aviation lights, lean. */
export function shineOf(world: WorldState): Shine {
  const { light, night, wind } = world
  const direct = clamp01(light.direct)
  const on = night.litShare > 0 ? 0.3 + 0.7 * smoothstep(0.05, 0.6, night.dark) : 0
  return {
    night: night.dark,
    direct,
    cast: { dx: light.shadow.dx, length: Math.min(2.5, light.shadow.length),
      alpha: light.side ? 0.55 * direct * (1 - light.shadow.softness) * (light.source === 'moon' ? 0.4 : 1) : 0 },
    // `litShare` is how lit the evening is (1 from 17 to 23 h); about two windows in five are lit then.
    windows: 0.4 * night.litShare * on,
    aviation: night.aviation || night.dark > 0.3,
    lean: Math.max(-0.22, Math.min(0.22, wind.across * Math.min(1, wind.ms / 14) * 0.22)),
    // C7: the gusts rock the crowns about their lean, from a breeze up (the gust over the mean wind adds to it).
    sway: wind.ms < 2.5 ? 0 : Math.min(0.09, 0.012 * wind.ms + 0.006 * Math.max(0, wind.gustMs - wind.ms)),
  }
}

const groundCache = new WeakMap<object, (x: number) => number>()
function nearGround(world: WorldState) {
  let fn = groundCache.get(world.terrain)
  if (!fn) groundCache.set(world.terrain, fn = groundFn(world.terrain.near.points.map(([x, y]) => [x, y]), SCENE_W))
  return fn
}

/** A world mark as a glyph in the box (x scaled across with the figure, heights as they are). */
function glyphOf(world: WorldState, mark: WorldMark, sx: number, tones: Tones): GlyphDesc {
  const ground = mark.depth === undefined ? undefined : (() => {
    const g = nearGround(world)
    const n = Math.max(2, Math.round(mark.w))
    return Array.from({ length: n + 1 }, (_, i) => g(mark.x - mark.w / 2 + i * mark.w / n) + mark.depth! - mark.base)
  })()
  return {
    kind: mark.glyphKind, x: mark.x * sx, base: mark.base, h: mark.h, scale: mark.scale, w: mark.w, seed: hashId(mark.id),
    litSide: world.light.side, tones, famous: mark.named, ...(ground ? { ground } : {}),
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
const shineKey = (s: Shine) => [Math.round(s.night * 64), Math.round(s.direct * 64), Math.round(s.cast.dx * 32), Math.round(s.cast.length * 16),
  Math.round(s.cast.alpha * 64), Math.round(s.windows * 64), s.aviation, Math.round(s.lean * 100), Math.round((s.sway ?? 0) * 200)]

/**
 * The glyphs and the landmarks on the far ridge and the plain (stage C4), as one layer in the one world light
 * (`marks.far`): their shapes follow from the place and the box; every colour, side and shadow is light (a layer all of
 * light, repainted alone while scrubbing over an empty form, as the far towns). The place's own marks stand among its
 * mass, in the outside view's layer (`outside.ts`, C5).
 */
export function marksLayers(world: WorldState, box: SceneBox): LayerOf<'marks'>[] {
  const sx = box.width / SCENE_W
  const shine = shineOf(world)
  const formKey = (id: string) => layerKey(id, world.keys.marks, world.keys.place, landBoxKey(box))
  // Each by its own distance (tones quantised to a few distances, so a scrub reuses them).
  const far = world.marks.filter((m) => m.plane !== 'near')
  if (!far.length) return []
  const glyphs = far.map((m) => glyphOf(world, m, sx, tonesAt(world, m.km)))
  const bounds = boundsOf(glyphs.map(reachOf), box)
  if (!bounds) return []
  return [{ kind: 'marks', id: 'marks.far', surface: 'land', z: Z.far, bounds, key: formKey('marks.far'), glyphs, shine,
    light: { key: layerKey('marks.far:light', formKey('marks.far'), glyphs.map((g) => tonesKey(g.tones)), world.light.side, shineKey(shine)),
      blend: 'source-over', tint: glyphs[0].tones.wall, faces: [] } }]
}
