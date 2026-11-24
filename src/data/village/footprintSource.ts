import { hashId } from '../landmarks/hash'
import type { Coordinate } from '../landmarks/project'
import { HOUSE_STEP_M, LAT_M, lonM, type StoredHouse } from './houseCode'
import { groupOf, type FootprintHouse, type SettlementRow, type SettlementSource } from './settlement'
import type { LatLon, TileGroup, VillageTile } from './tile'
import { nearestOf, offsetOf, wrapLon } from './where'

/** A place this near a known place point is that place: it is given that point's group, or none if it has none. */
export const SAME_KM = .01
/** Another place belongs to a group it stands this near a house of: the distance the build links houses at. */
export const LINK_KM = .06
/** …or whose own place point stands this near it: a place in a village's middle square. Less than a town's reach. */
export const PLACE_KM = .1

/** Where a stored house stands. */
export const houseAt = ([lat, lon]: LatLon, { x, y }: StoredHouse): LatLon =>
  [lat + y * HOUSE_STEP_M / LAT_M, wrapLon(lon + x * HOUSE_STEP_M / lonM(lat))]

interface Ranked { group: TileGroup; by: readonly number[] }

/** Nearer first; then the one further south, then west; then by all that is stored: never by the file's order. */
function before(a: Ranked, b: Ranked): boolean {
  const at = a.by.findIndex((value, i) => value !== b.by[i])
  return at < 0 ? JSON.stringify(a.group) < JSON.stringify(b.group) : a.by[at] < b.by[at]
}

const firstOf = (found: readonly Ranked[]): TileGroup | null =>
  found.reduce<Ranked | null>((best, next) => !best || before(next, best) ? next : best, null)?.group ?? null

/** The group of a tile a place belongs to, or null when it belongs to none of them. */
export function servingGroup(tile: VillageTile, place: Coordinate): TileGroup | null {
  const near = tile.groups.map(group => ({ group, placeKm: nearestOf(place, group.places) }))
  const knownKm = near.reduce((least, { placeKm }) => Math.min(least, placeKm), nearestOf(place, tile.bare))
  if (knownKm <= SAME_KM) {
    return firstOf(near.filter(({ placeKm }) => placeKm === knownKm).map(({ group }) => ({ group, by: group.corner })))
  }
  return firstOf(near.flatMap(({ group, placeKm }) => {
    const houseKm = nearestOf(place, group.houses.map(house => houseAt(group.corner, house)))
    return houseKm > LINK_KM && placeKm > PLACE_KM ? [] : [{ group, by: [houseKm, placeKm, ...group.corner] }]
  }))
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
    const [lat, lon] = houseAt(own.corner, house)
    const { dx, dy } = offsetOf(place, { lat, lon })
    return { dx, dy, holds: 1, outline: house.outline, across: house.across, size: house.size, row: rowAt[i] ?? null,
      seed: hashId(`${Math.round(lat * 1e5)}:${Math.round(lon * 1e5)}`) }
  })
  return { kind: 'footprints', group: groupOf(spots), spots, rows, provenance: {
    source: tile.source, licence: { id: tile.licence, url: tile.licenceUrl }, credits: tile.credits,
    release: tile.release, built: tile.built } }
}
