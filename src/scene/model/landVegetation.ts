//# allFunctionsCalledOnLoad
import { seasonalDrynessRange } from '../../data/land/climatology'
import { hashId, seeded } from '../../data/landmarks/hash'
import { koppenAt } from '../../data/land/koppenGrid'
import type { LivingLand } from '../../world/landLiving'
import { SCENE_W } from '../../world/sceneBox'
import { groundAt as lineAt } from '../../world/sceneLight'
import type { Plane, RGB, WorldState } from '../../world/types'
import { faceAtY, localFootY, type PlaneName } from './faceProjection'
import { groundBlocker, groundClearKey } from './groundClear'
import { addFieldParcel } from './vegAgriBuilders'
import { addForestCluster, addScrubOrGrass, addStrataBand, type BackgroundWeight, type BuildEnv } from './vegBuilders'
import { cropEvidence, cropEvidenceKey, probeCellCropEvidence } from './vegCropEvidence'
import { EMPTY_VEGETATION, packVegetation, vegBuffers } from './vegDescriptor'
import { projectedFootprints } from './vegFootprint'
import { addOrchardBlock, orchardDetail } from './vegOrchard'
import { classifyVegCell, mPerPxAt, solarMonthOf } from './vegRules'
import { buildVegPalette, sampleVegAtKm } from './vegSample'
import type { Box, PlaneVegetation, SceneBox } from './types'

/**
 * Builds and caches compact, structured-cloneable `PlaneVegetation` descriptors on the FORM layer
 * (Stage 4: living land). Driven strictly by `WorldState.land` (WorldCover + NDVI + dryness + season),
 * Köppen–Geiger climate, OSM orchard/palm evidence and camera perspective (`mPerPx`).
 * Independent per-cell PRNG streams ensure changes in one cell never perturb unrelated cells.
 */

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

