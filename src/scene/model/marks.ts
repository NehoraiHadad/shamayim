//# allFunctionsCalledOnLoad
import { smoothstep } from '../../world/ridgeLighting'
import type { WorldState } from '../../world/types'
import { colourKey, landBoxKey, layerKey } from './keys'
import { faceLight } from '../../world/livingLight'
import type { Box, GlyphDesc, LayerOf, SceneBox, Shine, Tones } from './types'
import { farNeighbourMarks } from './farNeighbourMarks'
import { glyphGeometryKey } from './markDescriptor'
import type { DrawnMass } from './markOcclusion'
import type { HomeRoofline } from './neighbourPlacement'

/** Far and plain marks lie over the far towns and under the near ridge. The portrait lies over the near ridge and its water. */
const Z = { far: 17, near: 40 }
/** The trees' sway (C7): four frames at two a second, a two-second rock about the lean. */
export const SWAY_FRAMES = { count: 4, fps: 2 }

export { againstLight, tonesAt } from './buildingLight'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

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
      blend: 'source-over', tint: glyphs[0].tones.wall } }]
}
