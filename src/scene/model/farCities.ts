//# allFunctionsCalledOnLoad
import { MIN_PLAIN_CONTRAST, plainContrast, plainContrastDistance } from '../../data/city/plainHaze'
import { smoothstep } from '../../world/ridgeLighting'
import type { WorldState } from '../../world/types'
import { buildingFaces, buildingLight } from './buildingLight'
import { DISTANT_PLASTER } from './buildingMaterial'
import { geometryOf, MASS_ALPHA } from './farCityGeometry'
import { farTownHazeAtTier } from './farTownHaze'
import { colourKey, landBoxKey, layerKey } from './keys'
import { receiverLightKey } from './receiverKey'
import type { Box, CityLight, CityTier, LayerOf, RGB, SceneBox } from './types'

const Z = 16
const LAMP: RGB = [1, 0.81, 0.53]

/** Far towns use averaged surfaces below resolution, and the same facet light as the near city as they resolve. */
export function farCitiesLayer(world: WorldState, box: SceneBox, clear: readonly Box[] = []): LayerOf<'farCities'> | null {
  const far = world.farCities
  if (!far.patches.length && !far.towers.length) return null
  const { night, air } = world
  const visibility = air.visibilityKm
  const geometry = geometryOf(world, box, clear)
  if (!geometry.bounds) return null
  // A single distance cutoff per frame replaces one exponential per town fragment.
  const limit = plainContrastDistance(MIN_PLAIN_CONTRAST, visibility)
  const shown = (km: number) => km <= limit
  const tiers: CityTier[] = []
  geometry.tiers.forEach((tier, i) => {
    const km = farTownHazeAtTier(i)
    const blocks = tier.blocks.filter((b) => shown(b.km))
    const mass = tier.mass.map((step) => step.filter((m) => shown(m.km)))
    if (!blocks.length && !mass.some((step) => step.length)) return
    const resolved: CityTier['resolved'] = {}
    for (const b of blocks) if (b.detail && !resolved[b.receiver]) resolved[b.receiver] = buildingFaces(world, km, b.receiver, false, true)
    tiers.push({ km, mass: mass.map((boxes, k) => ({ alpha: MASS_ALPHA[k], boxes })),
      blocks, resolved, unresolved: buildingLight(world, km).unresolved(DISTANT_PLASTER) })
  })
  tiers.sort((a, b) => b.km - a.km)
  const on = smoothstep(0, 0.12, night.litShare) * (0.35 + 0.65 * smoothstep(0.1, 0.7, night.dark))
  const lights: CityLight[] = on <= 0 ? [] : geometry.lights.flatMap((dot) => {
    const transmission = Math.cbrt(plainContrast(dot.km, visibility))
    if (transmission < MIN_PLAIN_CONTRAST) return []
    return [{ x: dot.x, y: dot.y, r: dot.r, alpha: dot.alpha * transmission * on }]
  })
  const key = layerKey('farCities', world.keys.farCities, clear.map((b) => [b.x, b.y, b.w, b.h]), landBoxKey(box))
  const lightKey = layerKey('farCities.light', key,
    tiers.map((t) => [colourKey(t.unresolved), t.blocks.length, t.mass.map((m) => m.boxes.length)]),
    receiverLightKey(world), lights.length, Math.round(on * 64), Math.round(visibility * 4))
  return { kind: 'farCities', id: 'farCities', surface: 'land', z: Z, bounds: geometry.bounds, key,
    light: { key: lightKey, blend: 'source-over', tint: tiers[0]?.unresolved ?? [0, 0, 0] }, tiers, lights, lightRgb: LAMP }
}
