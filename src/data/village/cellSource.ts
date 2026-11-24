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
/** A group wider than this is a town's or a city's, which is not drawn from its cells (`world/village/share.ts`). */
export const TOWN_KM = 5
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

/** The built cell at a grid square, or null. */
function builtAt(place: Coordinate, cover: LandCover, raster: CityRaster | undefined) {
  const areaM2 = LAND_STEP * LAT_M * LAND_STEP * lonM(place.lat)
  return (row: number, col: number): Built | null => {
    const at = { lat: (row + .5) * LAND_STEP, lon: (col + .5) * LAND_STEP }
    if (cover.coverAt(at.lat, at.lon) !== BUILT) return null
    const share = raster?.at(at.lat, at.lon).built ?? 0
    return { ...offsetKm(place, at), row, col, known: share > 0, outline: false, seed: hashId(keyOf(row, col)),
      holds: share > 0 ? share * areaM2 / HOUSE_M ** 2 : UNKNOWN_HOUSES }
  }
}

/** The built cells within the seed distance of the place. */
function seeds(place: Coordinate, at: ReturnType<typeof builtAt>): Built[] {
  const row0 = Math.floor(place.lat / LAND_STEP), col0 = Math.floor(place.lon / LAND_STEP)
  const reach = Math.ceil(SEED_KM * 1000 / (LAND_STEP * lonM(place.lat)))
  const found: Built[] = []
  for (let row = row0 - reach; row <= row0 + reach; row++) for (let col = col0 - reach; col <= col0 + reach; col++) {
    const cell = at(row, col)
    if (cell && Math.hypot(cell.dx, cell.dy) <= SEED_KM) found.push(cell)
  }
  return found
}

/**
 * Built cells joined to the place cell by cell, side or corner, with no empty cell between; null as soon as they reach
 * further than a town's width.
 */
function linked(place: Coordinate, at: ReturnType<typeof builtAt>): Map<string, Built> | null {
  const group = new Map<string, Built>(), todo = seeds(place, at), asked = new Set(todo.map(cell => keyOf(cell.row, cell.col)))
  let w = Infinity, e = -Infinity, s = Infinity, n = -Infinity
  for (let cell = todo.pop(); cell; cell = todo.pop()) {
    group.set(keyOf(cell.row, cell.col), cell)
    w = Math.min(w, cell.dx); e = Math.max(e, cell.dx); s = Math.min(s, cell.dy); n = Math.max(n, cell.dy)
    if (Math.max(e - w, n - s) > TOWN_KM) return null
    for (let r = -1; r <= 1; r++) for (let c = -1; c <= 1; c++) {
      const key = keyOf(cell.row + r, cell.col + c)
      if (asked.has(key)) continue
      asked.add(key)
      const next = at(cell.row + r, cell.col + c)
      if (next) todo.push(next)
    }
  }
  return group
}
const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const

/**
 * The place's own group from the cover cells (its order is the grid's, so the same on every load); null with none near,
 * or with a town's or a city's.
 */
export function cellSettlement(place: Coordinate, cover: LandCover, raster?: CityRaster): SettlementSource | null {
  const group = linked(place, builtAt(place, cover, raster))
  if (!group?.size) return null
  const spots = [...group.values()].sort((a, b) => a.row - b.row || a.col - b.col).map(({ row, col, ...cell }): CoverCell => ({
    ...cell, outline: SIDES.some(([r, c]) => !group.has(keyOf(row + r, col + c))) }))
  return { kind: 'cells', group: groupOf(spots), spots, provenance: PROVENANCE }
}
