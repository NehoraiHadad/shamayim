import { hashId } from '../landmarks/hash'
import { offsetKm, type Coordinate } from '../landmarks/project'
import { HOUSE_STEP_M, LAT_M, lonM, type StoredHouse } from './houseCode'
import { groupOf, type FootprintHouse, type SettlementRow, type SettlementSource } from './settlement'
import type { LatLon, TileGroup, VillageTile } from './tile'

/** A place belongs to a group it stands this near a house of: the distance the build links houses at. */
export const LINK_KM = .06
/** …or whose own place point stands this near it: a place in a village's middle square. Less than a town's reach. */
export const PLACE_KM = .1

const pointOf = ([lat, lon]: LatLon): Coordinate => ({ lat, lon })
const farOf = (place: Coordinate, point: Coordinate) => {
  const { dx, dy } = offsetKm(place, point)
  return Math.hypot(dx, dy)
}
const houseAt = ([lat, lon]: LatLon, { x, y }: StoredHouse): Coordinate =>
  ({ lat: lat + y * HOUSE_STEP_M / LAT_M, lon: lon + x * HOUSE_STEP_M / lonM(lat) })

interface Found { group: TileGroup; houseKm: number; placeKm: number }

/** The group of a tile a place belongs to, or null when it belongs to none of them. */
export function servingGroup(tile: VillageTile, place: Coordinate): TileGroup | null {
  let best: Found | null = null
  for (const group of tile.groups) {
    const placeKm = Math.min(...group.places.map(p => farOf(place, pointOf(p))))
    let houseKm = Infinity
    for (const house of group.houses) houseKm = Math.min(houseKm, farOf(place, houseAt(group.corner, house)))
    if (houseKm > LINK_KM && placeKm > PLACE_KM) continue
    if (!best || houseKm < best.houseKm || (houseKm === best.houseKm && placeKm < best.placeKm)) best = { group, houseKm, placeKm }
  }
  return best && best.group
}

/** A row's houses follow one another in the file; the rest, after the last row, stand alone. */
function rowsIn(counts: readonly number[]): SettlementRow[] {
  let start = 0
  return counts.map(count => {
    const row = { start, count: Math.abs(count), ring: count < 0 }
    start += row.count
    return row
  })
}

/** The footprints of the place's own group in a tile, or null when the tile holds no group the place belongs to. */
export function footprintSettlement(tile: VillageTile, place: Coordinate): SettlementSource | null {
  const own = servingGroup(tile, place)
  if (!own) return null
  const rows = rowsIn(own.rows)
  const rowAt = rows.flatMap((row, i) => Array<number>(row.count).fill(i))
  const spots = own.houses.map((house, i): FootprintHouse => {
    const at = houseAt(own.corner, house)
    const { dx, dy } = offsetKm(place, at)
    return { dx, dy, holds: 1, outline: house.outline, across: house.across, size: house.size, row: rowAt[i] ?? null,
      seed: hashId(`${Math.round(at.lat * 1e5)}:${Math.round(at.lon * 1e5)}`) }
  })
  return { kind: 'footprints', group: groupOf(spots), spots, rows, provenance: {
    source: tile.source, licence: { id: tile.licence, url: tile.licenceUrl }, credits: tile.credits,
    release: tile.release, built: tile.built } }
}
