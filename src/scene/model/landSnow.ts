//# allFunctionsCalledOnLoad
import { hashId } from '../../data/landmarks/hash'
import { smoothstep } from '../../world/ridgeLighting'
import { SCENE_W } from '../../world/sceneBox'
import { groundAt as lineAt } from '../../world/sceneLight'
import type { RGB, WorldState } from '../../world/types'
import { fractal } from '../paint/core'
import { AERIAL, hazeOf } from './landVeil'
import { mixRgb, rgbOf } from './tone'
import type { Pt, SceneBox, SnowCap } from './types'

/**
 * Shared lying-snow look and plane snow-cap geometry (Stage C2 + C9, extracted from `planeLight.ts`).
 * Used by both terrain planes (`planeLight.ts`) and the outside-view own ground (`outsideGround.ts`).
 */

type PlaneName = 'back' | 'far' | 'near'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0

/** The light's colour on the land: the sun's (after air mass) through the sky's horizon, warmer toward a low sun. */
export function lightTintOf(world: WorldState): RGB {
  const { light } = world
  const warm = 1 - smoothstep(4, 18, light.altitude)
  return mixRgb(mixRgb(rgbOf(light.palette.horizon), light.colour, 0.55), rgbOf(light.palette.accent), warm * 0.4 * smoothstep(0, 0.1, light.shares.sun))
}

/** Lying snow's colour and cover at a distance (km), lit as the land: by the light's colour and share, hazed by the air. */
export function snowLook(world: WorldState, km: number, strength: number, lightTint: RGB): { rgb: RGB; alpha: number } {
  const { light } = world
  const white: RGB = [0.95, 0.96, 0.98]
  const sky = mixRgb(white, rgbOf(light.palette.mid), 0.35 + 0.4 * world.night.dark)
  const lit = mixRgb(white, lightTint, 0.2 + 0.2 * (1 - strength))
  const rgb = mixRgb(sky, lit, light.source === 'moon' ? smoothstep(0.1, 0.3, strength) : smoothstep(0, 0.12, strength))
  return { rgb: mixRgb(rgb, hazeOf(world), AERIAL * world.air.fade(km) ** 2), alpha: 0.55 + 0.4 * (world.snow?.amount ?? 0) }
}

/** Snow above the snow line (`terrain.snowEdge`), its lower edge ragged by seeded displacement (no filter). */
export function snowOf(world: WorldState, box: SceneBox, name: PlaneName, strength: number, lightTint: RGB): SnowCap | null {
  const { snow, terrain } = world
  if (!snow || name === 'back' || !terrain.snowEdge) return null
  const edge = terrain.snowEdge(name, snow.lineM)
  const crest = terrain[name].points
  if (!edge.length || edge.every(([x, y]) => y < lineAt(crest, x) - 1)) return null
  const sx = box.width / SCENE_W
  const seed = hashId(`${world.place.id}:${name}:snow`)
  const ragged = edge.map(([x, y]): Pt => [x * sx, Math.min(box.landHeight + 6, y) + (fractal(seed, x, y, 0.05, 0.05, 2) - 0.5) * 9])
  return { edge: ragged, ...snowLook(world, median(terrain[name].distanceKm), strength, lightTint) }
}

/** Lying snow on any ground at a distance (km) as the planes take it (C9); null with no snow lying. */
export function snowOnGround(world: WorldState, km: number): { rgb: RGB; alpha: number } | null {
  if (!world.snow) return null
  const { light } = world
  return snowLook(world, km, light.ray ? clamp01(light.direct * 1.3) : 0, lightTintOf(world))
}
