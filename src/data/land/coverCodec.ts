import { COVER, COVER_NORTH, coverReaches, COVER_SOUTH, decodeLand } from './grid'

/** WorldCover product vintage and winning layer that supplied a cover class at a point. */
export type CoverLayer = 'local-50m' | 'regional-1km' | 'remote-1km' | 'unspecified'
export type CoverSource = `worldcover-2021:${CoverLayer}` | 'unknown'
export interface CoverLookup { cover: number | null; source: CoverSource }

/** What covers the ground at a point (index into `COVER`; `0` where unknown or outside loaded coverage). */
export interface LandCover {
  coverAt: (lat: number, lon: number) => number
  coverWithSourceAt?: (lat: number, lon: number) => CoverLookup
}

export type Bbox = [number, number, number, number] // [south, west, north, east]

export interface CoarseCoverJson {
  v: number; bbox: Bbox; stepDeg: number; rows: number; cols: number; r: string
  /** True only when every footprint tile resolved (data or authoritative 404/nodata). */
  complete?: boolean
  /** Tile codes that failed transiently on last fetch and still need retry; absent/empty when complete. */
  missingTiles?: string[]
}

export const COARSE_COVER_VERSION = 1
/** Upper bound on coarse grid cells (regional Israel 520×340 = 176,800; ±60 km ≈ 22,000). */
export const MAX_COARSE_CELLS = 500_000
/** How far a place's own grid may run on over the antimeridian (degrees): the 60 km of its footprint at 84 degrees is 5.2. */
const LON_LIMIT = 185
const MAX_COVER_CLASS = COVER.length - 1
const TILE_CODE_RE = /^[NS]\d{2}[EW]\d{3}$/

/** Validates a land RLE string without allocating: permitted classes `a..k` and exact decoded length. */
export function isValidLandRle(runs: string, expectedLen: number): boolean {
  if (!runs.length || !Number.isInteger(expectedLen) || expectedLen <= 0) return false
  let total = 0
  for (let i = 0; i < runs.length;) {
    const cls = runs.charCodeAt(i) - 97
    if (cls < 0 || cls > MAX_COVER_CLASS) return false
    let j = i + 1
    let count = 0
    while (j < runs.length) {
      const ch = runs.charCodeAt(j)
      if (ch < 48 || ch > 57) break
      if (j === i + 1 && ch === 48) return false // reject leading zero / count 0
      count = count * 10 + (ch - 48)
      if (count > expectedLen) return false
      j++
    }
    const runLen = j > i + 1 ? count : 1
    total += runLen
    if (total > expectedLen) return false
    i = j
  }
  return total === expectedLen
}

/** Validates payload version, geometry consistency, cell bounds, tile codes and RLE raster contents. */
export function isValidCoarseCoverJson(v: unknown): v is CoarseCoverJson {
  if (!v || typeof v !== 'object') return false
  const c = v as Record<string, unknown>
  if (c.v !== COARSE_COVER_VERSION) return false
  if (!Array.isArray(c.bbox) || c.bbox.length !== 4 || !c.bbox.every((n) => typeof n === 'number' && Number.isFinite(n))) {
    return false
  }
  const [south, west, north, east] = c.bbox as Bbox
  if (south < COVER_SOUTH || north > COVER_NORTH || north <= south) return false
  if (west < -LON_LIMIT || east > LON_LIMIT || east <= west || east - west > 360) return false
  if (typeof c.stepDeg !== 'number' || !Number.isFinite(c.stepDeg) || c.stepDeg <= 0 || c.stepDeg > 1) return false
  if (!Number.isInteger(c.rows) || !Number.isInteger(c.cols)) return false
  const rows = c.rows as number, cols = c.cols as number
  if (rows <= 0 || cols <= 0 || rows * cols > MAX_COARSE_CELLS) return false
  if (Math.abs((north - south) / c.stepDeg - rows) > 1e-4) return false
  if (Math.abs((east - west) / c.stepDeg - cols) > 1e-4) return false
  if (typeof c.r !== 'string' || !isValidLandRle(c.r, rows * cols)) return false
  if (c.missingTiles !== undefined) {
    if (!Array.isArray(c.missingTiles) || !c.missingTiles.every((t) => typeof t === 'string' && TILE_CODE_RE.test(t))) {
      return false
    }
  }
  return true
}

/**
 * Resolves both cover class (`1..10` or null) and WorldCover layer provenance at `(lat, lon)`. Near the antimeridian a grid
 * and a point may be a turn apart, either way: what is not found as given is looked up again from the other side.
 */
export function lookupCover(cover: LandCover | null, lat: number, lon: number): CoverLookup {
  if (!cover || !coverReaches(lat)) return { cover: null, source: 'unknown' }
  const given = lookupAt(cover, lat, lon)
  return given.cover !== null || Math.abs(lon) < 360 - LON_LIMIT ? given : lookupAt(cover, lat, lon < 0 ? lon + 360 : lon - 360)
}

function lookupAt(cover: LandCover, lat: number, lon: number): CoverLookup {
  if (cover.coverWithSourceAt) return cover.coverWithSourceAt(lat, lon)
  const cls = cover.coverAt(lat, lon)
  return cls > 0 ? { cover: cls, source: 'worldcover-2021:unspecified' } : { cover: null, source: 'unknown' }
}

/** Builds a `LandCover` lookup over a coarse RLE-encoded WorldCover overview grid with layer provenance. */
export function coarseCoverFromJson(
  raw: CoarseCoverJson,
  layer: 'regional-1km' | 'remote-1km' = 'remote-1km',
): LandCover {
  const [south, west, north, east] = raw.bbox
  const grid = decodeLand(raw.r, raw.rows * raw.cols)
  const { stepDeg, rows, cols } = raw
  const tag: CoverSource = `worldcover-2021:${layer}`
  const coverAt = (lat: number, lon: number): number => {
    if (lat < south || lat >= north || lon < west || lon >= east) return 0
    const row = Math.min(rows - 1, Math.max(0, Math.floor((north - lat) / stepDeg)))
    const col = Math.min(cols - 1, Math.max(0, Math.floor((lon - west) / stepDeg)))
    return grid[row * cols + col]
  }
  return {
    coverAt,
    coverWithSourceAt(lat, lon) {
      const cls = coverAt(lat, lon)
      return cls > 0 ? { cover: cls, source: tag } : { cover: null, source: 'unknown' }
    },
  }
}

/** Combines a high-resolution near `LandCover` with a coarser far `LandCover` (near wins when > 0). */
export function combineLandCovers(near: LandCover | null, far: LandCover | null): LandCover | null {
  if (!near) return far
  if (!far) return near
  return {
    coverAt(lat, lon) {
      const n = near.coverAt(lat, lon)
      return n > 0 ? n : far.coverAt(lat, lon)
    },
    coverWithSourceAt(lat, lon) {
      const n = lookupCover(near, lat, lon)
      return n.cover !== null ? n : lookupCover(far, lat, lon)
    },
  }
}
