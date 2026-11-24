import { decodeLand } from '../land/grid'

/**
 * Large water round Israel: the sea, the Kinneret, the Dead Sea and the Gulf of Eilat, from ESA WorldCover's water
 * class (the DEM sees the lakes as low land and the sea as flat ground at 0 m). Built by `scripts/land/water.ts` from
 * the land-cover cells, kept at `WATER_PER_CELL` × `WATER_PER_CELL` pixels a 0.1° cell (~280 × 240 m), bodies under a
 * few km² (fish ponds, reservoirs) left out. Served from `public/data/land/water.json` (~30 kB).
 */
export const WATER_PER_CELL = 40

export interface WaterBody {
  /** Its name (Hebrew); none for an unnamed lake. */
  name?: string
  kind: 'sea' | 'lake'
}

export interface WaterMaskFile {
  v: 1
  source: string
  south: number
  west: number
  north: number
  east: number
  perCell: number
  bodies: WaterBody[]
  /** Runs (`encodeLand`'s letters) of 1 + body index, 0 for land, row-major from the north-west corner. */
  r: string
}

/** Which large water body covers a point: its entry in `bodies`, or null on land. */
export interface WaterMask {
  bodies: WaterBody[]
  bodyAt: (lat: number, lon: number) => number | null
}

/**
 * Outside the mask: west of it, north of the Sinai coast, is the open sea; anywhere else land (the rays reach a little
 * past the mask only there and in the Lebanese and Jordanian hills).
 */
const SEA_WEST_ABOVE_LAT = 31.25

export function waterMask(file: WaterMaskFile): WaterMask {
  const step = 0.1 / file.perCell
  const rows = Math.round((file.north - file.south) / step), cols = Math.round((file.east - file.west) / step)
  const grid = decodeLand(file.r, rows * cols)
  const sea = file.bodies.findIndex((body) => body.kind === 'sea' && body.name === 'ים')
  return {
    bodies: file.bodies,
    bodyAt(lat, lon) {
      const row = Math.floor((file.north - lat) / step), col = Math.floor((lon - file.west) / step)
      if (row < 0 || row >= rows || col < 0 || col >= cols) {
        return lon < file.west && lat > SEA_WEST_ABOVE_LAT && sea >= 0 ? sea : null
      }
      const value = grid[row * cols + col]
      return value ? value - 1 : null
    },
  }
}

let maskPromise: Promise<WaterMask | null> | undefined

/** The mask, fetched once per session (shared by every place); null when it cannot be had. */
export function loadWaterMask(): Promise<WaterMask | null> {
  maskPromise ??= fetch(`${import.meta.env.BASE_URL}data/land/water.json`)
    .then((r) => r.ok ? r.json() as Promise<WaterMaskFile> : null)
    .then((file) => file?.v === 1 ? waterMask(file) : null)
    .catch(() => { maskPromise = undefined; return null })
  return maskPromise
}
