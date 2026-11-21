//# allFunctionsCalledOnLoad
import { hashId, seeded } from '../../data/landmarks/hash'
import { koppenAt } from '../../data/land/koppenGrid'
import type { LivingLand } from '../../world/landLiving'
import { SCENE_W } from '../../world/sceneBox'
import { groundAt as lineAt } from '../../world/sceneLight'
import type { Plane, RGB, WorldState } from '../../world/types'
import { faceAtY, localFootY, type PlaneName } from './faceProjection'
import { addFieldParcel, addOrchardBlock } from './vegAgriBuilders'
import { addForestCluster, addScrubOrGrass, addStrataBand, type BuildEnv, type VegBuffers } from './vegBuilders'
import { classifyVegCell, mPerPxAt, solarMonthOf } from './vegRules'
import { buildVegPalette, sampleCoverAtKm, sampleVegAtKm } from './vegSample'
import type { Box, PlaneVegetation, SceneBox } from './types'

/**
 * Builds and caches compact, structured-cloneable `PlaneVegetation` descriptors on the FORM layer
 * (Stage 4: living land). Driven strictly by `WorldState.land` (WorldCover + NDVI + dryness + season),
 * Köppen–Geiger climate, OSM orchard/palm evidence and camera perspective (`mPerPx`).
 * Independent per-cell PRNG streams ensure changes in one cell never perturb unrelated cells.
 */

export const EMPTY_VEGETATION: PlaneVegetation = {
  seed: 0,
  trees: new Float32Array(0), treeMeta: new Uint8Array(0),
  fields: new Float32Array(0), fieldMeta: new Uint8Array(0),
  rows: new Float32Array(0), rowMeta: new Uint8Array(0),
  tufts: new Float32Array(0), tuftMeta: new Uint8Array(0),
  strata: new Float32Array(0), strataMeta: new Uint8Array(0),
  tones: [],
}

/** Total typed-array byte footprint of a `PlaneVegetation` descriptor (guaranteed < 10 KB). */
export function vegByteLength(v: PlaneVegetation): number {
  return v.trees.byteLength + v.treeMeta.byteLength + v.fields.byteLength + v.fieldMeta.byteLength
    + v.rows.byteLength + v.rowMeta.byteLength + v.tufts.byteLength + v.tuftMeta.byteLength
    + v.strata.byteLength + v.strataMeta.byteLength
}

const cache = new WeakMap<LivingLand, Map<string, PlaneVegetation>>()

/** Coordinate-derived seed (10 m precision) so renaming place metadata never alters vegetation. */
const coordSeed = (lat: number, lon: number, name: PlaneName) =>
  hashId(`veg:${Math.round(lat * 10000)}:${Math.round(lon * 10000)}:${name}`)

/** Independent per-cell 32-bit hash seed so changing one cell's cover never shifts unrelated cells' placement. */
function cellSeed(seed: number, c: number, r: number): number {
  let h = Math.imul((seed ^ Math.imul(c + 1, 374761393) ^ Math.imul(r + 1, 668265263)) | 0, 1274126177)
  h = Math.imul(h ^ (h >>> 13), 1103515245)
  return (h ^ (h >>> 16)) >>> 0
}

