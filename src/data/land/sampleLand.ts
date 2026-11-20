import { climatologyAt } from './climatology'
import { farAt } from './gibs'
import type { LandCover } from './landData'
import { drynessFromWeather } from './recentWeather'
import { nearAt } from './satellite'
import type { LandData, LandSample, LandSource, NearLandGrid } from './types'

/**
 * Unified living-land sampler with an explicit fallback chain and source flags on every value.
 *
 * Fallback priority:
 * - RGB albedo: near S2 cell (`s2:<date>`) → far GIBS 8-day SR (`gibs:<date>`) →
 *   per-cover S2 mean (`s2-mean:<date>`) → regional seasonal climatology (`climatology`).
 * - NDVI: near S2 cell (`s2:<date>`) → far GIBS 8-day NDVI (`gibs:<date>`) →
 *   per-cover S2 mean (`s2-mean:<date>`) → climatology (`climatology`).
 * - NDSI / snow: near S2 cell (`s2:<date>`, snow probability ramped around Hall et al. 1995
 *   threshold NDSI ≥ 0.40) → per-cover S2 mean (`s2-mean:<date>`) → climatology (`climatology`).
 * - Dryness: Open-Meteo recent precip + soil moisture (`open-meteo:<date>`) → climatology.
 */

/** Minimum valid SCL pixel fraction in a 100 m S2 cell to trust it over coarser fallbacks. */
export const MIN_CELL_VALID = 0.2
const MIN_COVER_SAMPLES = 8

export interface CoverMean {
  rgb: [number, number, number]
  ndvi: number | null
  ndsi: number | null
  count: number
}

export interface CoverMeansTable {
  date: string
  source: `s2-mean:${string}`
  byCover: Record<number, CoverMean>
}

const MEANS_CACHE = new WeakMap<NearLandGrid, WeakMap<LandCover, CoverMeansTable>>()

/** Computes per-WorldCover-class mean RGB, NDVI and NDSI across a near Sentinel-2 window. */
export function computeCoverMeans(near: NearLandGrid, cover: LandCover): CoverMeansTable {
  let inner = MEANS_CACHE.get(near)
  const hit = inner?.get(cover)
  if (hit) return hit

  const acc: Record<number, { r: number; g: number; b: number; rgbN: number; ndvi: number; ndviN: number; ndsi: number; ndsiN: number }> = {}
  const cosLat = Math.cos((near.lat * Math.PI) / 180)
  // Sample every 2nd cell (50 × 50 = 2500 samples) for fast, representative per-cover statistics.
  const stride = Math.max(1, Math.floor(near.size / 50))
  for (let row = 0; row < near.size; row += stride) {
    const lat = near.lat + (near.reachM - (row + 0.5) * near.stepM) / 111_320
    for (let col = 0; col < near.size; col += stride) {
      const idx = row * near.size + col
      if (near.valid[idx] < MIN_CELL_VALID) continue
      const o = idx * 3
      const r = near.rgb[o], g = near.rgb[o + 1], b = near.rgb[o + 2]
      if (!r && !g && !b) continue
      const lon = near.lon + ((col + 0.5) * near.stepM - near.reachM) / (111_320 * cosLat)
      const cls = cover.coverAt(lat, lon)
      const slot = (acc[cls] ??= { r: 0, g: 0, b: 0, rgbN: 0, ndvi: 0, ndviN: 0, ndsi: 0, ndsiN: 0 })
      slot.r += r; slot.g += g; slot.b += b; slot.rgbN++
      if (Number.isFinite(near.ndvi[idx])) { slot.ndvi += near.ndvi[idx]; slot.ndviN++ }
      if (Number.isFinite(near.ndsi[idx])) { slot.ndsi += near.ndsi[idx]; slot.ndsiN++ }
    }
  }

  const byCover: Record<number, CoverMean> = {}
  for (const [k, s] of Object.entries(acc)) {
    if (s.rgbN < MIN_COVER_SAMPLES) continue
    byCover[Number(k)] = {
      rgb: [Math.round(s.r / s.rgbN), Math.round(s.g / s.rgbN), Math.round(s.b / s.rgbN)],
      ndvi: s.ndviN >= MIN_COVER_SAMPLES ? s.ndvi / s.ndviN : null,
      ndsi: s.ndsiN >= MIN_COVER_SAMPLES ? s.ndsi / s.ndsiN : null,
      count: s.rgbN,
    }
  }

  const table: CoverMeansTable = { date: near.date, source: `s2-mean:${near.date}`, byCover }
  if (!inner) { inner = new WeakMap(); MEANS_CACHE.set(near, inner) }
  inner.set(cover, table)
  return table
}

