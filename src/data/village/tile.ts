import { decodeHouses, type StoredHouse } from './houseCode'

/**
 * A tile of real building footprints: 0.1° (`landCellKey`), served from `public/data/village/il`, apart from every other
 * data. It is a derivative database of OpenStreetMap (ODbL), so each file carries its own licence and credit lines, and
 * a file without them is refused. The text is data from a file: anything that is not exactly a tile reads as none.
 */
export const TILE_VERSION = 1
export const ODBL = { id: 'ODbL-1.0', url: 'https://opendatacommons.org/licenses/odbl/1-0/' } as const
/** A row of houses closes on itself only from this many (`rows.ts`, at build time). */
export const RING_HOUSES = 8
const MAX_GROUPS = 400
const MAX_HOUSES = 4000
const MAX_CREDITS = 6

export type LatLon = [lat: number, lon: number]

/** One linked group as stored: corner, the place points it serves, OSM's share, row lengths (a ring's is negative), houses. */
export interface StoredGroup { o: LatLon; p: LatLon[]; s: number; r: number[]; h: string }

export interface StoredTile {
  v: typeof TILE_VERSION
  licence: string
  licenceUrl: string
  credits: string[]
  source: string
  release: string
  built: string
  groups: StoredGroup[]
}

/** A group of a checked tile, its houses read. */
export interface TileGroup { corner: LatLon; places: LatLon[]; osmShare: number; rows: number[]; houses: StoredHouse[] }
export interface VillageTile extends Omit<StoredTile, 'groups' | 'v'> { groups: TileGroup[] }

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isText = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 200
const isLatLon = (value: unknown): value is LatLon => Array.isArray(value) && value.length === 2 && value.every(Number.isFinite) &&
  Math.abs(value[0]) <= 90 && Math.abs(value[1]) <= 180
const isRow = (count: unknown) => Number.isInteger(count) && ((count as number) >= 2 || (count as number) <= -RING_HOUSES)
const isDay = (value: unknown) => isText(value) && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value))

function groupFrom(raw: unknown): TileGroup | null {
  if (!isRecord(raw)) return null
  const { o, p, s, r, h } = raw
  if (!isLatLon(o) || !Array.isArray(p) || !p.length || !p.every(isLatLon)) return null
  if (typeof s !== 'number' || !(s >= 0 && s <= 1) || !Array.isArray(r) || !r.every(isRow) || typeof h !== 'string') return null
  const houses = decodeHouses(h)
  if (!houses || houses.length > MAX_HOUSES) return null
  const inRows = r.reduce((sum: number, count: number) => sum + Math.abs(count), 0)
  return inRows > houses.length ? null : { corner: o, places: p, osmShare: s, rows: r, houses }
}

/**
 * A tile from parsed JSON, or null: one bad group makes the whole file none, as a half-read file would be. With `release`,
 * a tile of any other release is none too: it is an older file, and its groups may not be the ones this app was built with.
 */
export function readTile(raw: unknown, release?: string): VillageTile | null {
  if (!isRecord(raw) || raw.v !== TILE_VERSION) return null
  const { licence, licenceUrl, credits, source, release: of, built, groups } = raw
  if (licence !== ODBL.id || licenceUrl !== ODBL.url || !isText(source) || !isText(of) || !isDay(built)) return null
  if (release !== undefined && of !== release) return null
  if (!Array.isArray(credits) || !credits.length || credits.length > MAX_CREDITS || !credits.every(isText)) return null
  if (!Array.isArray(groups) || groups.length > MAX_GROUPS) return null
  const read = groups.map(groupFrom)
  if (read.some(group => !group)) return null
  return { licence, licenceUrl, credits, source, release: of, built: built as string, groups: read as TileGroup[] }
}
