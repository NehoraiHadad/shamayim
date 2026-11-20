/**
 * Builds `public/data/land/il/coarse.json` (0.01° ≈ 1 km majority-class WorldCover overview)
 * directly from ESA WorldCover 2021 v200 COGs (CC BY 4.0) over the full ±60 km panorama footprint
 * of every supported place (`28.8–34.0° N`, `33.4–36.8° E`, including neighboring countries and sea).
 *
 * Overview & aggregation rule:
 * - Reads overview IFD 3 (`4500 × 4500` px per 3°×3° tile = 1500 px/deg, exact 15×15 px per 0.01° cell).
 * - Preserves water (`80 -> 8`) as water (unlike the fine tile builder which omits all-water tiles).
 * - Preserves ESA WorldCover true nodata (`0 -> 0`) explicitly whenever < 50 % of the 15×15 block is valid;
 *   otherwise emits the modal valid cover class (`1..10`).
 *
 * Usage: `npx tsx scripts/land/buildCoarse.ts [--bbox 28.8,33.4,34.0,36.8]`
 */
import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { fromUrl, type GeoTIFFImage } from 'geotiff'
import { coverOfWorldCover, encodeLand } from '../../src/data/land/grid'

const STEP_DEG = 0.01
const CELLS_PER_DEG = 100
const OVERVIEW_IFD = 3 // 4500×4500 per 3° tile => 1500 px/deg => 15×15 exact px per 0.01° cell
const TILE_PX = 4500
const PX_PER_DEG = TILE_PX / 3
const BLOCK = PX_PER_DEG / CELLS_PER_DEG // 15

const tileUrl = (lat: number, lon: number) =>
  `https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_N${String(lat).padStart(2, '0')}E${String(lon).padStart(3, '0')}_Map.tif`

async function readTileSlice(
  tLat: number, tLon: number, s: number, w: number, n: number, e: number,
): Promise<{ data: Uint8Array; winW: number; winH: number }> {
  const tiff = await fromUrl(tileUrl(tLat, tLon))
  const img: GeoTIFFImage = await tiff.getImage(OVERVIEW_IFD)
  const x0 = Math.round((w - tLon) * PX_PER_DEG)
  const x1 = Math.round((e - tLon) * PX_PER_DEG)
  const y0 = Math.round((tLat + 3 - n) * PX_PER_DEG)
  const y1 = Math.round((tLat + 3 - s) * PX_PER_DEG)
  const rasters = await img.readRasters({ window: [x0, y0, x1, y1] })
  return { data: rasters[0] as Uint8Array, winW: x1 - x0, winH: y1 - y0 }
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      bbox: { type: 'string', default: '28.8,33.4,34.0,36.8' },
      out: { type: 'string', default: 'public/data/land/il/coarse.json' },
    },
  })
  const [south, west, north, east] = values.bbox!.split(',').map(Number)
  const rows = Math.round((north - south) * CELLS_PER_DEG)
  const cols = Math.round((east - west) * CELLS_PER_DEG)
  const coarse = new Uint8Array(rows * cols)
  const counts = new Uint16Array(16)

  for (let tLat = Math.floor(south / 3) * 3; tLat < north; tLat += 3) {
    for (let tLon = Math.floor(west / 3) * 3; tLon < east; tLon += 3) {
      const s = Math.max(south, tLat), n = Math.min(north, tLat + 3)
      const w = Math.max(west, tLon), e = Math.min(east, tLon + 3)
      console.log(`Reading N${tLat}E0${tLon} [${s.toFixed(2)}, ${w.toFixed(2)}, ${n.toFixed(2)}, ${e.toFixed(2)}]...`)
      const { data, winW } = await readTileSlice(tLat, tLon, s, w, n, e)
      const sliceRows = Math.round((n - s) * CELLS_PER_DEG)
      const sliceCols = Math.round((e - w) * CELLS_PER_DEG)
      const baseRow = Math.round((north - n) * CELLS_PER_DEG)
      const baseCol = Math.round((w - west) * CELLS_PER_DEG)
      for (let sr = 0; sr < sliceRows; sr++) {
        for (let sc = 0; sc < sliceCols; sc++) {
          counts.fill(0)
          let valid = 0
          for (let y = 0; y < BLOCK; y++) {
            const off = (sr * BLOCK + y) * winW + sc * BLOCK
            for (let x = 0; x < BLOCK; x++) {
              const cls = coverOfWorldCover(data[off + x])
              if (cls > 0) { counts[cls]++; valid++ }
            }
          }
          let best = 0
          if (valid * 2 >= BLOCK * BLOCK) {
            for (let k = 1; k < 16; k++) if (counts[k] > counts[best]) best = k
          }
          coarse[(baseRow + sr) * cols + (baseCol + sc)] = best
        }
      }
    }
  }

  const outPath = path.resolve(values.out!)
  const out = {
    v: 1,
    source: 'ESA WorldCover 10 m 2021 v200 (CC BY 4.0)',
    bbox: [south, west, north, east] as [number, number, number, number],
    stepDeg: STEP_DEG,
    rows,
    cols,
    r: encodeLand(coarse),
  }
  fs.writeFileSync(outPath, JSON.stringify(out))
  const hist = new Uint32Array(11)
  for (const v of coarse) hist[v]++
  console.log(`Wrote ${outPath} (${rows}×${cols}, ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB), hist:`, Array.from(hist))
}

void main()
