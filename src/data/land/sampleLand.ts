import { lookupCover, type CoverLookup } from './coverCodec'
import { computeCoverMeans, MIN_CELL_VALID, type CoverMean, type CoverMeansTable } from './coverMeans'
import { farAt, type FarSample } from './gibs'
import { nearAt } from './nearGrid'
import { drynessFromWeather } from './recentWeather'
import type { LandData, LandSource, NearCell } from './types'

/**
 * Lazy per-source living-land sampler prepared once per `LandData` bundle for `src/world/landSample.ts`,
 * which performs causal date-aware per-channel selection (`near S2 -> far GIBS -> s2-mean -> climatology`).
 */
export { computeCoverMeans, MIN_CELL_VALID, type CoverMean, type CoverMeansTable }

export interface PreparedWeather { dryness: number; source: LandSource; date: string }

export interface PreparedLandSampler {
  coverAt(lat: number, lon: number): CoverLookup
  nearAt(lat: number, lon: number): NearCell | null
  farAt(lat: number, lon: number): FarSample | null
  coverMeanAt(cover: number): { mean: CoverMean; tableDate: string } | null
  readonly weather: PreparedWeather | null
}

/** Prepares source-wide values once per `LandData` bundle and evaluates cover means lazily on demand. */
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

  return {
    weather,
    coverAt: (lat: number, lon: number): CoverLookup => lookupCover(data.cover, lat, lon),
    nearAt: (lat: number, lon: number): NearCell | null => (data.near ? nearAt(data.near, lat, lon) : null),
    farAt: (lat: number, lon: number): FarSample | null => (data.far ? farAt(data.far, lat, lon) : null),
    coverMeanAt: (cover: number): { mean: CoverMean; tableDate: string } | null => {
      const m = getMeans()
      const mean = m?.byCover[cover]
      return m && mean ? { mean, tableDate: m.date } : null
    },
  }
}
