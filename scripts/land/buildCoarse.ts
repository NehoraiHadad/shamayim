/**
 * Builds `public/data/land/il/coarse.json` (0.01° ≈ 1 km majority-class WorldCover overview)
 * locally from the existing 0.1° tiles in `public/data/land/il/` (zero network calls).
 *
 * Usage: `npx tsx scripts/land/buildCoarse.ts`
 */
import fs from 'node:fs'
import path from 'node:path'
import { decodeLand, encodeLand, LAND_N } from '../../src/data/land/grid'

const DIR = path.resolve('public/data/land/il')
const SUB = 10 // 10×10 sub-cells per 0.1° tile => 0.01° (~1 km)
const BLOCK = LAND_N / SUB

const index = JSON.parse(fs.readFileSync(path.join(DIR, 'index.json'), 'utf8')) as {
  bbox: [number, number, number, number]
  cells: string[]
}
const [south, west, north, east] = index.bbox
const rows = Math.round((north - south) * 100)
const cols = Math.round((east - west) * 100)
const coarse = new Uint8Array(rows * cols)
const counts = new Uint16Array(16)

for (const key of index.cells) {
  const [tileRow, tileCol] = key.split('_').map(Number)
  const cell = JSON.parse(fs.readFileSync(path.join(DIR, `${key}.json`), 'utf8')) as { r: string }
  const fine = decodeLand(cell.r, LAND_N * LAND_N)
  // Fine tile `(tileRow, tileCol)` spans `[tileRow/10, (tileRow+1)/10]` N, `[tileCol/10, (tileCol+1)/10]` E;
  // row 0 in `fine` is the northernmost edge `(tileRow+1)/10`.
  const baseRow = Math.round((north - (tileRow + 1) / 10) * 100)
  const baseCol = Math.round((tileCol / 10 - west) * 100)
  for (let sr = 0; sr < SUB; sr++) {
    const outR = baseRow + sr
    if (outR < 0 || outR >= rows) continue
    for (let sc = 0; sc < SUB; sc++) {
      const outC = baseCol + sc
      if (outC < 0 || outC >= cols) continue
      counts.fill(0)
      for (let y = 0; y < BLOCK; y++) {
        for (let x = 0; x < BLOCK; x++) {
          counts[fine[(sr * BLOCK + y) * LAND_N + sc * BLOCK + x]]++
        }
      }
      let best = 0
      for (let k = 1; k < 16; k++) if (counts[k] > counts[best]) best = k
      coarse[outR * cols + outC] = best
    }
  }
}

const out = { v: 1, bbox: index.bbox, stepDeg: 0.01, rows, cols, r: encodeLand(coarse) }
const outPath = path.join(DIR, 'coarse.json')
fs.writeFileSync(outPath, JSON.stringify(out))
console.log(`Wrote ${outPath} (${rows}×${cols}, ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`)
