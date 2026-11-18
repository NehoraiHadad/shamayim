import type { Coordinate } from '../landmarks/project'
import type { CityCell, CityIndex } from './types'
import { cellsForBand, computeColumns } from './columns'
import { decodeRuns } from './grid'

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

export async function loadCity(place: Coordinate, signal: AbortSignal) {
  const index = await getIndex()
  if (!index || !inCoverage(index, place)) return null
  const available = new Set(index.cells)
  const cells = cellsForBand(place).filter(cell => available.has(cell))
  if (!cells.length) return null
  const grids = await Promise.all(cells.map(async cell => {
    const response = await fetch(`${ROOT}/${cell}.json`, { signal })
    if (!response.ok) throw new Error(`City cell HTTP ${response.status}`)
    const data = await response.json() as CityCell
    if (data.v !== 1) throw new Error('Unsupported city cell version')
    return [cell, decodeRuns(data.r)] as const
  }))
  return computeColumns(place, new Map(grids))
}
