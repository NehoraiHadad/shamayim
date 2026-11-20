import { climatologyAt, type ClimatologySample } from './climatology'
import { lookupCover, type CoverLookup } from './coverCodec'
import { computeCoverMeans, MIN_CELL_VALID, type CoverMean, type CoverMeansTable } from './coverMeans'
import { farAt, type FarSample } from './gibs'
import { nearAt } from './nearGrid'
import { drynessFromWeather } from './recentWeather'
import type { LandData, LandSample, LandSource, NearCell } from './types'

/**
 * Unified living-land sampler with explicit provenance & observation date on every resolved value.
 *
 * `sampleAt` applies stateless spatial priority (`near S2 → far GIBS → s2-mean → climatology`);
 * `PreparedLandSampler` also exposes lazy per-source accessors so Stage 2 (`src/world/landSample.ts`)
 * can make date-aware per-channel priority decisions (preferring fresh GIBS over stale/future near S2).
 */
export { computeCoverMeans, MIN_CELL_VALID, type CoverMean, type CoverMeansTable }

export interface PreparedWeather { dryness: number; source: LandSource; date: string }

export interface PreparedLandSampler {
  sampleAt(lat: number, lon: number, month: number, elevationM?: number): LandSample
  coverAt(lat: number, lon: number): CoverLookup
  nearAt(lat: number, lon: number): NearCell | null
  farAt(lat: number, lon: number): FarSample | null
  coverMeanAt(cover: number): { mean: CoverMean; tableDate: string } | null
  readonly weather: PreparedWeather | null
}

const SAMPLER_CACHE = new WeakMap<LandData, PreparedLandSampler>()

/** Prepares source-wide values once per `LandData` bundle and evaluates fallbacks lazily on demand. */
export function prepareLandSampler(data: LandData): PreparedLandSampler {
  const weatherDryness = data.weather ? drynessFromWeather(data.weather) : null
  const weather: PreparedWeather | null = weatherDryness !== null && data.weather
    ? { dryness: weatherDryness, source: data.weather.source, date: data.weather.date }
    : null
  let means: CoverMeansTable | null | undefined

  const getMeans = (): CoverMeansTable | null => {
    if (means === undefined) means = data.near && data.cover ? computeCoverMeans(data.near, data.cover) : null
    return means
  }
  const coverLookup = (lat: number, lon: number): CoverLookup => lookupCover(data.cover, lat, lon)
  const nearLookup = (lat: number, lon: number): NearCell | null => (data.near ? nearAt(data.near, lat, lon) : null)
  const farLookup = (lat: number, lon: number): FarSample | null => (data.far ? farAt(data.far, lat, lon) : null)
  const coverMeanAt = (cover: number): { mean: CoverMean; tableDate: string } | null => {
    const m = getMeans()
    const mean = m?.byCover[cover]
    return m && mean ? { mean, tableDate: m.date } : null
  }

  return {
    weather,
    coverAt: coverLookup,
    nearAt: nearLookup,
    farAt: farLookup,
    coverMeanAt,
    sampleAt(lat: number, lon: number, month: number, elevationM = 0): LandSample {
      const { cover, source: coverSource } = coverLookup(lat, lon)
      const near = nearLookup(lat, lon)

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
        const far = farLookup(lat, lon)
        if (rgb === null && far?.rgb && far.rgbSource) {
          rgb = far.rgb; rgbSource = far.rgbSource; rgbDate = far.rgbDate
        }
        if (ndvi === null && far?.ndvi !== null && far?.ndvi !== undefined && far.ndviSource) {
          ndvi = far.ndvi; ndviSource = far.ndviSource; ndviDate = far.ndviDate
        }
      }

      if ((rgb === null || ndvi === null) && cover !== null) {
        const hit = coverMeanAt(cover)
        if (hit) {
          if (rgb === null && hit.mean.rgb) {
            const d = hit.mean.rgbDate ?? hit.tableDate
            rgb = hit.mean.rgb; rgbSource = `s2-mean:${d}`; rgbDate = d
          }
          if (ndvi === null && hit.mean.ndvi !== null) {
            const d = hit.mean.ndviDate ?? hit.tableDate
            ndvi = hit.mean.ndvi; ndviSource = `s2-mean:${d}`; ndviDate = d
          }
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

      let dryness = weather?.dryness ?? null
      let drynessSource: LandSource = weather?.source ?? 'climatology'
      let drynessDate: string | null = weather?.date ?? null

      if (rgb === null || ndvi === null || dryness === null || snowProb < 0) {
        const clim: ClimatologySample = climatologyAt(lat, lon, elevationM, month, cover ?? 0)
        if (rgb === null) { rgb = clim.rgb; rgbSource = 'climatology'; rgbDate = null }
        if (ndvi === null) { ndvi = clim.ndvi; ndviSource = 'climatology'; ndviDate = null }
        if (dryness === null) { dryness = clim.dryness; drynessSource = 'climatology'; drynessDate = null }
        if (snowProb < 0) { snowProb = clim.snowProb; snowSource = 'climatology'; snowDate = null }
      }

      return {
        cover, coverSource, rgb, rgbSource, rgbDate,
        ndvi, ndviSource, ndviDate,
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
