// Builds the land-cover cells (public/data/land/il) from ESA WorldCover 2021 (10 m, CC BY 4.0).
// Usage: npx tsx scripts/land/build.ts [--bbox south,west,north,east] [--out public/data/land/il]
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { fromUrl, type GeoTIFFImage } from 'geotiff'
import { coverOfWorldCover, encodeLand, LAND_N } from '../../src/data/land/grid'

const TILE_URL = (lat: number, lon: number) =>
  `https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_N${String(lat).padStart(2, '0')}E${String(lon).padStart(3, '0')}_Map.tif`
const PX_PER_DEG = 12000
const BLOCK = (0.1 * PX_PER_DEG) / LAND_N

const tiles = new Map<string, Promise<GeoTIFFImage>>()
const tileFor = (lat: number, lon: number) => {
  const key = `${lat}_${lon}`
  if (!tiles.has(key)) tiles.set(key, fromUrl(TILE_URL(lat, lon)).then(t => t.getImage()))
  return tiles.get(key)!
}

/** One 0.1° cell: the majority class of each 6 × 6 block of WorldCover pixels. */
export async function buildCell(row: number, col: number): Promise<Uint8Array> {
  const south = row / 10, west = col / 10
  const tLat = Math.floor(south / 3) * 3, tLon = Math.floor(west / 3) * 3
  const image = await tileFor(tLat, tLon)
  const x0 = Math.round((west - tLon) * PX_PER_DEG), y0 = Math.round((tLat + 3 - (south + .1)) * PX_PER_DEG)
  const size = 0.1 * PX_PER_DEG
  const data = (await image.readRasters({ window: [x0, y0, x0 + size, y0 + size] }))[0] as Uint8Array
  const out = new Uint8Array(LAND_N * LAND_N)
  const counts = new Uint16Array(16)
  for (let r = 0; r < LAND_N; r++) {
    for (let c = 0; c < LAND_N; c++) {
      counts.fill(0)
      for (let y = 0; y < BLOCK; y++) for (let x = 0; x < BLOCK; x++) counts[coverOfWorldCover(data[(r * BLOCK + y) * size + c * BLOCK + x])]++
      let best = 0
      for (let k = 1; k < 16; k++) if (counts[k] > counts[best]) best = k
      out[r * LAND_N + c] = best
    }
  }
  return out
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { values } = parseArgs({ options: { bbox: { type: 'string', default: '29.4,34.1,33.4,36.0' }, out: { type: 'string', default: 'public/data/land/il' } } })
  const [south, west, north, east] = values.bbox!.split(',').map(Number)
  await mkdir(values.out!, { recursive: true })
  const cells: string[] = []
  let total = 0
  for (let row = Math.floor(south * 10); row < Math.ceil(north * 10); row++) {
    for (let col = Math.floor(west * 10); col < Math.ceil(east * 10); col++) {
      const grid = await buildCell(row, col)
      if (grid.every(v => v === 0 || v === 8)) continue // open sea or no data
      const runs = encodeLand(grid)
      await writeFile(join(values.out!, `${row}_${col}.json`), JSON.stringify({ v: 1, r: runs }))
      cells.push(`${row}_${col}`)
      total += runs.length
    }
    console.log(`row ${row}: ${cells.length} cells, ${(total / 1e6).toFixed(2)} MB`)
  }
  await writeFile(join(values.out!, 'index.json'), JSON.stringify({ generatedAt: new Date().toISOString(),
    source: 'ESA WorldCover 10 m 2021 v200 (CC BY 4.0)', n: LAND_N, bbox: [south, west, north, east], cells }))
}
