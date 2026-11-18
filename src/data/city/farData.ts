import { useEffect, useMemo, useState } from 'react'
import { projectSight, type Coordinate, type Sight } from '../landmarks/project'
import { azimuthAt, destination } from '../terrain/panorama'
import { FAR_RADIUS_KM, NEAR_RADIUS_KM, RIDGE_WIDTH, ridgeLongitudeKm, ridgeX } from '../terrain/ridgeProjection'
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

export function farColumns(place: Coordinate, width: number, data: FarData): FarScene {
  const columns: FarColumn[] = []
  const towers: { x: number; heightM: number }[] = []
  const row = Math.floor((place.lat - FAR_SOUTH) / FAR_LAT_STEP)
  if (!Number.isFinite(width) || width <= 0 || row < 0 || row >= FAR_ROWS) return { columns, towers }
  const longitudeKm = ridgeLongitudeKm(place.lat)
  const toX = (dx: number) => ridgeX(dx, FAR_RADIUS_KM, width)
  const toGrid = (x: number) => (place.lon - FAR_WEST +
    (x / width * 2 - 1) * FAR_RADIUS_KM / longitudeKm) / FAR_LON_STEP

  // Terrain samples dy=0. Use the one raster row containing that line, with no north/south look-around.
  for (const [start, end] of [[0, toX(-NEAR_RADIUS_KM)], [toX(NEAR_RADIUS_KM), width]]) {
    for (let left = start; left < end; left += COLUMN_WIDTH) {
      const right = Math.min(left + COLUMN_WIDTH, end)
      const west = toGrid(left), east = toGrid(right)
      let built = 0, levels = 0
      for (let col = Math.max(0, Math.floor(west)); col < Math.min(FAR_COLS, east); col++) {
        const meta = data.grid[row * FAR_COLS + col]
        const footprint = (meta >> 4) / 15 * (Math.min(east, col + 1) - Math.max(west, col))
        built += footprint
        levels += footprint * (meta & 15)
      }
      columns.push({ left, right, built: built / (east - west), heightClass: built ? Math.round(levels / built) : 0 })
    }
  }
  for (const [lat, lon, heightM] of data.towers) {
    if (Math.floor((lat - FAR_SOUTH) / FAR_LAT_STEP) !== row) continue
    const dx = (lon - place.lon) * longitudeKm
    if (Math.abs(dx) >= NEAR_RADIUS_KM && Math.abs(dx) <= FAR_RADIUS_KM) towers.push({ x: toX(dx), heightM })
  }
  return { columns, towers }
}

export function panoramaFarColumns(place: Coordinate, width: number, data: FarData, sightAt: (x: number) => Sight,
  terrain?: PlainTerrain): FarScene {
  const columns: FarColumn[] = []
  if (!Number.isFinite(width) || width <= 0) return { columns, towers: [] }
  const towers = data.towers.flatMap<FarTowerPlacement>(([lat, lon, heightM]) => {
    const projected = projectSight(place, { lat, lon, heightM }, sightAt)
    if (projected?.layer === 'plain') return [{ x: projected.x * width / RIDGE_WIDTH, heightM, y: projected.y, km: projected.km }]
    return projected?.layer === 'far' ? [{ x: projected.x * width / RIDGE_WIDTH, heightM }] : []
  })
  if (terrain?.seenAt) return { columns, towers, patches: plainPatches(place, width, data.grid, terrain) }
  for (let left = 0; left < width; left += COLUMN_WIDTH) {
    const right = Math.min(left + COLUMN_WIDTH, width)
    const fraction = (left + right) / (2 * width)
    const sight = sightAt(fraction * RIDGE_WIDTH)
    if (!sight.farShows || sight.farKm > FAR_RADIUS_KM || sight.farKm <= Math.max(sight.nearKm + 1, 2)) continue
    // The raster keeps coordinates. Sample it at the visible crest in this direction.
    const point = destination(place.lat, place.lon, sight.farKm, azimuthAt(fraction))
    const row = Math.floor((point.lat - FAR_SOUTH) / FAR_LAT_STEP)
    const col = Math.floor((point.lon - FAR_WEST) / FAR_LON_STEP)
    if (row < 0 || row >= FAR_ROWS || col < 0 || col >= FAR_COLS) continue
    const meta = data.grid[row * FAR_COLS + col]
    columns.push({ left, right, built: (meta >> 4) / 15, heightClass: meta & 15 })
  }
  return { columns, towers }
}

export function useFarColumns({ lat, lon }: Coordinate, width: number, enabled: boolean, sightAt?: (x: number) => Sight, terrain?: PlainTerrain) {
  const [data, setData] = useState<FarData | null>(null)
  useEffect(() => {
    if (!enabled) return
    let active = true
    void loadFar().then(result => { if (active) setData(result) })
    return () => { active = false }
  }, [enabled])
  return useMemo(() => {
    if (!enabled || !data) return null
    return sightAt ? panoramaFarColumns({ lat, lon }, width, data, sightAt, terrain) : farColumns({ lat, lon }, width, data)
  }, [enabled, data, lat, lon, width, sightAt, terrain])
}
