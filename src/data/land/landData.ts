import type { Coordinate } from '../landmarks/project'
import { decodeLand, LAND_N, LAND_STEP } from './grid'

const ROOT = `${import.meta.env.BASE_URL}data/land/il`
let indexPromise: Promise<{ cells: string[] } | null> | undefined
let coarsePromise: Promise<LandCover | null> | undefined

/** Clears module-level shared index & coarse promises (for offline tests). */
export function resetLandCoverCache(): void {
  indexPromise = undefined
  coarsePromise = undefined
}

/** What covers the ground at a point (index into `COVER`; `0` where unknown or outside loaded coverage). */
export interface LandCover {
  coverAt: (lat: number, lon: number) => number
}

export interface CoarseCoverJson {
  v: number
  bbox: [number, number, number, number] // [south, west, north, east]
  stepDeg: number
  rows: number
  cols: number
  r: string
}

/** Builds a `LandCover` lookup over a coarse RLE-encoded WorldCover overview grid. */
export function coarseCoverFromJson(raw: CoarseCoverJson): LandCover {
  const [south, west, north, east] = raw.bbox
  const grid = decodeLand(raw.r, raw.rows * raw.cols)
  const { stepDeg, rows, cols } = raw
  return {
    coverAt(lat, lon) {
      if (lat < south || lat >= north || lon < west || lon >= east) return 0
      const row = Math.min(rows - 1, Math.max(0, Math.floor((north - lat) / stepDeg)))
      const col = Math.min(cols - 1, Math.max(0, Math.floor((lon - west) / stepDeg)))
      return grid[row * cols + col]
    },
  }
}

/** Combines a high-resolution near `LandCover` with a coarser far-footprint `LandCover` (near wins when > 0). */
export function combineLandCovers(near: LandCover | null, far: LandCover | null): LandCover | null {
  if (!near) return far
  if (!far) return near
  return {
    coverAt(lat, lon) {
      const n = near.coverAt(lat, lon)
      return n > 0 ? n : far.coverAt(lat, lon)
    },
  }
}

/** Signal-independent shared loader that clears its cached slot on failure so later callers can retry. */
async function loadShared<T>(
  useCache: boolean,
  getSlot: () => Promise<T | null> | undefined,
  setSlot: (p: Promise<T | null> | undefined) => void,
  fetcher: () => Promise<T | null>,
  signal?: AbortSignal,
): Promise<T | null> {
  if (signal?.aborted) return null
  const run = async (): Promise<T | null> => {
    try {
      const res = await fetcher()
      if (res === null && useCache) setSlot(undefined)
      return res
    } catch {
      if (useCache) setSlot(undefined)
      return null
    }
  }
  const p = useCache ? (getSlot() ?? (() => { const next = run(); setSlot(next); return next })()) : run()
  const value = await p
  return signal?.aborted ? null : value
}

/** The high-res 50 m land-cover cells within `radiusKm` of a place, or null outside the static Israel tiles. */
export async function loadLandCover(
  place: Coordinate, signal?: AbortSignal, radiusKm = 6, fetchImpl: typeof fetch = fetch,
): Promise<LandCover | null> {
  const index = await loadShared(
    fetchImpl === fetch,
    () => indexPromise,
    (p) => { indexPromise = p },
    async () => {
      const r = await fetchImpl(`${ROOT}/index.json`)
      return r.ok ? ((await r.json()) as { cells: string[] }) : null
    },
    signal,
  )
  if (!index || signal?.aborted) return null
  const available = new Set(index.cells)
  const dLat = radiusKm / 111.32, dLon = radiusKm / (111.32 * Math.cos((place.lat * Math.PI) / 180))
  const keys: string[] = []
  for (let row = Math.floor((place.lat - dLat) * 10); row <= Math.floor((place.lat + dLat) * 10); row++) {
    for (let col = Math.floor((place.lon - dLon) * 10); col <= Math.floor((place.lon + dLon) * 10); col++) {
      if (available.has(`${row}_${col}`)) keys.push(`${row}_${col}`)
    }
  }
  if (!keys.length) return null
  const grids = new Map(await Promise.all(keys.map(async (key) => {
    const response = await fetchImpl(`${ROOT}/${key}.json`, { signal })
    if (!response.ok) throw new Error(`Land cell HTTP ${response.status}`)
    const cell = (await response.json()) as { v: number; r: string }
    return [key, decodeLand(cell.r)] as const
  })))
  const byNumber = new Map([...grids].map(([key, grid]) => {
    const [row, col] = key.split('_').map(Number)
    return [row * 10_000 + col, grid] as const
  }))
  return {
    coverAt(lat, lon) {
      const grid = byNumber.get(Math.floor(lat * 10) * 10_000 + Math.floor(lon * 10))
      if (!grid) return 0
      const row = LAND_N - 1 - Math.floor((lat - Math.floor(lat * 10) / 10) / LAND_STEP)
      const col = Math.floor((lon - Math.floor(lon * 10) / 10) / LAND_STEP)
      return grid[Math.max(0, Math.min(LAND_N - 1, row)) * LAND_N + Math.max(0, Math.min(LAND_N - 1, col))]
    },
  }
}

async function loadCoarseCover(signal?: AbortSignal, fetchImpl: typeof fetch = fetch): Promise<LandCover | null> {
  return loadShared(
    fetchImpl === fetch,
    () => coarsePromise,
    (p) => { coarsePromise = p },
    async () => {
      const res = await fetchImpl(`${ROOT}/coarse.json`)
      if (!res.ok) return null
      return coarseCoverFromJson((await res.json()) as CoarseCoverJson)
    },
    signal,
  )
}

/**
 * Loads WorldCover for both the ±6 km near window (50 m) and the ±60 km far panorama footprint
 * (via the compact 0.01° ≈ 1 km `coarse.json` overview); out-of-coverage points return class `0`.
 */
export async function loadFootprintLandCover(
  place: Coordinate, signal?: AbortSignal, nearRadiusKm = 6, fetchImpl: typeof fetch = fetch,
): Promise<LandCover | null> {
  const [near, coarse] = await Promise.all([
    loadLandCover(place, signal, nearRadiusKm, fetchImpl).catch(() => null),
    loadCoarseCover(signal, fetchImpl).catch(() => null),
  ])
  return combineLandCovers(near, coarse)
}
