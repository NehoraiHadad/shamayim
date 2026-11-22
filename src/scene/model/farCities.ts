//# allFunctionsCalledOnLoad
import { plainContrast } from '../../data/city/plainHaze'
import { smoothstep } from '../../world/ridgeLighting'
import { SCENE_W } from '../../world/sceneBox'
import type { FarCities, WorldState } from '../../world/types'
import { farTownHazeAtTier, farTownTier, TIER_KM } from './farTownHaze'
import { colourKey, landBoxKey, layerKey } from './keys'
import { againstLight, shineOf, wallShade } from './marks'
import { nearGroundAlbedo } from './landColour'
import { FLAT_NORMAL, litLandRgb } from './landRadiance'
import { aerialFor } from './landVeil'
import { mixRgb, rgbOf } from './tone'
import type { Box, CityBlock, CityLight, CityTier, LayerOf, RGB, SceneBox } from './types'

/** Draw order on the land surface: over the far plane and its water, under the near ridge. */
const Z = 16
/** Limestone, plaster and concrete: what a town far off is made of, by day much paler than the ground round it. */
const ALBEDO: RGB = [0.86, 0.83, 0.77]
/** Sodium and warm-white street light. */
const LAMP: RGB = [1, 0.81, 0.53]
/** Below this contrast (Koschmieder's 2 % threshold is at the visibility; 5 % a little nearer) a town is lost in the air. */
const MIN_CONTRAST = 0.05

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const hits = (clear: readonly Box[], x: number, y: number, w: number, h: number) =>
  clear.some((b) => x < b.x + b.w && x + w > b.x && y < b.y + b.h && y + h > b.y)

interface Geometry {
  /** By tier (index into `TIER_KM`): the town masses (by strength step) and blocks, each with its own distance. */
  tiers: { mass: (Box & { km: number; townId?: number })[][]; blocks: CityBlock[] }[]
  lights: (CityLight & { km: number })[]
  bounds: Box | null
}

/** The mass's strength by step (`world/farCities.ts`'s `MASS_FROM`): one fill each. */
const MASS_ALPHA = [0.18, 0.32, 0.5, 0.68, 0.85]

const geometries = new WeakMap<FarCities, Map<string, Geometry>>()

/**
 * The world's town shapes (`townShapes`, at the reference width) in the box, by distance tier, out of the text zones,
 * with the layer's extent: every town and light it could show whatever the hour's air keeps, so it never moves.
 * Memoised per place and box.
 */
function geometryOf(world: WorldState, box: SceneBox, clear: readonly Box[]): Geometry {
  const far = world.farCities
  let byKey = geometries.get(far)
  if (!byKey) geometries.set(far, byKey = new Map())
  const key = `${box.width}:${box.landHeight}:${clear.map((b) => `${b.x.toFixed(1)},${b.y.toFixed(1)},${b.w.toFixed(1)}`).join(';')}`
  const cached = byKey.get(key)
  if (cached) return cached
  const sx = box.width / SCENE_W
  const tiers: Geometry['tiers'] = TIER_KM.map(() => ({ mass: MASS_ALPHA.map(() => []), blocks: [] }))
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
  const extend = (x: number, y: number, w: number, h: number) => {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x + w); y0 = Math.min(y0, y); y1 = Math.max(y1, y + h)
  }
  for (const m of far.shapes.mass) {
    const x = m.x * sx, w = m.w * sx
    if (hits(clear, x, m.y, w, m.h)) continue
    tiers[farTownTier(m.km)].mass[m.step].push({ x, y: m.y, w, h: m.h, km: m.km, townId: m.townId })
    extend(x, m.y, w, m.h)
  }
  for (const b of far.shapes.blocks) {
    const x = b.x * sx, w = b.w * Math.max(1, sx)
    if (hits(clear, x, b.base - b.h, w, b.h)) continue
    tiers[farTownTier(b.km)].blocks.push({ x, base: b.base, w, h: b.h, km: b.km })
    extend(x, b.base - b.h, w, b.h)
  }
  const lights = far.shapes.lights.flatMap((dot) => {
    const r = dot.r * Math.max(0.8, sx), x = dot.x * sx
    if (hits(clear, x - r, dot.y - r, 2 * r, 2 * r)) return []
    extend(x - 3 * r, dot.y - 3 * r, 6 * r, 6 * r)
    return [{ x, y: dot.y, r, alpha: dot.alpha, km: dot.km }]
  })
  const bx = Math.max(0, Math.floor(x0 - 1)), by = Math.max(0, Math.floor(y0 - 1))
  const bounds = Number.isFinite(x0) ? { x: bx, y: by, w: Math.max(1, Math.min(box.width, Math.ceil(x1 + 1)) - bx),
    h: Math.max(1, Math.min(box.landHeight, Math.ceil(y1 + 1)) - by) } : null
  const geometry = { tiers, lights, bounds }
  if (byKey.size > 6) byKey.clear()
  byKey.set(key, geometry)
  return geometry
}

