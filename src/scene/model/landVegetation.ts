//# allFunctionsCalledOnLoad
import { hashId, seeded } from '../../data/landmarks/hash'
import { koppenAt } from '../../data/land/koppenGrid'
import type { LivingLand } from '../../world/landLiving'
import { SCENE_W } from '../../world/sceneBox'
import { groundAt as lineAt } from '../../world/sceneLight'
import type { Plane, RGB, WorldState } from '../../world/types'
import {
  addFieldParcel, addForestCluster, addOrchardBlock, addScrubOrGrass, addStrataBand,
  type BuildEnv, type VegBuffers,
} from './vegBuilders'
import { classifyVegCell, mPerPxAt, solarMonthOf } from './vegRules'
import { buildVegPalette, faceAtY, localFootY, sampleCellAtKm, type PlaneName } from './vegSample'
import type { Box, PlaneVegetation, SceneBox } from './types'

/**
 * Builds and caches compact, structured-cloneable `PlaneVegetation` descriptors on the FORM layer
 * (Stage 4: living land). Driven strictly by `WorldState.land` (WorldCover + NDVI + dryness + season),
 * Köppen–Geiger climate and camera perspective (`mPerPx`). Never reads place names or hour/light/wind.
 */

export const EMPTY_VEGETATION: PlaneVegetation = {
  seed: 0, horizonY: 64,
  trees: new Float32Array(0), treeMeta: new Uint8Array(0),
  fields: new Float32Array(0), fieldMeta: new Uint8Array(0),
  rows: new Float32Array(0), rowMeta: new Uint8Array(0),
  tufts: new Float32Array(0), tuftMeta: new Uint8Array(0),
  strata: new Float32Array(0), strataMeta: new Uint8Array(0),
  tones: [],
}

const cache = new WeakMap<LivingLand, Map<string, PlaneVegetation>>()

/** Coordinate-derived seed (10 m precision) so renaming `place.id`/`nameHe`/`regionHe` never alters vegetation. */
function coordSeed(lat: number, lon: number, name: PlaneName): number {
  return hashId(`veg:${Math.round(lat * 10000)}:${Math.round(lon * 10000)}:${name}`)
}

/** Sorts packed stride-6 `trees` and stride-2 `treeMeta` back-to-front by screen `y` for natural overlap. */
function sortTreesByY(trees: number[], meta: number[]): { trees: Float32Array; treeMeta: Uint8Array } {
  const n = trees.length / 6
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => trees[a * 6 + 1] - trees[b * 6 + 1])
  const outT = new Float32Array(trees.length), outM = new Uint8Array(meta.length)
  for (let i = 0; i < n; i++) {
    const s = order[i]
    for (let k = 0; k < 6; k++) outT[i * 6 + k] = trees[s * 6 + k]
    outM[i * 2] = meta[s * 2]; outM[i * 2 + 1] = meta[s * 2 + 1]
  }
  return { trees: outT, treeMeta: outM }
}