/** Builds and memoises the light-free `PlaneVegetation` descriptor for one terrain plane. */
export function planeVegetationOf(
  world: WorldState, box: SceneBox, name: PlaneName, plane: Plane, medianLand: RGB, clear: readonly Box[],
): PlaneVegetation {
  if (name === 'back' || plane.points.length < 2) return EMPTY_VEGETATION
  let byKey = cache.get(world.land)
  if (!byKey) cache.set(world.land, byKey = new Map())
  const key = `${name}:${world.keys.terrain}:${cropEvidenceKey(world)}:${box.width}:${box.landHeight}:${groundClearKey(clear)}`
  const hit = byKey.get(key)
  if (hit) return hit

  const sx = box.width / SCENE_W
  const blocked = groundBlocker(box, clear)
  const seed = coordSeed(world.place.lat, world.place.lon, name)
  const koppen = koppenAt(world.place.lat, world.place.lon)
  const solarMonth = solarMonthOf(world.land.month, world.place.lat)
  const nRays = Math.max(1, world.land.rays.length - 1)
  const crestAt = (refX: number) => lineAt(plane.points, refX)
  const footAt = (refX: number) => localFootY(world, name, refX, crestAt(refX), box.landHeight)
  const groundAt = (x: number, y: number) => faceAtY(world, name, plane, x, crestAt(x), footAt(x), y)
  const scaleAtKm = (km: number) => mPerPxAt(km * 1000, world.camera)
  const evidenceAt = cropEvidence(world)
  let footprints: ReturnType<typeof projectedFootprints> | undefined
  const footprintsOf = () => footprints ??= projectedFootprints(world, name, plane, crestAt, footAt)
  const env: BuildEnv = {
    sx, horizonY: world.terrain.horizonY, koppen, solarMonth, crestAt, footAt,
    scaleAt: (x, y) => scaleAtKm(groundAt(x, y).km),
    farScale: (area) => {
      let farKm = 0
      footprintsOf()(area, () => true, (_area, _lo, hi) => { farKm = Math.max(farKm, hi); return true })
      return scaleAtKm(farKm)
    },
    fits: (area, accepts, mapped) => !blocked(area) && footprintsOf()(area, accepts, mapped),
  }
  const buf = vegBuffers()
  const cols = name === 'near' ? 12 : 10, colW = SCENE_W / cols
  const climate = { koppen, lat: world.place.lat, lon: world.place.lon }
  let drySum = 0, dryN = 0, elevSum = 0, grassDrySum = 0, grassNdviSum = 0, grassN = 0

  for (let c = 0; c < cols; c++) {
    const baseRefX = (c + 0.5) * colW
    if (name === 'far' && world.terrain.sightAt && !world.terrain.sightAt(baseRefX).farShows) continue
    const cy0 = crestAt(baseRefX), fy0 = footAt(baseRefX), spanY0 = fy0 - cy0
    if (spanY0 < 4) continue
    const colRows = name === 'far' ? (spanY0 < 16 ? 1 : 2) : spanY0 < 24 ? 2 : spanY0 >= 56 ? 4 : 3
    for (let r = 0; r < colRows; r++) {
      const rand = seeded(cellSeed(seed, c, r))
      const fTop = r / colRows, fBot = (r + 1) / colRows
      const refX = (c + 0.5 + (rand() - 0.5) * 0.22) * colW
      const cy = crestAt(refX), fy = footAt(refX), spanY = fy - cy
      if (spanY < 4) continue
      const yTop = cy + 1.5 + fTop * (spanY - 2), yBot = cy + 1.5 + fBot * (spanY - 2), yMid = (yTop + yBot) * 0.5
      const { km, slope } = faceAtY(world, name, plane, refX, cy, fy, yMid)
      const cell = sampleVegAtKm(world.land, (refX / SCENE_W) * nRays, km)
      drySum += cell.dryness; elevSum += cell.elevationM; dryN++
      if (cell.cover === 3) { grassDrySum += cell.dryness; grassNdviSum += cell.ndvi; grassN++ }

      const mPerPx = scaleAtKm(km)
      const evidence = cell.cover === 1 || cell.cover === 4 ? evidenceAt(refX, km) : undefined
      const crop = evidence ? { evidence, sample: cell, x: refX, km, slope }
        : probeCellCropEvidence(world, name, plane, evidenceAt, crestAt, footAt, refX, colW, yTop, yBot, nRays)
      let weight: BackgroundWeight | undefined
      if (crop) {
        const { kind, contains } = crop.evidence
        const detailScale = scaleAtKm(crop.km)
        const detail = classifyVegCell({ ...crop.sample, ...climate, mappedCrop: kind })
        const detailRand = seeded(cellSeed(seed ^ 0x9e3779b9, c, r))
        const before = buf.rows.length + buf.trees.length + buf.fields.length
        if (detail.orchard) {
          addOrchardBlock(buf, env, detailRand, crop.x, yTop, yBot, colW * 0.94, detailScale,
            detail.orchard, detail.density, contains, crop.slope)
        } else if (kind === 'vineyard' && crop.sample.cover === 1) {
          addFieldParcel(buf, env, detailRand, crop.x, yTop, yBot, colW * 0.58, detailScale,
            crop.sample.ndvi, crop.sample.dryness, 1, contains)
        }
        if (buf.rows.length + buf.trees.length + buf.fields.length > before) {
          const fade = kind === 'vineyard' ? 1 : orchardDetail(detailScale)
          weight = (area) => footprintsOf()(area, () => true, contains) ? 1 - fade : 1
        }
      }
      // Classify the background independently. Only footprints inside a rendered crop crossfade.
      const res = classifyVegCell({ ...cell, ...climate })
      const cellH = Math.max(4, yBot - yTop)
      if (res.veg === 'crop') {
        addFieldParcel(buf, env, rand, refX, yTop, yBot, colW * 0.58, mPerPx, cell.ndvi, cell.dryness, 4, undefined, weight)
      } else if (res.veg === 'forest') {
        addForestCluster(buf, env, rand, refX, yMid, colW, cellH, mPerPx, res.density, weight)
      } else if (res.veg === 'shrub' || res.veg === 'grass') {
        addScrubOrGrass(buf, env, rand, refX, yMid, colW, cellH, mPerPx, res.veg === 'grass', cell.cover, res.density)
      } else if (res.veg === 'bare' && rand() < 0.72) {
        addStrataBand(buf, env, rand, refX, yMid, colW * (1.3 + 1.0 * rand()), mPerPx)
      }
    }
  }

  const meanDry = dryN > 0 ? drySum / dryN : world.land.own.dryness
  const minClimateDry = seasonalDrynessRange(world.place.lat, world.place.lon, dryN > 0 ? elevSum / dryN : 0).min
  const tones = buildVegPalette(medianLand, meanDry, {
    grassDryness: grassN > 0 ? grassDrySum / grassN : meanDry,
    minClimateDry,
    grassNdvi: grassN > 0 ? grassNdviSum / grassN : undefined,
  })
  const out = packVegetation(buf, seed, tones)
  if (byKey.size > 12) byKey.clear()
  byKey.set(key, out)
  return out
}
