import type { CityRaster } from '../city/cityRaster'
import type { LandCover } from '../land/landData'
import type { Coordinate } from '../landmarks/project'
import { cellSettlement } from './cellSource'
import { footprintSettlement } from './footprintSource'
import type { SettlementSource } from './settlement'
import type { VillageTile } from './tile'

export interface SettlementInput {
  /** `undefined` until it is settled, `null` when there is none. */
  tile: VillageTile | null | undefined
  cover: LandCover | null
  raster?: CityRaster
}

/**
 * The settlement a place is drawn from: its footprints, else its cover cells, else null. `undefined` while the tile is not
 * settled: to draw the cells then would change the place under the eye. A pure answer to what has arrived, so it does not
 * matter in which order.
 */
export function settlementOf(place: Coordinate, { tile, cover, raster }: SettlementInput): SettlementSource | null | undefined {
  if (tile === undefined) return undefined
  return (tile && footprintSettlement(tile, place)) ?? (cover && cellSettlement(place, cover, raster))
}
