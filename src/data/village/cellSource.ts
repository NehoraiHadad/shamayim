import type { CityRaster } from '../city/cityRaster'
import { COVER, LAND_STEP } from '../land/grid'
import type { LandCover } from '../land/landData'
import { hashId } from '../landmarks/hash'
import { offsetKm, type Coordinate } from '../landmarks/project'
import { LAT_M, lonM } from './houseCode'
import { groupOf, type CoverCell, type Provenance, type SettlementSource } from './settlement'

const BUILT = COVER.indexOf('built')
/** The group starts from the built cells within this far of the place, as the footprints' does. */
const SEED_KM = .25
/** How far from the place cells are looked for: the group of a town that runs on is cut here. */
const REACH_KM = 2.5
/** The country's typical house side, m (measured: 13.3 at Karmei Tzur, 13.8 at Nahalal). */
export const HOUSE_M = 13.5
/** Houses in a built cell the city raster knows nothing of (choice). */
const UNKNOWN_HOUSES = 2

const PROVENANCE: Provenance = {
  source: 'ESA WorldCover 2021, 50 m cells; houses per cell from OpenStreetMap buildings',
  licence: { id: 'CC-BY-4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
  credits: ['© ESA WorldCover 2021 (CC BY 4.0)', '© OpenStreetMap contributors (ODbL)'],
  release: '2021', built: null,
}

const keyOf = (row: number, col: number) => `${row}:${col}`

interface Built extends CoverCell { row: number; col: number }

function builtRound(place: Coordinate, cover: LandCover, raster: CityRaster | undefined): Map<string, Built> {
  const built = new Map<string, Built>()
  const areaM2 = LAND_STEP * LAT_M * LAND_STEP * lonM(place.lat)
  const row0 = Math.floor(place.lat / LAND_STEP), col0 = Math.floor(place.lon / LAND_STEP)
  const rows = Math.ceil(REACH_KM * 1000 / (LAND_STEP * LAT_M)), cols = Math.ceil(REACH_KM * 1000 / (LAND_STEP * lonM(place.lat)))
  for (let row = row0 - rows; row <= row0 + rows; row++) for (let col = col0 - cols; col <= col0 + cols; col++) {
    const at = { lat: (row + .5) * LAND_STEP, lon: (col + .5) * LAND_STEP }
    if (cover.coverAt(at.lat, at.lon) !== BUILT) continue
    const { dx, dy } = offsetKm(place, at)
    if (Math.hypot(dx, dy) > REACH_KM) continue
    const share = raster?.at(at.lat, at.lon).built ?? 0
    built.set(keyOf(row, col), { dx, dy, row, col, known: share > 0, outline: false, seed: hashId(keyOf(row, col)),
      holds: share > 0 ? share * areaM2 / HOUSE_M ** 2 : UNKNOWN_HOUSES })
  }
  return built
}

/** Built cells joined to the place cell by cell, side or corner, with no empty cell between. */
function linked(built: ReadonlyMap<string, Built>): Map<string, Built> {
  const group = new Map<string, Built>()
  const todo = [...built.values()].filter(cell => Math.hypot(cell.dx, cell.dy) <= SEED_KM)
  for (let cell = todo.pop(); cell; cell = todo.pop()) {
    const key = keyOf(cell.row, cell.col)
    if (group.has(key)) continue
    group.set(key, cell)
    for (let r = -1; r <= 1; r++) for (let c = -1; c <= 1; c++) {
      const next = built.get(keyOf(cell.row + r, cell.col + c))
      if (next) todo.push(next)
    }
  }
  return group
}

const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const

/** The place's own group from the cover cells (its order is the grid's, so the same on every load); null with none near. */
export function cellSettlement(place: Coordinate, cover: LandCover, raster?: CityRaster): SettlementSource | null {
  const group = linked(builtRound(place, cover, raster))
  if (!group.size) return null
  const spots = [...group.values()].sort((a, b) => a.row - b.row || a.col - b.col).map(({ row, col, ...cell }): CoverCell => ({
    ...cell, outline: SIDES.some(([r, c]) => !group.has(keyOf(row + r, col + c))) }))
  return { kind: 'cells', group: groupOf(spots), spots, provenance: PROVENANCE }
}
