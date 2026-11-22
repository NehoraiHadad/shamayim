//# allFunctionsCalledOnLoad
import { horizonSlope } from '../../data/terrain/angleScale'
import { azimuthAt, spanDeg } from '../../domain/camera'
import { SCENE_W } from '../../world/sceneBox'
import { groundAt as lineAt } from '../../world/sceneLight'
import type { Plane, TerrainPlanes, WorldState } from '../../world/types'
import { faceAtY, localFootY, type PlaneName } from './faceProjection'
import { layerKey } from './keys'
import { surfaceNormal } from './landRadiance'

/**
 * Cached terrain-only 3D geometry grid per plane (Stage 7 round 2):
 * computes true DEM across slope (m/m from `groundAt(x ± dx, km)` divided by real horizontal arc metres),
 * true radial ahead slope (m/m from `faceAtY`, using the first measured slope at the crest), exact face
 * distance `km`, and per-column compass bearing across the ~250° turning panorama. Memoised per `world.terrain`.
 */
export interface PlaneGeomGrid {
  cols: number
  rows: number
  xs: Float32Array
  crestY: Float32Array
  footY: Float32Array
  bearing: Float32Array
  nx: Float32Array
  ny: Float32Array
  nz: Float32Array
  km: Float32Array
  /** Stable revision key of sampled crest points, measured DEM slopes, face distances and haze distances. */
  geomKey: string
}

const GRID_SPEC: Record<PlaneName, { cols: number; rows: number }> = {
  near: { cols: 49, rows: 8 },
  far: { cols: 49, rows: 4 },
  back: { cols: 33, rows: 2 },
}

const RAD = Math.PI / 180
const DX_DEM = 1.5
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
const geomCache = new WeakMap<TerrainPlanes, Map<string, PlaneGeomGrid>>()

/**
 * True DEM across slope `∂z / ∂across` in m/m at `(x, km)`. Uses `terrain.groundAt(x ± dx, km)` over the real
 * horizontal arc `2 · km · 1000 · dTheta`; falls back to crest angular derivative when DEM heights are absent.
 */
function demAcrossSlope(
  terrain: TerrainPlanes, x: number, km: number, radPerPx: number, fallbackSlope: number,
): number {
  const groundAt = terrain.groundAt
  if (groundAt && km > 0.05) {
    const xL = Math.max(0, x - DX_DEM), xR = Math.min(SCENE_W, x + DX_DEM)
    const spanPx = xR - xL
    if (spanPx > 0.5) {
      const hL = groundAt(xL, km), hR = groundAt(xR, km)
      if (hL !== null && hR !== null && Number.isFinite(hL) && Number.isFinite(hR)) {
        const arcM = Math.max(10, km * 1000 * spanPx * radPerPx)
        return clamp((hR - hL) / arcM, -1.8, 1.8)
      }
    }
  }
  return clamp(fallbackSlope, -1.8, 1.8)
}

/** Builds and caches the terrain-only 3D normal, distance and bearing grid for one plane. */
export function planeGeomOf(world: WorldState, name: PlaneName, plane: Plane, landHeight: number): PlaneGeomGrid {
  let byKey = geomCache.get(world.terrain)
  if (!byKey) geomCache.set(world.terrain, byKey = new Map())
  const cam = world.camera
  const cacheKey = `${name}:${landHeight}:${cam.heading}:${cam.handed}:${cam.pxPerDeg}`
  const hit = byKey.get(cacheKey)
  if (hit) return hit

  const { cols, rows } = GRID_SPEC[name]
  const n = cols * rows
  const xs = new Float32Array(cols), crestY = new Float32Array(cols), footY = new Float32Array(cols), bearing = new Float32Array(cols)
  const nx = new Float32Array(n), ny = new Float32Array(n), nz = new Float32Array(n), km = new Float32Array(n)
  const radPerPx = (spanDeg(cam) * RAD) / SCENE_W
  const pxPerRadY = horizonSlope() / RAD

  for (let c = 0; c < cols; c++) {
    const frac = cols > 1 ? c / (cols - 1) : 0.5
    const x = frac * SCENE_W
    const cy = lineAt(plane.points, x), fy = localFootY(world, name, x, cy, landHeight)
    xs[c] = x; crestY[c] = cy; footY[c] = fy
    bearing[c] = azimuthAt(frac, cam)
    const xL = Math.max(0, x - DX_DEM), xR = Math.min(SCENE_W, x + DX_DEM)
    const dAngleRad = (lineAt(plane.points, xL) - lineAt(plane.points, xR)) / Math.max(1, pxPerRadY)
    const fallbackAcross = dAngleRad / Math.max(1e-5, (xR - xL) * radPerPx)

    for (let r = 0; r < rows; r++) {
      const rowFrac = rows > 1 ? r / (rows - 1) : 0
      const targetY = cy + rowFrac * Math.max(0, fy - cy)
      const sample = faceAtY(world, name, plane, x, cy, fy, targetY)
      const across = demAcrossSlope(world.terrain, x, sample.km, radPerPx, fallbackAcross)
      const [ux, uy, uz] = surfaceNormal(across, sample.slope)
      const idx = r * cols + c
      nx[idx] = ux; ny[idx] = uy; nz[idx] = uz; km[idx] = sample.km

    }
  }
  // Hash every packed sample plus the profiles read independently by palettes and vegetation.
  const inputs = [plane.points, plane.distanceKm, world.terrain.near.points,
    name === 'back' ? null : world.terrain.faces[name]?.columns,
    Array.from(xs, (x) => world.terrain.sightAt?.(x).farShows),
    ...[crestY, footY, bearing, nx, ny, nz, km].map((array) => Array.from(array))]
  const grid: PlaneGeomGrid = { cols, rows, xs, crestY, footY, bearing, nx, ny, nz, km, geomKey: layerKey(name, JSON.stringify(inputs)) }
  if (byKey.size > 12) byKey.clear()
  byKey.set(cacheKey, grid)
  return grid
}