/** Sorts packed stride-6 `trees` and stride-3 `treeMeta` back-to-front by screen `y` for natural overlap. */
function sortTreesByY(trees: number[], meta: number[]): { trees: Float32Array; treeMeta: Uint8Array } {
  const n = trees.length / 6
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => trees[a * 6 + 1] - trees[b * 6 + 1])
  const outT = new Float32Array(trees.length), outM = new Uint8Array(meta.length)
  for (let i = 0; i < n; i++) {
    const s = order[i]
    for (let k = 0; k < 6; k++) outT[i * 6 + k] = trees[s * 6 + k]
    outM[i * 3] = meta[s * 3]; outM[i * 3 + 1] = meta[s * 3 + 1]; outM[i * 3 + 2] = meta[s * 3 + 2]
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
  const key = `${name}:${world.keys.terrain}:${world.keys.marks}:${box.width}:${box.landHeight}:${clearSig}`
  const hit = byKey.get(key)
  if (hit) return hit

  const sx = box.width / SCENE_W
  const zones = clear.map((b) => ({ x0: b.x / sx - 2, x1: (b.x + b.w) / sx + 2, y0: b.y - 2, y1: b.y + b.h + 2 }))
  const blocked = (refX: number, y: number, r: number) => y > box.landHeight - 0.5
    || zones.some((z) => refX + r > z.x0 && refX - r < z.x1 && y + r > z.y0 && y - r < z.y1)
  const blockedBox = (x0: number, y0: number, x1: number, y1: number) => y1 > box.landHeight - 0.5
    || zones.some((z) => x1 > z.x0 && x0 < z.x1 && y1 > z.y0 && y0 < z.y1)
  const seed = coordSeed(world.place.lat, world.place.lon, name)
  const koppen = koppenAt(world.place.lat, world.place.lon)
  const solarMonth = solarMonthOf(world.land.month, world.place.lat)
  const nRays = Math.max(1, world.land.rays.length - 1)
  const crestAt = (refX: number) => lineAt(plane.points, refX)
  const footAt = (refX: number) => localFootY(world, name, refX, crestAt(refX), box.landHeight)
  const coverAt = (refX: number, y: number) => sampleCoverAtKm(world.land, (refX / SCENE_W) * nRays, faceAtY(world, name, plane, refX, crestAt(refX), footAt(refX), y).km)
  const orchardXs = name === 'near'
    ? world.marks.filter((m) => m.plane === 'near' && (m.kind === 'orchard' || m.kind === 'vineyard' || m.kind === 'palms')).map((m) => m.x / sx)
    : []

  const env: BuildEnv = {
    sx, width: box.width, landHeight: box.landHeight, horizonY: world.terrain.horizonY,
    koppen, solarMonth, crestAt, footAt, coverAt, blocked, blockedBox,
  }
  const buf: VegBuffers = { trees: [], treeMeta: [], fields: [], fieldMeta: [], rows: [], rowMeta: [], tufts: [], tuftMeta: [], strata: [], strataMeta: [] }
  const cols = name === 'near' ? 12 : 10, colW = SCENE_W / cols
  let drySum = 0, dryN = 0

  for (let c = 0; c < cols; c++) {
    const baseRefX = (c + 0.5) * colW
    if (name === 'far' && world.terrain.sightAt && !world.terrain.sightAt(baseRefX).farShows) continue
    const cy0 = crestAt(baseRefX), fy0 = footAt(baseRefX), spanY0 = fy0 - cy0
    if (spanY0 < 4) continue
    const colRows = name === 'far' ? (spanY0 < 16 ? 1 : 2) : spanY0 < 24 ? 2 : 3
    for (let r = 0; r < colRows; r++) {
      const rand = seeded(cellSeed(seed, c, r))
      const fTop = r / colRows, fBot = (r + 1) / colRows
      const refX = (c + 0.5 + (rand() - 0.5) * 0.22) * colW
      const cy = crestAt(refX), fy = footAt(refX), spanY = fy - cy
      if (spanY < 4) continue
      const yTop = cy + 1.5 + fTop * (spanY - 2), yBot = cy + 1.5 + fBot * (spanY - 2), yMid = (yTop + yBot) * 0.5
      const { km, slope } = faceAtY(world, name, plane, refX, cy, fy, yMid)
      const cell = sampleVegAtKm(world.land, (refX / SCENE_W) * nRays, km)
      drySum += cell.dryness; dryN++

      const mPerPx = mPerPxAt(km * 1000, world.camera)
      const hasOrchardEvidence = orchardXs.some((ox) => Math.abs(ox - refX) <= 42)
      const res = classifyVegCell({
        cover: cell.cover, ndvi: cell.ndvi, dryness: cell.dryness, slope, koppen,
        lat: world.place.lat, lon: world.place.lon, elevationM: cell.elevationM,
        mPerPx, hasOrchardEvidence,
      })

      const cellH = Math.max(4, yBot - yTop)
      if (res.veg === 'crop') addFieldParcel(buf, env, rand, refX, yTop, yBot, colW * (0.50 + 0.16 * rand()), mPerPx, cell.ndvi, cell.dryness)
      else if (res.veg === 'orchard' && res.orchard) addOrchardBlock(buf, env, rand, refX, yTop, yBot, colW * 0.94, mPerPx, res.orchard, res.density)
      else if (res.veg === 'forest') addForestCluster(buf, env, rand, refX, yMid, colW, cellH, mPerPx, res.density)
      else if (res.veg === 'shrub' || res.veg === 'grass') addScrubOrGrass(buf, env, rand, refX, yMid, colW, cellH, mPerPx, res.veg === 'grass', cell.cover, res.density)
      else if (res.veg === 'bare' && rand() < 0.72) addStrataBand(buf, env, rand, refX, yMid, colW * (1.3 + 1.0 * rand()), mPerPx)
    }
  }

  const sorted = sortTreesByY(buf.trees, buf.treeMeta)
  const out: PlaneVegetation = {
    seed,
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