/** Converts NDSI to snow probability around the Hall et al. (1995) NDSI ≥ 0.40 snow threshold. */
function snowProbFromNdsi(ndsi: number): number {
  if (ndsi <= 0.25) return 0
  if (ndsi >= 0.55) return 1
  return (ndsi - 0.25) / 0.3
}

/** Samples living-land properties at `(lat, lon)` through the full fallback chain. */
export function sampleLandAt(
  data: LandData, lat: number, lon: number, month: number, elevationM = 0,
): LandSample {
  const coverCls = data.cover?.coverAt(lat, lon) ?? 3
  const clim = climatologyAt(lat, lon, elevationM, month, coverCls)
  const nearRaw = data.near ? nearAt(data.near, lat, lon) : null
  const near = nearRaw && nearRaw.valid >= MIN_CELL_VALID ? nearRaw : null
  const far = data.far ? farAt(data.far, lat, lon) : null
  const means = data.near && data.cover ? computeCoverMeans(data.near, data.cover) : null
  const coverMean = means?.byCover[coverCls] ?? null

  let rgb: [number, number, number] = clim.rgb
  let rgbSource: LandSource = 'climatology'
  if (near) { rgb = near.rgb; rgbSource = near.source }
  else if (far?.rgb && far.rgbSource) { rgb = far.rgb; rgbSource = far.rgbSource }
  else if (coverMean && means) { rgb = coverMean.rgb; rgbSource = means.source }

  let ndvi = clim.ndvi
  let ndviSource: LandSource = 'climatology'
  if (near?.ndvi !== null && near?.ndvi !== undefined) { ndvi = near.ndvi; ndviSource = near.source }
  else if (far?.ndvi !== null && far?.ndvi !== undefined) { ndvi = far.ndvi; ndviSource = far.source }
  else if (coverMean?.ndvi !== null && coverMean?.ndvi !== undefined && means) { ndvi = coverMean.ndvi; ndviSource = means.source }

  let ndsi: number | null = null
  let ndsiSource: LandSource = 'climatology'
  let snowProb = clim.snowProb
  let snowSource: LandSource = 'climatology'
  if (near?.ndsi !== null && near?.ndsi !== undefined) {
    ndsi = near.ndsi; ndsiSource = near.source
    snowProb = snowProbFromNdsi(near.ndsi); snowSource = near.source
  } else if (coverMean?.ndsi !== null && coverMean?.ndsi !== undefined && means) {
    ndsi = coverMean.ndsi; ndsiSource = means.source
    snowProb = snowProbFromNdsi(coverMean.ndsi); snowSource = means.source
  }

  const dryness = data.weather ? drynessFromWeather(data.weather) : clim.dryness
  const drynessSource: LandSource = data.weather ? data.weather.source : 'climatology'
  const date = near ? data.near!.date : far ? data.far!.date : coverMean ? means!.date : null

  return {
    rgb, rgbSource, ndvi, ndviSource, ndsi, ndsiSource,
    dryness, drynessSource, snowProb, snowSource,
    valid: near ? near.valid : 1,
    date,
  }
}
