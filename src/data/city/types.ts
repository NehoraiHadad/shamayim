import type { Cluster } from './clusterTypes'
import type { CityRaster } from './cityRaster'

export type Run = [row: number, col: number, bytes: string]
export type Tower = [lat: number, lon: number, height: number, width: 0 | 1 | 2, name?: string]
export type PlaceRow = [lat: number, lon: number, kind: 0 | 1 | 2 | 3, faith: 0 | 1 | 2 | 3 | 4 | 5,
  reach: number, name: string]
export type CityCell = { r: Run[]; t: Tower[] } & ({ v: 1 } | { v: 2; p: PlaceRow[] })
export type Square = { cell: string; col: number; row: number }
export type CityIndex = {
  generatedAt: string
  source: 'OpenStreetMap via Geofabrik (ODbL)'
  bbox: [south: number, west: number, north: number, east: number]
  cells: string[]
}
/**
 * built: mean footprint share; measured: the part of `built` from mapped footprints (the rest is zoned land with
 * none mapped); levels: typical storeys of the measured part; upper: tallest p90 height in m.
 */
export type Column = { built: number; measured: number; levels: number; upper: number }
export type CityTower = {
  /** East and north offsets in km from the place. */
  dx: number
  dy: number
  heightM: number
  wClass: 0 | 1 | 2
  name?: string
  lat: number
  lon: number
}
export type CityColumns = {
  towers: CityTower[]
  rows: [Column[], Column[], Column[]]
  /** West edge and longitude span of the near band. */
  west: number
  span: number
}

export type CityResult = CityColumns & { clusters: Cluster[]; raster?: CityRaster }
