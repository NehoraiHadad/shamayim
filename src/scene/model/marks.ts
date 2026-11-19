//# allFunctionsCalledOnLoad
import { hashId } from '../../data/landmarks/hash'
import { groundFn } from '../../data/landmarks/seat'
import { smoothstep } from '../../world/ridgeLighting'
import { SCENE_W } from '../../world/sceneBox'
import type { RGB, WorldMark, WorldState } from '../../world/types'
import { colourKey, landBoxKey, layerKey } from './keys'
import { aerialFor, hazeOf } from './planeLight'
import { mixRgb, rgbOf } from './tone'
import type { Box, GlyphDesc, HouseDesc, LayerOf, SceneBox, Shine, Tones, TreeDesc } from './types'

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
  const wallBase = mixRgb(ridge, sky, 0.13 + 0.07 * dark)
  const wall = mixRgb(wallBase, STONE, 0.1 * day)
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
    glass: mixRgb(mixRgb(ridge, BLACK, 0.12), sky, 0.12), glassLit: mixRgb(ridge, sky, 0.42 * day + 0.12),
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
 * The glyphs, the landmarks and the village portrait (stage C4), as two layers in the one world light: the marks on the
 * far ridge and the plain (`marks.far`), and on the near ridge the portrait's houses and trees with the marks that stand
 * among them (`portrait`), drawn back to front. Their shapes follow from the place and the box; every colour, side and
 * shadow is light (a layer all of light, repainted alone while scrubbing over an empty form, as the far towns).
 */
export function marksLayers(world: WorldState, box: SceneBox): (LayerOf<'marks'> | LayerOf<'portrait'>)[] {
  const sx = box.width / SCENE_W
  const shine = shineOf(world)
  const out: (LayerOf<'marks'> | LayerOf<'portrait'>)[] = []
  const formKey = (id: string) => layerKey(id, world.keys.marks, world.keys.place, landBoxKey(box))
  // Far and plain marks: each by its own distance (tones quantised to a few distances, so a scrub reuses them).
  const far = world.marks.filter((m) => m.plane !== 'near')
  if (far.length) {
    const glyphs = far.map((m) => glyphOf(world, m, sx, tonesAt(world, m.km)))
    const bounds = boundsOf(glyphs.map(reachOf), box)
    if (bounds) {
      out.push({ kind: 'marks', id: 'marks.far', surface: 'land', z: Z.far, bounds, key: formKey('marks.far'), glyphs, shine,
        light: { key: layerKey('marks.far:light', formKey('marks.far'), glyphs.map((g) => tonesKey(g.tones)), world.light.side, shineKey(shine)),
          blend: 'source-over', tint: glyphs[0].tones.wall, faces: [] } })
    }
  }
  // Seen from outside, the place's own marks stand among its mass (`outside.ts`, C5).
  const near = world.place3.kind === 'outside' ? [] : world.marks.filter((m) => m.plane === 'near')
  const plan = world.place3.kind === 'portrait' ? world.place3.plan : null
  if (!near.length && !plan?.houses.length && !plan?.trees.length) return out
  // The portrait at the place's own distance: the near ridge under the dot (the village is here).
  const km = Math.min(world.place3.reachKm, world.terrain.sightAt?.(world.place3.dot.x).nearKm ?? 1)
  const tones = tonesAt(world, km)
  const houses: HouseDesc[] = (plan?.houses ?? []).map((h) => ({ x: h.x * sx, base: h.base, w: h.w * sx, h: h.h, storeys: h.storeys,
    roof: h.roof, heater: h.heater, tint: h.tint, seed: h.seed }))
  const trees: TreeDesc[] = (plan?.trees ?? []).map((t) => ({ kind: t.kind, x: t.x * sx, base: t.base, w: t.w, h: t.h, seed: t.seed }))
  const glyphs = near.map((m) => glyphOf(world, m, sx, tonesAt(world, m.km)))
  const bounds = boundsOf([
    ...houses.map((h) => ({ left: h.x - 9, right: h.x + h.w + 9, top: h.base - h.h - 3, bottom: h.base + 1.5 })),
    ...trees.map((t) => ({ left: t.x - t.w - 3, right: t.x + t.w + 3, top: t.base - t.h - 2, bottom: t.base + 1.5 })),
    ...glyphs.map(reachOf),
  ], box)
  if (!bounds) return out
  // C7: trees swaying in the wind, as a strip of frames (the light canvas only; houses and marks stand still in it).
  const sways = trees.length > 0 && (shine.sway ?? 0) > 0.005
  out.push({ kind: 'portrait', id: 'portrait', surface: 'land', z: Z.near, bounds, key: formKey('portrait'), houses, trees, glyphs,
    tones, shine, litSide: world.light.side, ...(sways ? { animated: { mode: 'frames' as const, frames: SWAY_FRAMES } } : {}),
    light: { key: layerKey('portrait:light', formKey('portrait'), tonesKey(tones), glyphs.map((g) => tonesKey(g.tones)), world.light.side,
      shineKey(shine)), blend: 'source-over', tint: tones.wall, faces: [] } })
  return out
}
