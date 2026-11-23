import { FAR_COLS, FAR_LAT_STEP, FAR_LON_STEP, FAR_ROWS, FAR_SOUTH, FAR_WEST } from '../data/city/farGrid'
import type { FarData } from '../data/city/farData'

export const KM_LAT = 110.57
export const kmLon = (lat: number) => 111.32 * Math.cos((lat * Math.PI) / 180)

/**
 * Every built cell of the far raster within `reachKm` of a place: its centre (east, north km from it), its distance and its
 * built area (km²; the cell's built share × its size). The raster ends with the country's data: none of Jordan's, Egypt's,
 * Syria's or Lebanon's towns are in it.
 */
export function eachBuiltCell(place: { lat: number; lon: number }, far: FarData, reachKm: number,
  visit: (e: number, n: number, km: number, areaKm2: number) => void): void {
  const cellKm2 = FAR_LAT_STEP * KM_LAT * FAR_LON_STEP * kmLon(place.lat)
  const r0 = Math.floor((place.lat - FAR_SOUTH) / FAR_LAT_STEP), c0 = Math.floor((place.lon - FAR_WEST) / FAR_LON_STEP)
  const dr = Math.ceil(reachKm / (FAR_LAT_STEP * KM_LAT)), dc = Math.ceil(reachKm / (FAR_LON_STEP * kmLon(place.lat)))
  for (let r = Math.max(0, r0 - dr); r <= Math.min(FAR_ROWS - 1, r0 + dr); r++) {
    const n = (FAR_SOUTH + (r + 0.5) * FAR_LAT_STEP - place.lat) * KM_LAT
    for (let c = Math.max(0, c0 - dc); c <= Math.min(FAR_COLS - 1, c0 + dc); c++) {
      const built = far.grid[r * FAR_COLS + c] >> 4
      if (!built) continue
      const e = (FAR_WEST + (c + 0.5) * FAR_LON_STEP - place.lon) * kmLon(place.lat)
      const km = Math.hypot(n, e)
      if (km <= reachKm) visit(e, n, km, (built / 15) * cellKm2)
    }
  }
}

/** The built cells as a list, for what is worked from them more than once. */
export interface BuiltCell { e: number; n: number; km: number; area: number }
export function builtCells(place: { lat: number; lon: number }, far: FarData, reachKm: number): BuiltCell[] {
  const out: BuiltCell[] = []
  eachBuiltCell(place, far, reachKm, (e, n, km, area) => out.push({ e, n, km, area }))
  return out
}

/** Walker's law: a built km² at `km` brightens the sky as (d + 0.5 km)^−2.5, scaled so ~1 is the edge of a small town. */
export const walker = (km: number, areaKm2: number) => areaKm2 * (km + 0.5) ** -2.5 / 0.35
