import { projectSight, type Coordinate, type Sight } from '../landmarks/project'
import { azimuthAt, destination } from '../terrain/panorama'
import { FAR_RADIUS_KM, RIDGE_WIDTH } from '../terrain/ridgeProjection'
import { plainPatches, type PlainPatch, type PlainTerrain } from './plainData'
import { COLUMN_WIDTH } from './columns'
import { decodeFarRuns, FAR_COLS, FAR_LAT_STEP, FAR_LON_STEP, FAR_ROWS, FAR_SOUTH, FAR_WEST,
  type FarFile, type FarTower } from './farGrid'

export type FarData = { grid: Uint8Array; towers: FarTower[] }
export type FarColumn = { left: number; right: number; built: number; heightClass: number }

type FarTowerPlacement = { x: number; heightM: number; y?: number; km?: number }
export type FarScene = { columns: FarColumn[]; towers: FarTowerPlacement[]; patches?: PlainPatch[] }

let request: Promise<FarData | null> | undefined

export function loadFar(): Promise<FarData | null> {
  return request ??= fetch(`${import.meta.env.BASE_URL}data/city/il/far.json`).then(async response => {
    if (!response.ok) throw new Error(`Far city HTTP ${response.status}`)
    const file = await response.json() as FarFile
    if (file.v !== 1 || typeof file.r !== 'string' || !Array.isArray(file.t) ||
      !file.t.every(tower => Array.isArray(tower) && tower.length === 3 &&
        tower.every(Number.isFinite) && tower[2] >= 80)) throw new Error('Invalid far city data')
    return { grid: decodeFarRuns(file.r), towers: file.t }
  }).catch(() => {
    // Allow a future mount to recover after a transient failure.
    request = undefined
    return null
  })
}

export function panoramaFarColumns(place: Coordinate, width: number, data: FarData, sightAt: (x: number) => Sight,
  terrain?: PlainTerrain, fromKm?: number): FarScene {
  const columns: FarColumn[] = []
  if (!Number.isFinite(width) || width <= 0) return { columns, towers: [] }
  const towers = data.towers.flatMap<FarTowerPlacement>(([lat, lon, heightM]) => {
    const projected = projectSight(place, { lat, lon, heightM }, sightAt, terrain?.camera)
    if (projected && fromKm !== undefined && projected.km <= fromKm + 1e-9) return []
    if (projected?.layer === 'plain') return [{ x: projected.x * width / RIDGE_WIDTH, heightM, y: projected.y, km: projected.km }]
    return projected?.layer === 'far' ? [{ x: projected.x * width / RIDGE_WIDTH, heightM }] : []
  })
  if (terrain?.seenAt) return { columns, towers, patches: plainPatches(place, width, data.grid, terrain, fromKm) }
  for (let left = 0; left < width; left += COLUMN_WIDTH) {
    const right = Math.min(left + COLUMN_WIDTH, width)
    const fraction = (left + right) / (2 * width)
    const sight = sightAt(fraction * RIDGE_WIDTH)
    if (fromKm !== undefined && sight.farKm <= fromKm) continue
    if (!sight.farShows || sight.farKm > FAR_RADIUS_KM || sight.farKm <= Math.max(sight.nearKm + 1, 2)) continue
    // The raster keeps coordinates. Sample it at the visible crest in this direction.
    const point = destination(place.lat, place.lon, sight.farKm, azimuthAt(fraction, terrain?.camera))
    const row = Math.floor((point.lat - FAR_SOUTH) / FAR_LAT_STEP)
    const col = Math.floor((point.lon - FAR_WEST) / FAR_LON_STEP)
    if (row < 0 || row >= FAR_ROWS || col < 0 || col >= FAR_COLS) continue
    const meta = data.grid[row * FAR_COLS + col]
    columns.push({ left, right, built: (meta >> 4) / 15, heightClass: meta & 15 })
  }
  return { columns, towers }
}