/** Builds and memoises the light-free `PlaneVegetation` descriptor for one terrain plane. */
export function planeVegetationOf(
  world: WorldState, box: SceneBox, name: PlaneName, plane: Plane, medianLand: RGB, clear: readonly Box[],
): PlaneVegetation {
  if (name === 'back' || plane.points.length < 2) return EMPTY_VEGETATION
  let byKey = cache.get(world.land)
  if (!byKey) cache.set(world.land, byKey = new Map())
  const clearSig = clear.map((b) => `${Math.round(b.x)},${Math.round(b.y)},${Math.round(b.w)},${Math.round(b.h)}`).join(';')
  const key = `${name}:${world.keys.terrain}:${box.width}:${box.landHeight}:${clearSig}`
  const hit = byKey.get(key)
  if (hit) return hit

  const sx = box.width / SCENE_W
  const zones = clear.map((b) => ({ x0: b.x / sx - 2, x1: (b.x + b.w) / sx + 2, y0: b.y - 2, y1: b.y + b.h + 2 }))
  const blocked = (refX: number, y: number, r: number) => y > box.landHeight - 0.5
    || zones.some((z) => refX + r > z.x0 && refX - r < z.x1 && y + r > z.y0 && y - r < z.y1)
  const seed = coordSeed(world.place.lat, world.place.lon, name)
  const rand = seeded(seed)
  const koppen = koppenAt(world.place.lat, world.place.lon)
  const solarMonth = solarMonthOf(world.land.month, world.place.lat)
  const nRays = Math.max(1, world.land.rays.length - 1)
  const crestAt = (refX: number) => lineAt(plane.points, refX)
  const footAt = (refX: number) => localFootY(world, name, refX, crestAt(refX), box.landHeight)
  const env: BuildEnv = {
    sx, width: box.width, landHeight: box.landHeight, horizonY: world.terrain.horizonY,
    koppen, solarMonth, crestAt, footAt, blocked, rand,
  }
  const buf: VegBuffers = { trees: [], treeMeta: [], fields: [], fieldMeta: [], rows: [], rowMeta: [], tufts: [], tuftMeta: [], strata: [], strataMeta: [] }

  // Sample a perspective-spaced grid across the visible plane face (adaptive row count for narrow valley floors).
  const cols = name === 'near' ? 14 : 10
  const colW = SCENE_W / cols
  let drySum = 0, dryN = 0

  for (let c = 0; c < cols; c++) {
    const baseRefX = (c + 0.5) * colW
    if (name === 'far' && world.terrain.sightAt && !world.terrain.sightAt(baseRefX).farShows) continue
    const cy0 = crestAt(baseRefX), fy0 = footAt(baseRefX), spanY0 = fy0 - cy0
    if (spanY0 < 4) continue
    const colRows = name === 'far' ? (spanY0 < 16 ? 1 : 2) : spanY0 < 24 ? 2 : spanY0 < 42 ? 3 : 4
    for (let r = 0; r < colRows; r++) {
      const fTop = r / colRows, fBot = (r + 1) / colRows
      const refX = (c + 0.5 + (rand() - 0.5) * 0.22) * colW
      const cy = crestAt(refX), fy = footAt(refX), spanY = fy - cy
      if (spanY < 4) continue
      const yTop = cy + 1.5 + fTop * (spanY - 2)
      const yBot = cy + 1.5 + fBot * (spanY - 2)
      const yMid = (yTop + yBot) * 0.5
      const { km, slope } = faceAtY(world, name, plane, refX, cy, fy, yMid)
      const rayPos = (refX / SCENE_W) * nRays
      const cell = sampleCellAtKm(world.land, rayPos, km)
      const leftC = sampleCellAtKm(world.land, Math.max(0, rayPos - 1.5), km).cover
      const rightC = sampleCellAtKm(world.land, Math.min(nRays, rayPos + 1.5), km).cover
      drySum += cell.dryness; dryN++

      const mPerPx = mPerPxAt(km * 1000, world.camera)
      const res = classifyVegCell({
        cover: cell.cover, ndvi: cell.ndvi, dryness: cell.dryness, slope, koppen,
        lat: world.place.lat, lon: world.place.lon, elevationM: cell.elevationM,
        mPerPx, nearCrop: leftC === 4 || rightC === 4, cellHash: rand(),
      })

      if (res.veg === 'crop') {
        addFieldParcel(buf, env, refX, yTop, yBot, colW * (0.50 + 0.16 * rand()), mPerPx, cell.ndvi, cell.dryness)
      } else if (res.veg === 'orchard' && res.orchard) {
        addOrchardBlock(buf, env, refX, yTop, yBot, colW * 0.94, km, mPerPx, res.orchard, res.density)
      } else if (res.veg === 'forest') {
        addForestCluster(buf, env, refX, yMid, km, mPerPx, res.density)
      } else if (res.veg === 'shrub' || res.veg === 'grass') {
        addScrubOrGrass(buf, env, refX, yMid, km, mPerPx, res.veg === 'grass', res.density)
      } else if (res.veg === 'bare' && rand() < 0.72) {
        addStrataBand(buf, env, refX, yMid, colW * (1.3 + 1.0 * rand()), mPerPx)
      }
    }
  }

  const sorted = sortTreesByY(buf.trees, buf.treeMeta)
  const out: PlaneVegetation = {
    seed, horizonY: world.terrain.horizonY,
    trees: sorted.trees, treeMeta: sorted.treeMeta,
    fields: new Float32Array(buf.fields), fieldMeta: new Uint8Array(buf.fieldMeta),
    rows: new Float32Array(buf.rows), rowMeta: new Uint8Array(buf.rowMeta),
    tufts: new Float32Array(buf.tufts), tuftMeta: new Uint8Array(buf.tuftMeta),
    strata: new Float32Array(buf.strata), strataMeta: new Uint8Array(buf.strataMeta),
    tones: buildVegPalette(medianLand, dryN > 0 ? drySum / dryN : world.land.own.dryness),
  }
  if (byKey.size > 12) byKey.clear()
  byKey.set(key, out)
  return out
}
