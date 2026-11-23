//# allFunctionsCalledOnLoad
import { plainContrast } from '../../data/city/plainHaze'
import { smoothstep } from '../../world/ridgeLighting'
import type { WorldState } from '../../world/types'
import { geometryOf, MASS_ALPHA } from './farCityGeometry'
import { farTownHazeAtTier } from './farTownHaze'
import { colourKey, landBoxKey, layerKey } from './keys'
import { shineOf } from './marks'
import { receiverLightKey } from './receiverKey'
import { mixLight } from './tone'
import { buildingFaces, buildingLight } from './buildingLight'
import { landIrradiance } from './landIrradiance'
import { legacySurface } from './markTones'
import { DISTANT_PLASTER } from './buildingMaterial'
import { NORMALS } from '../../world/livingLight'
import type { Box, CityLight, CityTier, LayerOf, RGB, SceneBox } from './types'

/** Draw order on the land surface: over the far plane and its water, under the near ridge. */
const Z = 16
/** Limestone, plaster and concrete: what a town far off is made of, by day much paler than the ground round it. */
const ALBEDO: RGB = [0.86, 0.83, 0.77]
/** Sodium and warm-white street light. */
const LAMP: RGB = [1, 0.81, 0.53]
/** Below this contrast (Koschmieder's 2 % threshold is at the visibility; 5 % a little nearer) a town is lost in the air. */
const MIN_CONTRAST = 0.05

/**
 * The far towns (stage C3) in the shared light and air, for every place alike: their stone pale in the day's light (a
 * lit face toward the light's side, the other in sky-lit shade), dark masses by night with their windows lit; every
 * tone carried toward the air by the land's own rule at its distance (`aerialFor`), and a town past the air's contrast
 * threshold (`plainContrast` < 5 %) not drawn. Lights carry farther than shapes (Allard: the transmission's cube root).
 */
export function farCitiesLayer(world: WorldState, box: SceneBox, clear: readonly Box[] = []): LayerOf<'farCities'> | null {
  const far = world.farCities
  if (!far.patches.length && !far.towers.length) return null
  const { night, air } = world
  const visibility = air.visibilityKm
  const geometry = geometryOf(world, box, clear)
  const dark = night.dark
  const dir = landIrradiance(world).sunDir
  const turn = smoothstep(-.025, .025, dir.across)
  const side = (shade: ReturnType<typeof legacySurface>) => turn === 0 ? shade(ALBEDO, NORMALS.left)
    : turn === 1 ? shade(ALBEDO, NORMALS.right) : mixLight(shade(ALBEDO, NORMALS.left), shade(ALBEDO, NORMALS.right), turn)
  const shown = (km: number) => plainContrast(km, visibility) >= MIN_CONTRAST
  const tiers: CityTier[] = []
  geometry.tiers.forEach((tier, i) => {
    const km = farTownHazeAtTier(i)
    const blocks = tier.blocks.filter((b) => shown(b.km))
    const mass = tier.mass.map((step) => step.filter((m) => shown(m.km)))
    if (!blocks.length && !mass.some((step) => step.length)) return
    const shade = legacySurface(world, km)
    const resolved = dark < 1 ? Object.fromEntries([...new Set(blocks.map(b => b.receiver!))]
      .map(id => [id, buildingFaces(world, km, id)])) : undefined
    tiers.push({ km, lit: side(shade), shade: shade(ALBEDO, NORMALS.front), mass: mass.map((boxes, k) => ({ alpha: MASS_ALPHA[k], boxes })),
      blocks, resolved, unresolved: resolved && buildingLight(world, km).unresolved(DISTANT_PLASTER) })
  })
  // Far first: nearer blocks stand in front.
  tiers.sort((a, b) => b.km - a.km)
  const on = smoothstep(0, 0.12, night.litShare) * (0.35 + 0.65 * smoothstep(0.1, 0.7, dark))
  const lights: CityLight[] = on <= 0 ? [] : geometry.lights.flatMap((dot) => {
    const transmission = Math.cbrt(plainContrast(dot.km, visibility))
    if (transmission < MIN_CONTRAST) return []
    return [{ x: dot.x, y: dot.y, r: dot.r, alpha: dot.alpha * transmission * on }]
  })
  const bounds = geometry.bounds
  if (!bounds) return null
  // Fixed block edges use the signed difference between the two face shares.
  const faces = shineOf(world).faces
  const lateralLight = faces.left - faces.right
  const lightKey = layerKey('farCities.light', world.keys.farCities, clear.map((b) => [b.x, b.y, b.w, b.h]), landBoxKey(box),
    tiers.map((t) => [colourKey(t.lit), colourKey(t.shade), t.blocks.length, t.mass.map((m) => m.boxes.length)]),
    Math.round(lateralLight * 64),
    receiverLightKey(world),
    lights.length, Math.round(on * 64), Math.round(visibility * 4))
  return {
    kind: 'farCities', id: 'farCities', surface: 'land', z: Z, bounds,
    // The towns' shapes follow from the place, the text zones and the box; every colour and what the air keeps is light,
    // repainted alone while scrubbing (§1d), over an empty form.
    key: layerKey('farCities', world.keys.farCities, clear.map((b) => [b.x, b.y, b.w, b.h]), landBoxKey(box)),
    light: { key: lightKey, blend: 'source-over', tint: tiers[0]?.lit ?? side(legacySurface(world, 0)) },
    tiers, lateralLight, lights, lightRgb: LAMP,
  }
}
