// Builds the large-water mask (public/data/land/water.json) from the land-cover cells (public/data/land/il): ESA
// WorldCover's water class, coarsened, kept only for bodies large enough to read from afar (the sea, the Kinneret, the
// Dead Sea, the Gulf of Eilat), each named. Cells the land build left out are open water (it skips all-water cells).
// Usage: npx tsx scripts/land/water.ts [--in public/data/land/il] [--out public/data/land/water.json]
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { COVER, decodeLand, encodeLand, LAND_N } from '../../src/data/land/grid'
import { WATER_PER_CELL, type WaterBody, type WaterMaskFile } from '../../src/data/water/waterMask'

const WATER = COVER.indexOf('water')
/** Bodies smaller than this (km²) are left out: fish ponds and reservoirs, not seen as water from a distance. */
const MIN_KM2 = 8
/** Known bodies, by a box round each (south, west, north, east) that holds the body's centre. */
const NAMED: (WaterBody & { box: [number, number, number, number] })[] = [
  { name: 'כנרת', kind: 'lake', box: [32.6, 35.45, 33.0, 35.7] },
  // The northern basin, and the evaporation ponds of the southern one: the Dead Sea's water either way.
  { name: 'ים המלח', kind: 'lake', box: [30.9, 35.3, 31.8, 35.65] },
  { name: 'מפרץ אילת', kind: 'sea', box: [29.0, 34.8, 29.6, 35.1] },
  // The Mediterranean: the one body that reaches the mask's western edge.
]

const { values } = parseArgs({ options: { in: { type: 'string', default: 'public/data/land/il' },
  out: { type: 'string', default: 'public/data/land/water.json' } } })
const index = JSON.parse(await readFile(join(values.in!, 'index.json'), 'utf8')) as { bbox: number[]; cells: string[] }
const [south, west, north, east] = index.bbox
const cellRows = Math.round((north - south) * 10), cellCols = Math.round((east - west) * 10)
const block = LAND_N / WATER_PER_CELL
const rows = cellRows * WATER_PER_CELL, cols = cellCols * WATER_PER_CELL
const wet = new Uint8Array(rows * cols)
const have = new Set(index.cells)
for (let cr = 0; cr < cellRows; cr++) {
  for (let cc = 0; cc < cellCols; cc++) {
    const key = `${Math.round(south * 10) + cr}_${Math.round(west * 10) + cc}`
    // Mask rows run from the north: cell row cr (from the south) fills mask rows from the bottom up.
    const top = (cellRows - 1 - cr) * WATER_PER_CELL, left = cc * WATER_PER_CELL
    if (!have.has(key)) {
      for (let r = 0; r < WATER_PER_CELL; r++) wet.fill(1, (top + r) * cols + left, (top + r) * cols + left + WATER_PER_CELL)
      continue
    }
    const grid = decodeLand((JSON.parse(await readFile(join(values.in!, `${key}.json`), 'utf8')) as { r: string }).r)
    for (let r = 0; r < WATER_PER_CELL; r++) {
      for (let c = 0; c < WATER_PER_CELL; c++) {
        let count = 0
        for (let y = 0; y < block; y++) for (let x = 0; x < block; x++) if (grid[(r * block + y) * LAND_N + c * block + x] === WATER) count++
        if (count * 2 >= block * block) wet[(top + r) * cols + left + c] = 1
      }
    }
  }
}
// Connected bodies (4-neighbours), their areas.
const step = 0.1 / WATER_PER_CELL
const label = new Int32Array(rows * cols).fill(-1)
const bodies: { area: number; cells: number[] }[] = []
for (let start = 0; start < wet.length; start++) {
  if (!wet[start] || label[start] >= 0) continue
  const id = bodies.length, cells: number[] = [start]
  label[start] = id
  let area = 0
  for (let k = 0; k < cells.length; k++) {
    const i = cells[k], r = Math.floor(i / cols), c = i % cols
    const lat = north - (r + .5) * step
    area += (step * 111.32) * (step * 111.32 * Math.cos((lat * Math.PI) / 180))
    for (const j of [c > 0 ? i - 1 : -1, c < cols - 1 ? i + 1 : -1, r > 0 ? i - cols : -1, r < rows - 1 ? i + cols : -1]) {
      if (j >= 0 && wet[j] && label[j] < 0) { label[j] = id; cells.push(j) }
    }
  }
  bodies.push({ area, cells })
}
const kept: WaterBody[] = []
const out = new Uint8Array(rows * cols)
for (const body of bodies) {
  if (body.area < MIN_KM2) continue
  let lat = 0, lon = 0
  for (const i of body.cells) { lat += north - (Math.floor(i / cols) + .5) * step; lon += west + (i % cols + .5) * step }
  lat /= body.cells.length; lon /= body.cells.length
  const named = body.cells.some(i => i % cols === 0) ? { name: 'ים', kind: 'sea' as const }
    : NAMED.find(({ box: [s, w, n, e] }) => lat >= s && lat <= n && lon >= w && lon <= e)
  const entry: WaterBody = named ? { name: named.name, kind: named.kind } : { kind: 'lake' }
  let at = kept.findIndex(k => k.name === entry.name && k.kind === entry.kind && entry.name !== undefined)
  if (at < 0) { kept.push(entry); at = kept.length - 1 }
  for (const i of body.cells) out[i] = at + 1
  console.log(`${entry.name ?? '(unnamed)'}: ${Math.round(body.area)} km² (centre ${lat.toFixed(2)}, ${lon.toFixed(2)})`)
}
const file: WaterMaskFile = { v: 1, source: 'ESA WorldCover 10 m 2021 v200 (CC BY 4.0), water class', south, west, north, east,
  perCell: WATER_PER_CELL, bodies: kept, r: encodeLand(out) }
await writeFile(values.out!, JSON.stringify(file))
console.log(`${rows} × ${cols}, ${kept.length} bodies, ${(JSON.stringify(file).length / 1024).toFixed(1)} kB`)
