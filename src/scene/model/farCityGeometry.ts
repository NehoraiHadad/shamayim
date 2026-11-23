import { hashId } from '../../data/landmarks/hash'
import { SCENE_W } from '../../world/sceneBox'
import type { FarCities, WorldState } from '../../world/types'
import { farFacadeDetail } from './buildingDetail'
import { receiverId } from './buildingMaterial'
import { farTownTier, TIER_KM } from './farTownHaze'
import type { Box, CityBlock, CityLight, SceneBox } from './types'

const hits = (clear: readonly Box[], x: number, y: number, w: number, h: number) =>
  clear.some((b) => x < b.x + b.w && x + w > b.x && y < b.y + b.h && y + h > b.y)

interface Geometry {
  /** By tier (index into `TIER_KM`): the town masses (by strength step) and blocks, each with its own distance. */
  tiers: { mass: (Box & { km: number; townId?: number })[][]; blocks: CityBlock[] }[]
  lights: (CityLight & { km: number })[]
  bounds: Box | null
}

/** The mass's strength by step (`world/farCities.ts`'s `MASS_FROM`): one fill each. */
export const MASS_ALPHA = [0.18, 0.32, 0.5, 0.68, 0.85]

const geometries = new WeakMap<FarCities, Map<string, Geometry>>()

/**
 * The world's town shapes (`townShapes`, at the reference width) in the box, by distance tier, out of the text zones,
 * with the layer's extent: every town and light it could show whatever the hour's air keeps, so it never moves.
 * Memoised per place and box.
 */
export function geometryOf(world: WorldState, box: SceneBox, clear: readonly Box[]): Geometry {
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
    tiers[farTownTier(b.km)].blocks.push({ x, base: b.base, w, h: b.h, km: b.km, receiver: receiverId(hashId(`${b.x}:${b.base}`)), detail: farFacadeDetail(w, b.h) })
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
