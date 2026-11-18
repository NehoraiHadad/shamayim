export type Run = [row: number, col: number, bytes: string]
export type Tower = [lat: number, lon: number, height: number, width: 0 | 1 | 2, name?: string]
export type CityCell = { v: 1; r: Run[]; t: Tower[] }
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
export type CityColumns = {
  rows: [Column[], Column[], Column[]]
  /** West edge and longitude span of the near band. */
  west: number
  span: number
}
