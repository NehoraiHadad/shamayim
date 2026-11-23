//# allFunctionsCalledOnLoad
import { hashId } from '../../data/landmarks/hash'
import { smoothstep } from '../../world/ridgeLighting'
import { SCENE_W } from '../../world/sceneBox'
import { groundAt as lineAt } from '../../world/sceneLight'
import type { RGB, WorldState } from '../../world/types'
import { fractal } from '../paint/shared/base/core'
import { albedoLinear, linearRgbToSrgb, SNOW_ALBEDO_LIN } from './landRadiance'
import { mixRgb, rgbOf } from './tone'
import type { Pt, SceneBox } from './types'

/**
 * Shared lying-snow reflectance & ragged snow-line geometry (Stages C2, C9 & 7 round 2).
 * Snow enters surface reflectance BEFORE lighting and haze on terrain planes (`snowMaskOf`), and on outside ground.
 */

type PlaneName = 'back' | 'far' | 'near'

/** The light's colour on the land: the sun's (after air mass) through the sky's horizon, warmer toward a low sun. */
export function lightTintOf(world: WorldState): RGB {
  const { light } = world
  const warm = 1 - smoothstep(4, 18, light.altitude)
  return mixRgb(mixRgb(rgbOf(light.palette.horizon), light.colour, 0.55), rgbOf(light.palette.accent), warm * 0.4 * smoothstep(0, 0.1, light.shares.sun))
}

/** Ragged snow-line edge (`[x, y]` in box px) and cover fraction (`0..1`) for reflectance-space terrain snow. */
export function snowMaskOf(world: WorldState, box: SceneBox, name: PlaneName): { edge: Pt[]; cover: number } | null {
  const { snow, terrain } = world
  if (!snow || name === 'back' || !terrain.snowEdge) return null
  const edge = terrain.snowEdge(name, snow.lineM)
  const crest = terrain[name].points
  if (!edge.length || edge.every(([x, y]) => y < lineAt(crest, x) - 1)) return null
  const sx = box.width / SCENE_W
  const seed = hashId(`${world.place.id}:${name}:snow`)
  const ragged = edge.map(([x, y]): Pt => [x * sx, Math.min(box.landHeight + 6, y) + (fractal(seed, x, y, 0.05, 0.05, 2) - 0.5) * 9])
  return { edge: ragged, cover: 0.6 + 0.35 * (snow.amount ?? 0) }
}

/** Outside ground can pre-mix snow cover before going through the same shared shader. */
export function snowyAlbedo(albedo: RGB, cover: number): RGB {
  const [r, g, b] = albedoLinear(albedo)
  return linearRgbToSrgb([r + (SNOW_ALBEDO_LIN[0] - r) * cover,
    g + (SNOW_ALBEDO_LIN[1] - g) * cover, b + (SNOW_ALBEDO_LIN[2] - b) * cover])
}
