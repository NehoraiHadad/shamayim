import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { COLS, decodeRuns, LAT_STEP, LON_STEP } from '../../src/data/city/grid'
import { encodeFarRuns, FAR_BUDGET, FAR_COLS, FAR_LAT_STEP, FAR_LON_STEP, FAR_ROWS, FAR_SOUTH,
  FAR_WEST, type FarFile, type FarTower } from '../../src/data/city/farGrid'
import type { CityCell, CityIndex } from '../../src/data/city/types'

// Class 0 is empty. Classes 1–15 are the nearest whole mean storey count, capped at 15.
// A populated share with zero stored levels uses the near layer's three-storey land-use prior.
const HEIGHT_CLASSES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
const radians = Math.PI / 180
const latArea = (south: number, north: number) => Math.sin(north * radians) - Math.sin(south * radians)

export async function buildFar(outputDir: string): Promise<number> {
  const index = JSON.parse(await readFile(join(outputDir, 'index.json'), 'utf8')) as CityIndex
  const built = new Float64Array(FAR_ROWS * FAR_COLS)
  const levels = new Float64Array(built.length)
  const towers: FarTower[] = []
  for (const key of index.cells) {
    const cell = JSON.parse(await readFile(join(outputDir, `${key}.json`), 'utf8')) as CityCell
    const [cellSouth, cellWest] = key.split('_').map(value => Number(value) / 10)
    const stride = cell.v === 2 ? 3 : 2
    const bytes = decodeRuns(cell.r, stride)
    for (let i = 0; i < bytes.length / stride; i++) {
      const meta = bytes[i * stride]
      const share = (meta >> 4) / 15
      if (!share) continue
      const south = cellSouth + Math.floor(i / COLS) * LAT_STEP
      const west = cellWest + (i % COLS) * LON_STEP
      for (let row = Math.max(0, Math.floor((south - FAR_SOUTH) / FAR_LAT_STEP)); row < FAR_ROWS; row++) {
        const gridSouth = FAR_SOUTH + row * FAR_LAT_STEP
        if (gridSouth >= south + LAT_STEP) break
        const areaPerDegree = latArea(Math.max(south, gridSouth), Math.min(south + LAT_STEP, gridSouth + FAR_LAT_STEP))
        for (let col = Math.max(0, Math.floor((west - FAR_WEST) / FAR_LON_STEP)); col < FAR_COLS; col++) {
          const gridWest = FAR_WEST + col * FAR_LON_STEP
          if (gridWest >= west + LON_STEP) break
          const overlap = Math.min(west + LON_STEP, gridWest + FAR_LON_STEP) - Math.max(west, gridWest)
          const j = row * FAR_COLS + col
          const footprint = overlap * areaPerDegree * share
          built[j] += footprint
          levels[j] += footprint * ((meta & 15) || 3)
        }
      }
    }
    for (const [lat, lon, height] of cell.t) if (height >= 80) towers.push([lat, lon, height])
  }
  const grid = Uint8Array.from(built, (area, i) => {
    const south = FAR_SOUTH + Math.floor(i / FAR_COLS) * FAR_LAT_STEP
    // The whole target tile is the denominator, including unmapped and empty land.
    const share = Math.min(15, Math.round(15 * area / (FAR_LON_STEP * latArea(south, south + FAR_LAT_STEP))))
    return share ? (share << 4) | HEIGHT_CLASSES[Math.min(15, Math.round(levels[i] / area))] : 0
  })
  const payload: FarFile = { v: 1, r: encodeFarRuns(grid), t: towers }
  const json = JSON.stringify(payload)
  const bytes = Buffer.byteLength(json)
  if (bytes > FAR_BUDGET) throw new Error(`far.json exceeds budget: ${bytes} > ${FAR_BUDGET} bytes`)
  await writeFile(join(outputDir, 'far.json'), json)
  return bytes
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(`far.json: ${await buildFar(process.argv[2] ?? 'public/data/city/il')} bytes`)
}
