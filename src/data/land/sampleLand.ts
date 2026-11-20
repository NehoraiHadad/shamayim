import { climatologyAt, type ClimatologySample } from './climatology'
import { computeCoverMeans, MIN_CELL_VALID, type CoverMean, type CoverMeansTable } from './coverMeans'
import { farAt } from './gibs'
import { nearAt } from './nearGrid'
import { drynessFromWeather } from './recentWeather'
import type { LandData, LandSample, LandSource } from './types'

/**
 * Unified living-land sampler with explicit provenance & observation date on every resolved value.
 *
 * Fallback priority (evaluated lazily per channel so direct near-S2 hits skip far/mean/climatology):
 * - RGB albedo: near S2 (`s2:<rgbDate>`) → far GIBS SR (`gibs:<rgbDate>`) → per-cover S2 mean
 *   (`s2-mean:<rgbDate>`, known WorldCover classes `1..10` only) → climatology.
 * - NDVI: near S2 (`s2:<ndviDate>`) → far GIBS NDVI (`gibs:<date>`) → per-cover S2 mean → climatology.
 * - NDSI: near S2 (`s2:<ndsiDate>`) only; missing NDSI is explicit (`ndsi: null, ndsiSource: null`).
 * - Snow: near S2 SCL-11 land fraction (`s2:<snowDate>`, open water SCL-6 = 0) → elevation-aware climatology.
 * - Dryness: precomputed Open-Meteo liquid rain + soil moisture (`open-meteo:<date>`) → climatology.
 */
export { computeCoverMeans, MIN_CELL_VALID, type CoverMean, type CoverMeansTable }

export interface PreparedLandSampler {
  sampleAt(lat: number, lon: number, month: number, elevationM?: number): LandSample
}

const SAMPLER_CACHE = new WeakMap<LandData, PreparedLandSampler>()

/** Prepares source-wide values once per `LandData` bundle and evaluates fallbacks lazily on demand. */
export function prepareLandSampler(data: LandData): PreparedLandSampler {
  const weatherDryness = data.weather ? drynessFromWeather(data.weather) : null
  const weatherSource = weatherDryness !== null && data.weather ? data.weather.source : null
  const weatherDate = weatherDryness !== null && data.weather ? data.weather.date : null
  let means: CoverMeansTable | null | undefined

  const getMeans = (): CoverMeansTable | null => {
    if (means === undefined) means = data.near && data.cover ? computeCoverMeans(data.near, data.cover) : null
    return means
  }

  return {
    sampleAt(lat: number, lon: number, month: number, elevationM = 0): LandSample {
      const rawCover = data.cover ? data.cover.coverAt(lat, lon) : 0
      const cover = rawCover > 0 ? rawCover : null
      const near = data.near ? nearAt(data.near, lat, lon) : null

      let rgb: [number, number, number] | null = null
      let rgbSource: LandSource = 'climatology'
      let rgbDate: string | null = null
      if (near && near.rgb && near.rgbValid >= MIN_CELL_VALID && near.rgbSource) {
        rgb = near.rgb; rgbSource = near.rgbSource; rgbDate = near.rgbDate
      }

      let ndvi: number | null = null
      let ndviSource: LandSource = 'climatology'
      let ndviDate: string | null = null
      if (near && near.ndvi !== null && near.ndviValid >= MIN_CELL_VALID && near.ndviSource) {
        ndvi = near.ndvi; ndviSource = near.ndviSource; ndviDate = near.ndviDate
      }

      if (rgb === null || ndvi === null) {
        const far = data.far ? farAt(data.far, lat, lon) : null
        if (rgb === null && far?.rgb && far.rgbSource) {
          rgb = far.rgb; rgbSource = far.rgbSource; rgbDate = far.rgbDate
        }
        if (ndvi === null && far?.ndvi !== null && far?.ndvi !== undefined && far.ndviSource) {
          ndvi = far.ndvi; ndviSource = far.ndviSource; ndviDate = far.ndviDate
        }
      }

      if ((rgb === null || ndvi === null) && cover !== null) {
        const m = getMeans()
        const cm = m?.byCover[cover] ?? null
        if (rgb === null && cm?.rgb && m) {
          const d = cm.rgbDate ?? m.date
          rgb = cm.rgb; rgbSource = `s2-mean:${d}`; rgbDate = d
        }
        if (ndvi === null && cm?.ndvi !== null && cm?.ndvi !== undefined && m) {
          const d = cm.ndviDate ?? m.date
          ndvi = cm.ndvi; ndviSource = `s2-mean:${d}`; ndviDate = d
        }
      }

      const hasNearNdsi = Boolean(near && near.ndsi !== null && near.ndsiValid >= MIN_CELL_VALID && near.ndsiSource)
      const ndsi = hasNearNdsi ? near!.ndsi : null
      const ndsiSource: LandSource | null = hasNearNdsi ? near!.ndsiSource : null
      const ndsiDate: string | null = hasNearNdsi ? near!.ndsiDate : null

      const hasNearSnow = Boolean(near && near.snow !== null && near.valid >= MIN_CELL_VALID && near.snowSource)
      let snowProb = hasNearSnow ? near!.snow! : -1
      let snowSource: LandSource = hasNearSnow ? near!.snowSource! : 'climatology'
      let snowDate: string | null = hasNearSnow ? near!.snowDate : null

      let dryness = weatherDryness
      let drynessSource: LandSource = weatherSource ?? 'climatology'
      let drynessDate: string | null = weatherDate

      if (rgb === null || ndvi === null || dryness === null || snowProb < 0) {
        const clim: ClimatologySample = climatologyAt(lat, lon, elevationM, month, rawCover)
        if (rgb === null) { rgb = clim.rgb; rgbSource = 'climatology'; rgbDate = null }
        if (ndvi === null) { ndvi = clim.ndvi; ndviSource = 'climatology'; ndviDate = null }
        if (dryness === null) { dryness = clim.dryness; drynessSource = 'climatology'; drynessDate = null }
        if (snowProb < 0) { snowProb = clim.snowProb; snowSource = 'climatology'; snowDate = null }
      }

      return {
        cover, rgb, rgbSource, rgbDate, ndvi, ndviSource, ndviDate,
        ndsi, ndsiSource, ndsiDate, dryness, drynessSource, drynessDate,
        snowProb, snowSource, snowDate,
        valid: near ? near.valid : 1,
      }
    },
  }
}

/** Samples living-land properties at `(lat, lon)` through the full lazy fallback chain. */
export function sampleLandAt(
  data: LandData, lat: number, lon: number, month: number, elevationM = 0,
): LandSample {
  let sampler = SAMPLER_CACHE.get(data)
  if (!sampler) { sampler = prepareLandSampler(data); SAMPLER_CACHE.set(data, sampler) }
  return sampler.sampleAt(lat, lon, month, elevationM)
}