/**
 * The far towns (stage C3) in the shared light and air, for every place alike: their stone pale in the day's light (a
 * lit face toward the light's side, the other in sky-lit shade), dark masses by night with their windows lit; every
 * tone carried toward the air by the land's own rule at its distance (`aerialFor`), and a town past the air's contrast
 * threshold (`plainContrast` < 5 %) not drawn. Lights carry farther than shapes (Allard: the transmission's cube root).
 */
export function farCitiesLayer(world: WorldState, box: SceneBox, clear: readonly Box[] = []): LayerOf<'farCities'> | null {
  const far = world.farCities
  if (!far.patches.length && !far.towers.length) return null
  const { light, night, air } = world
  const visibility = air.visibilityKm
  const geometry = geometryOf(world, box, clear)
  const aerial = aerialFor(world)
  const dark = night.dark
  const day = 1 - dark
  const shade = wallShade(world)
  const ground = litLandRgb(world, nearGroundAlbedo(world), FLAT_NORMAL, 0, undefined, 1 - shade)
  const direct = clamp01(light.direct)
  // Stone in the light of the hour: lit by the light's colour, shade by the sky; toward the night land's dark by night.
  // C9: against the light (and under a dull sky) the walls the eye sees stand in their own shade, as the place's do
  // (`wallShade`): the stone lifts them less, the lit face keeps its light.
  const litOwn = mixRgb(ground, mixRgb(ALBEDO, light.colour, 0.3), day * (0.5 + 0.38 * direct))
  const shadeOwn = mixRgb(ground, mixRgb(ALBEDO, rgbOf(light.palette.mid), 0.5), day * (0.42 + 0.08 * (1 - direct)) * (1 - 0.55 * shade))
  const shown = (km: number) => plainContrast(km, visibility) >= MIN_CONTRAST
  const tiers: CityTier[] = []
  geometry.tiers.forEach((tier, i) => {
    const km = farTownHazeAtTier(i)
    const blocks = tier.blocks.filter((b) => shown(b.km))
    const mass = tier.mass.map((step) => step.filter((m) => shown(m.km)))
    if (!blocks.length && !mass.some((step) => step.length)) return
    tiers.push({ km, lit: aerial(litOwn, km), shade: aerial(shadeOwn, km), mass: mass.map((boxes, k) => ({ alpha: MASS_ALPHA[k], boxes })),
      blocks })
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
    Math.round(againstLight(world) * 32),
    lights.length, Math.round(on * 64), Math.round(visibility * 4))
  return {
    kind: 'farCities', id: 'farCities', surface: 'land', z: Z, bounds,
    // The towns' shapes follow from the place, the text zones and the box; every colour and what the air keeps is light,
    // repainted alone while scrubbing (§1d), over an empty form.
    key: layerKey('farCities', world.keys.farCities, clear.map((b) => [b.x, b.y, b.w, b.h]), landBoxKey(box)),
    light: { key: lightKey, blend: 'source-over', tint: tiers[0]?.lit ?? litOwn, faces: [] },
    tiers, lateralLight, lights, lightRgb: LAMP, litFace: 0.55 * (1 - 0.7 * againstLight(world)),
  }
}
