import { landCellKey } from '../land/grid'
import { loadShared, LOCAL_ASSET_TIMEOUT_MS } from '../land/fineCover'
import type { Coordinate } from '../landmarks/project'
import { readTile, type VillageTile } from './tile'
import tileList from './tileList.json'

/**
 * The tile of real footprints a place stands in (`public/data/village/il`): one small fetch, and only where the list that
 * was built with the tiles names one. Whatever else comes back (nothing, an error, the app's page in a missing file's
 * place, a broken or older tile, one without its licence) reads as no tile, and the place is drawn from its cover cells.
 * The address carries the list's version, so an app never meets another build's tile from a cache.
 */
export const VILLAGE_ROOT = `${import.meta.env.BASE_URL}data/village/il`
const MAX_TILES = 8

export interface TileList { release: string; version: string; cells: readonly string[] }

const held = new Map<string, Promise<VillageTile | null>>()

/** Clears the tiles held in memory (for tests). */
export const resetVillageTiles = () => held.clear()

/** The key of the tile a place stands in, or null when no tile was built there. */
export function villageTileKey(place: Coordinate, list: TileList = tileList): string | null {
  const key = landCellKey(place.lat, place.lon)
  return list.cells.includes(key) ? key : null
}

function hold(url: string, tile: Promise<VillageTile | null> | undefined) {
  held.delete(url)
  if (!tile) return
  held.set(url, tile)
  if (held.size > MAX_TILES) held.delete(held.keys().next().value!)
}

export function loadVillageTile(place: Coordinate, signal?: AbortSignal, fetchImpl: typeof fetch = fetch,
  list: TileList = tileList, timeoutMs = LOCAL_ASSET_TIMEOUT_MS): Promise<VillageTile | null> {
  const key = villageTileKey(place, list)
  if (!key) return Promise.resolve(null)
  const url = `${VILLAGE_ROOT}/${key}.json?v=${list.version}`
  return loadShared<VillageTile>(fetchImpl === fetch, () => held.get(url), tile => hold(url, tile), async (sig) => {
    const response = await fetchImpl(url, { signal: sig })
    return response.ok ? readTile(await response.json(), list.release) : null
  }, signal, timeoutMs)
}
