// How often a place found by name (Open-Meteo, as the app's search asks it) is given the right village's footprints.
// Usage: npx tsx scripts/village/search.ts [--count 200]   (asks one name at a time; sends the name and nothing else)
import { readdir, readFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { landCellKey } from '../../src/data/land/grid'
import type { GeocodingResult } from '../../src/data/geocoding'
import type { CityCell, PlaceRow } from '../../src/data/city/types'
import { hashId, seeded } from '../../src/data/landmarks/hash'
import { distanceOf } from '../../src/data/landmarks/project'
import { servingGroup } from '../../src/data/village/footprintSource'
import { readTile, type VillageTile } from '../../src/data/village/tile'
import { storedTiles } from './write'

const CITY = 'public/data/city/il', WITH = .7, SAME_KM = 5, GAP_MS = 250
const { values } = parseArgs({ options: { count: { type: 'string', default: '200' }, out: { type: 'string', default: 'public/data/village/il' } } })

const tiles = new Map<string, VillageTile>([...await storedTiles(values.out)].map(([key, tile]) => [key, readTile(tile)!]))
const groupAt = (lat: number, lon: number) => {
  const tile = tiles.get(landCellKey(lat, lon))
  return tile ? servingGroup(tile, { lat, lon }) : null
}
const files = (await readdir(CITY)).filter(name => /^-?\d+_-?\d+\.json$/.test(name))
const cells = await Promise.all(files.map(async name => JSON.parse(await readFile(`${CITY}/${name}`, 'utf8')) as CityCell))
const order = ([lat, lon]: PlaceRow) => seeded(hashId(`${lat}:${lon}`))()
const named = cells.flatMap(cell => cell.v === 2 ? cell.p : []).filter(row => row[5]?.trim()).sort((a, b) => order(a) - order(b))
const owned = named.filter(([lat, lon]) => groupAt(lat, lon)), bare = named.filter(([lat, lon]) => !groupAt(lat, lon))
const count = Number(values.count), withGroup = Math.round(count * WITH)
const sample = [...owned.slice(0, withGroup), ...bare.slice(0, count - withGroup)]

async function found(name: string): Promise<GeocodingResult[]> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.search = new URLSearchParams({ name, language: 'he', count: '6' }).toString()
  const response = await fetch(url, { headers: { 'User-Agent': 'footprint-build-check/1.0' } })
  if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`)
  return ((await response.json()) as { results?: GeocodingResult[] }).results ?? []
}

type Outcome = 'own' | 'cells' | 'another' | 'none, rightly' | 'lent' | 'not found'
const tally = new Map<string, number>(), mistakes: string[] = [], far: number[] = []
for (const [lat, lon, , , , name] of sample) {
  const own = groupAt(lat, lon)
  const near = (await found(name)).map(r => ({ r, km: distanceOf({ lat, lon }, { lat: r.latitude, lon: r.longitude }) }))
    .filter(({ km }) => km <= SAME_KM).sort((a, b) => a.km - b.km)[0]
  let outcome: Outcome = 'not found'
  if (near) {
    far.push(near.km)
    const got = groupAt(near.r.latitude, near.r.longitude)
    const same = got && own && got.corner.join() === own.corner.join() && got.houses.length === own.houses.length
    outcome = own ? (same ? 'own' : got ? 'another' : 'cells') : got ? 'lent' : 'none, rightly'
    if (outcome === 'another' || outcome === 'lent') mistakes.push(`${name} (${near.km.toFixed(2)} km)`)
  }
  const key = `${own ? 'with' : 'without'} footprints: ${outcome}`
  tally.set(key, (tally.get(key) ?? 0) + 1)
  await new Promise(resolve => setTimeout(resolve, GAP_MS))
}
far.sort((a, b) => a - b)
const at = (t: number) => far[Math.floor((far.length - 1) * t)]?.toFixed(2)
console.table([...tally].sort().map(([what, places]) => ({ what, places })))
console.log('search point to place point, km: median', at(.5), 'p90', at(.9), 'largest', at(1))
console.log('given another village:', mistakes)
