import { decodeLand } from './grid'
import koppenTable from './koppenTable.json'

/**
 * Generated global 0.5°×0.5° Köppen–Geiger climate regime lookup from Beck et al. (2018),
 * *Scientific Data* 5:180214 (`Beck_KG_V1_present_0p5.tif`, 1980–2016 present-day raster).
 *
 * Built offline by `scripts/land/buildKoppen.ts` with SHA-256 verification and exact 1:1 class
 * mapping (zero hand-written patches; ocean/nodata `0` preserved explicitly in `koppenTable.json`).
 *
 * Regime codes:
 * - `A`: Tropical wet / monsoon (Af, Am)        - `w`: Tropical savanna / dry winter (Aw)
 * - `B`: Arid desert (BWh, BWk)                 - `S`: Semi-arid steppe (BSh, BSk)
 * - `M`: Mediterranean dry-summer (Csa–Csc)     - `H`: Humid subtropical / wet-summer (Cfa, Cwa–Cwc)
 * - `C`: Oceanic / maritime temperate (Cfb,Cfc) - `D`: Humid / dry-summer continental (Dfa–Dfd,Dsa–Dsd)
 * - `d`: Dry-winter continental (Dwa–Dwd)       - `E`: Polar / alpine tundra & frost (ET, EF)
 */
export type KoppenCode = 'A' | 'w' | 'B' | 'S' | 'M' | 'H' | 'C' | 'D' | 'd' | 'E'

const ROWS = koppenTable.rows
const COLS = koppenTable.cols
const STEP = koppenTable.stepDeg
const CODES = koppenTable.codes as readonly ('0' | KoppenCode)[]
const NEIGHBORS: readonly [number, number][] = [
  [-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1],
]

let decoded: Uint8Array | null = null
const table = () => (decoded ??= decodeLand(koppenTable.r, ROWS * COLS))

function cellCoords(lat: number, lon: number): { row: number; col: number } {
  const row = Math.max(0, Math.min(ROWS - 1, Math.floor((90 - lat) / STEP)))
  const normLon = (((lon + 180) % 360) + 360) % 360
  const col = Math.min(COLS - 1, Math.floor(normLon / STEP))
  return { row, col }
}

/** Exact 0.5° Beck et al. (2018) cell regime at `(lat, lon)`, or `null` over ocean/nodata. */
export function rawKoppenAt(lat: number, lon: number): KoppenCode | null {
  const { row, col } = cellCoords(lat, lon)
  const idx = table()[row * COLS + col]
  return idx > 0 ? (CODES[idx] as KoppenCode) : null
}

/**
 * Resolves the Beck et al. (2018) climate regime at `(lat, lon)`.
 * Uses the exact 0.5° land cell when present, falls back to the nearest 8-connected land neighbor
 * for coastal points landing in a sea cell, and uses a zonal latitude proxy over open ocean.
 */
export function koppenAt(lat: number, lon: number): KoppenCode {
  const exact = rawKoppenAt(lat, lon)
  if (exact) return exact
  const { row, col } = cellCoords(lat, lon)
  const grid = table()
  for (const [dr, dc] of NEIGHBORS) {
    const r = row + dr
    if (r < 0 || r >= ROWS) continue
    const c = (col + dc + COLS) % COLS
    const idx = grid[r * COLS + c]
    if (idx > 0) return CODES[idx] as KoppenCode
  }
  const a = Math.abs(lat)
  return a >= 60 ? 'E' : a >= 40 ? 'C' : a >= 26 ? 'H' : a >= 15 ? 'w' : 'A'
}
