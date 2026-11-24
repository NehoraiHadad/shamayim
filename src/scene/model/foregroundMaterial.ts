import { anglePx, RELIEF, SKY_PX } from '../../data/terrain/angleScale'
import { EYE_M, RAY_DISTANCES } from '../../data/terrain/panorama'
import { albedoAtGround, FOREGROUND_M } from '../../world/foregroundAlbedo'
import { curveDrop } from '../../world/flightTerrain'
import { foregroundOf } from '../../world/landLiving'
import type { WorldState } from '../../world/types'
import { byteKey } from './keys'
import type { PlaneGeomGrid } from './planeGeometry'

const METRES_PER_KM = 1000
const RAD = Math.PI / 180
const FIRST_KM = RAY_DISTANCES[0]
const REACH_KM = FOREGROUND_M / METRES_PER_KM
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const fade = (t: number) => t * t * (3 - 2 * t)

export interface ForegroundMaterial {
  cols: number
  rows: number
  /** Encoded BOA colour and the foreground share per projected sample. */
  rgba: Uint8Array
  /** The legacy face range, shared with the unchanged lighting grid. */
  rangeKm: Float32Array
}

export function foregroundShare(km: number) {
  return fade(clamp01((REACH_KM - km) / (REACH_KM - FIRST_KM)))
}

interface GroundKnot { km: number; height: number }

/** Join the first panorama ring to the eye's ground through the local DEM. */
export function foregroundProfile(world: WorldState, x: number, east: number, north: number): GroundKnot[] {
  const groundAt = world.terrain.groundAt
  const firstHeight = groundAt?.(x, FIRST_KM)
  if (firstHeight == null || !Number.isFinite(firstHeight)) return []
  const local = world.flightTerrain
  const profile = [{ km: 0, height: -EYE_M }]
  const first = firstHeight - curveDrop(FIRST_KM)
  // Subdivide the 400 m gap into 100 m pieces, the same radial spacing
  // used by the panorama just beyond it. The final piece joins the two DEMs.
  if (local) {
    for (let i = 1; i < 4; i++) {
      const km = (FIRST_KM / 4) * i
      const h = local.heightAt(km * east, km * north)
      if (h != null && Number.isFinite(h)) profile.push({ km, height: h - local.eyeM - curveDrop(km) })
    }
  }
  profile.push({ km: FIRST_KM, height: first })
  // Continue through the fade band with the interpolated panorama DEM.
  // The material uses one continuous bearing even between legacy face columns.
  for (let i = 1; Math.round(RAY_DISTANCES[i] * METRES_PER_KM) <= FOREGROUND_M; i++) {
    const km = RAY_DISTANCES[i]
    const h = groundAt?.(x, km)
    if (h != null && Number.isFinite(h)) profile.push({ km, height: h - curveDrop(km) })
  }
  return profile
}

// A quarter degree is a quarter of the narrowest relief scale in RELIEFS.
const SAMPLES_PER_DEG = 4
let reliefTable: Float64Array | undefined

/** Invert the same monotone relief mapping used to draw the DEM. */
export function groundSightSlope(horizonY: number, y: number) {
  const target = horizonY - y
  if (target <= -SKY_PX - RELIEF.px) return -Infinity
  if (target >= SKY_PX + RELIEF.px) return Infinity
  reliefTable ??= Float64Array.from({ length: 180 * SAMPLES_PER_DEG + 1 }, (_, i) => anglePx(i / SAMPLES_PER_DEG - 90))
  let lo = 0, hi = reliefTable.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >>> 1
    if (reliefTable[mid] < target) lo = mid
    else hi = mid
  }
  const t = (target - reliefTable[lo]) / (reliefTable[hi] - reliefTable[lo])
  return METRES_PER_KM * Math.tan(((lo + t) / SAMPLES_PER_DEG - 90) * RAD)
}

export function projectedRange(profile: readonly GroundKnot[], slope: number, km: number) {
  if (!profile.length) return km
  if (slope === -Infinity) return 0
  if (slope === Infinity) return km
  // The first intersection is visible. Solve height = slope × range on each DEM segment.
  for (let i = 1; i < profile.length; i++) {
    const a = profile[i - 1], b = profile[i]
    const end = b.height - slope * b.km
    if (end >= 0) {
      const start = a.height - slope * a.km
      return a.km + (b.km - a.km) * (-start / (end - start))
    }
  }
  return km
}

/** Project the local raster independently of the atmospheric and terrain-normal grids. */
export function foregroundMaterialOf(world: WorldState, geom: PlaneGeomGrid) {
  if (!world.terrain.groundAt) return undefined
  const lastRow = geom.km.subarray((geom.rows - 1) * geom.cols)
  if (!lastRow.some(km => foregroundShare(km) >= 0.5 / 255)) return undefined
  const field = foregroundOf(world.land)
  if (!field) return undefined
  const { cols, rows, xs, crestY, footY, bearing, km } = geom
  const rgba = new Uint8Array(cols * rows * 4)
  let changed = false
  for (let c = 0; c < cols; c++) {
    if (km[(rows - 1) * cols + c] >= REACH_KM) continue
    const east = Math.sin(bearing[c] * RAD), north = Math.cos(bearing[c] * RAD)
    const profile = foregroundProfile(world, xs[c], east, north)
    for (let r = 0; r < rows; r++) {
      const i = r * cols + c
      const y = crestY[c] + Math.max(0, footY[c] - crestY[c]) * r / (rows - 1)
      // Full field at the first DEM ring. Ease to the original material by 700 m.
      const legacyWeight = foregroundShare(km[i])
      if (legacyWeight < 0.5 / 255) continue
      const distance = projectedRange(profile, groundSightSlope(world.terrain.horizonY, y), km[i])
      const weight = Math.min(legacyWeight, foregroundShare(distance))
      if (weight < 0.5 / 255) continue
      const hit = albedoAtGround(field, distance * METRES_PER_KM * east, distance * METRES_PER_KM * north)
      if (!hit) continue
      const share = Math.round(weight * hit.dryShare * 255)
      if (!share) continue
      const { rgb } = hit
      for (let k = 0; k < 3; k++) rgba[i * 4 + k] = Math.round(rgb[k] * 255)
      rgba[i * 4 + 3] = share
      changed = true
    }
  }
  if (changed) return { field: { cols, rows, rgba, rangeKm: km }, key: byteKey(rgba) }
}
