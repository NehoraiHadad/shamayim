import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { readTile, type StoredTile } from '../../src/data/village/tile'

const TILE_FILE = /^(-?\d+_-?\d+)\.json$/

/** The tiles that are already in a folder, by key (none when there is no folder). */
export async function storedTiles(dir: string): Promise<Map<string, StoredTile>> {
  const names = await readdir(dir).catch(() => [] as string[])
  const tiles = new Map<string, StoredTile>()
  for (const name of names) {
    const key = TILE_FILE.exec(name)?.[1]
    if (key) tiles.set(key, JSON.parse(await readFile(join(dir, name), 'utf8')) as StoredTile)
  }
  return tiles
}

export const placesIn = (tiles: Iterable<StoredTile>) =>
  new Set([...tiles].flatMap(tile => tile.groups.flatMap(group => group.p.map(place => place.join(',')))))

/** A tile that says the same as before keeps its day, so that a rebuild without news changes no file. */
function keepDay(tile: StoredTile, before: StoredTile | undefined): StoredTile {
  if (!before) return tile
  const dated = { ...tile, built: before.built }
  return JSON.stringify(dated) === JSON.stringify(before) ? dated : tile
}

/** Each tile's text, checked by the reader the app uses. */
export function textsOf(tiles: ReadonlyMap<string, StoredTile>, before: ReadonlyMap<string, StoredTile>): Map<string, string> {
  return new Map([...tiles].map(([key, tile]) => {
    const text = JSON.stringify(keepDay(tile, before.get(key)))
    if (!readTile(JSON.parse(text))) throw new Error(`The app cannot read tile ${key}`)
    return [key, text]
  }))
}

/** Writes the tiles and the list of them, and takes away tiles that are no more. */
export async function writeTiles(dir: string, texts: ReadonlyMap<string, string>, release: string) {
  await mkdir(dir, { recursive: true })
  for (const name of await readdir(dir)) {
    const key = TILE_FILE.exec(name)?.[1]
    if (key && !texts.has(key)) await unlink(join(dir, name))
  }
  for (const [key, text] of texts) await writeFile(join(dir, `${key}.json`), text)
  const index = { v: 1, licence: 'ODbL-1.0', release, cells: [...texts.keys()].sort() }
  await writeFile(join(dir, 'index.json'), JSON.stringify(index))
}
