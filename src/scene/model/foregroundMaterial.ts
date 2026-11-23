import { anglePx } from '../../data/terrain/angleScale'
import { apparentAngle, RAY_DISTANCES } from '../../data/terrain/panorama'
import { albedoAtGround, FOREGROUND_M } from '../../world/foregroundAlbedo'
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

/** Use the local DEM inside the first panorama ring. Match the panorama at the ring itself. */
function foregroundProfile(world: WorldState, x: number, east: number, north: number) {
  const firstHeight = world.terrain.groundAt?.(x, FIRST_KM)
  if (firstHeight == null || !Number.isFinite(firstHeight)) return []
  const yAt = (height: number, km: number) => world.terrain.horizonY - anglePx(apparentAngle(height, km, 0))
  const profile = [{ km: FIRST_KM, y: yAt(firstHeight, FIRST_KM) }]
  const local = world.flightTerrain
  if (!local) return profile
  // Sample the inner ring halfway to the eye, then bisect once more to cover the bottom of the sheet.
  for (const km of [FIRST_KM / 2, FIRST_KM / 4]) {
    const h = local.heightAt(km * east, km * north)
    if (h == null || !Number.isFinite(h)) continue
    const y = yAt(h - local.eyeM, km)
    if (y > profile.at(-1)!.y) profile.push({ km, y })
  }
  return profile
}

function projectedRange(profile: ReturnType<typeof foregroundProfile>, y: number, km: number) {
  if (!profile.length || y < profile[0].y) return km
  for (let i = 1; i < profile.length; i++) {
    const a = profile[i - 1], b = profile[i]
    if (y <= b.y) {
      // A planar segment projects linearly in reciprocal depth in the local screen interval.
      const t = (y - a.y) / (b.y - a.y)
      return 1 / ((1 - t) / a.km + t / b.km)
    }
  }
  return profile.at(-1)!.km
}

/** Project the local raster independently of the atmospheric and terrain-normal grids. */
export function foregroundMaterialOf(world: WorldState, geom: PlaneGeomGrid) {
  const field = world.land.foreground
  if (!field || !world.terrain.groundAt) return undefined
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
      const weight = foregroundShare(km[i])
      if (weight < 0.5 / 255) continue
      const distance = projectedRange(profile, y, km[i])
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
