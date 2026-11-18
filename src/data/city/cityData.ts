import type { Coordinate } from '../landmarks/project'
import type { CityCell, CityIndex, CityResult } from './types'
import { cellsForBand, cityOffset, computeColumns } from './columns'
import { findClusters } from './clusters'
import { decodeRuns } from './grid'
import { cityRaster } from './cityRaster'

const ROOT = `${import.meta.env.BASE_URL}data/city/il`
let indexPromise: Promise<CityIndex | null> | undefined

export function inCoverage(index: CityIndex, place: Coordinate) {
  const [south, west, north, east] = index.bbox
  return place.lat >= south && place.lat <= north && place.lon >= west && place.lon <= east
}

function getIndex() {
  indexPromise ??= fetch(`${ROOT}/index.json`).then(async (response) => {
    if (response.status === 404) return null
    if (!response.ok) throw new Error(`City index HTTP ${response.status}`)
    const index = await response.json() as CityIndex
    if (!Array.isArray(index.cells) || index.bbox?.length !== 4) throw new Error('Invalid city index')
    return index
  }).then(index => {
    if (!index) indexPromise = undefined
    return index
  }).catch(error => {
    indexPromise = undefined
    throw error
  })
  return indexPromise
}

export async function loadCity(place: Coordinate, signal: AbortSignal): Promise<CityResult | null> {
  const index = await getIndex()
  if (!index || !inCoverage(index, place)) return null
  const available = new Set(index.cells)
  const cells = cellsForBand(place, 6).filter(cell => available.has(cell))
  if (!cells.length) return null
  const fabricCells = new Set(cellsForBand(place))
  const loaded = await Promise.all(cells.map(async cell => {
    const response = await fetch(`${ROOT}/${cell}.json`, { signal })
    if (!response.ok) throw new Error(`City cell HTTP ${response.status}`)
    const data = await response.json() as CityCell
    if (data.v !== 1 && data.v !== 2) throw new Error('Unsupported city cell version')
    return { cell, data }
  }))
  const grids = new Map(loaded.map(({ cell, data }) => [cell, decodeRuns(data.r, data.v === 2 ? 3 : 2)] as const))
  const fabricGrids = new Map([...grids].filter(([cell]) => fabricCells.has(cell)))
  const legacyCells = new Set(cellsForBand(place, 5))
  const allTowers = loaded.flatMap(({ cell, data }) => data.t.map(([lat, lon, heightM, wClass, name]) => ({
    cell, tower: { lat, lon, heightM, wClass, name, ...cityOffset(place, { lat, lon }) },
  })))
  const towers = allTowers.filter(({ cell, tower: { dx, dy, heightM } }) =>
    legacyCells.has(cell) && Math.abs(dx) <= 12 && Math.abs(dy) <= (heightM >= 100 ? 5 : 3)).map(({ tower }) => tower)
  const places = loaded.flatMap(({ cell, data }) => legacyCells.has(cell) && data.v === 2 ? data.p : [])
  return { ...computeColumns(place, fabricGrids, towers), clusters: findClusters(place, fabricGrids, places),
    raster: cityRaster(grids, allTowers.map(({ tower }) => tower)) }
}
