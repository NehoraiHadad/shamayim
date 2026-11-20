import type { LandCover } from './landData'

/** Provenance tag carried on every land measurement or fallback value. */
export type LandSource =
  | `s2:${string}` | `s2-mean:${string}` | `gibs:${string}` | `open-meteo:${string}` | 'climatology'

/** Physical climate regime derived from coordinate-indexed Köppen–Geiger + elevation, never place names. */
export type ClimateZone =
  | 'arid' | 'semiarid' | 'mediterranean' | 'humid-subtropical' | 'temperate' | 'continental' | 'tropical' | 'alpine'

/** Solar geometry of one contributing Sentinel-2 STAC granule (degrees, from `view:sun_*`). */
export interface AcquisitionGeometry { sunElevation?: number; sunAzimuth?: number }

/** Near-field Sentinel-2 L2A grid (±5 km at 100 m steps) in its native UTM projection. */
export interface NearLandGrid {
  date: string
  source: `s2:${string}`
  fetchedAt: number
  lat: number
  lon: number
  /** Home UTM CRS in which the metric grid is aligned (eliminates meridian-convergence drift). */
  utmZone: number
  utmSouth: boolean
  /** West edge (easting, m) and north edge (northing, m) of cell `(0, 0)` in `(utmZone, utmSouth)`. */
  originE: number
  originN: number
  reachM: number
  stepM: number
  size: number
  /** Mean valid-ground sRGB bytes (`size * size * 3`), 0 when no valid RGB pixel. */
  rgb: Uint8Array
  /** Mean valid-ground NDVI `[-1, 1]` (`size * size`), NaN when unavailable. */
  ndvi: Float32Array
  /** Mean valid-ground NDSI `[-1, 1]` (`size * size`), NaN when unavailable. */
  ndsi: Float32Array
  /** Observed snow fraction from SCL class 11 among valid non-water pixels (`[0, 1]`, NaN when unknown). */
  snow: Float32Array
  /** SCL-valid and per-measurement overview support fractions `[0, 1]`. */
  valid: Float32Array
  rgbValid: Float32Array
  ndviValid: Float32Array
  ndsiValid: Float32Array
  /** Solar geometry of contributing granules; `acqIndex[i]` indexes here (`255` = none). */
  acquisitions: AcquisitionGeometry[]
  acqIndex: Uint8Array
  /** Dominant acquisition solar geometry (degrees, from STAC `view:sun_*`), for Stage 2 de-lighting. */
  sunElevation?: number
  sunAzimuth?: number
}

/** One sampled cell from a `NearLandGrid`, with independent per-measurement validity and solar geometry. */
export interface NearCell {
  rgb: [number, number, number] | null
  ndvi: number | null
  ndsi: number | null
  snow: number | null
  valid: number
  rgbValid: number
  ndviValid: number
  ndsiValid: number
  sunElevation?: number
  sunAzimuth?: number
  date: string
  source: `s2:${string}`
}

/** Far-field NASA GIBS grid (±60 km at 2 km steps) for panorama land tens of km out. */
export interface FarLandGrid {
  /** Rolling 8-day NDVI composite date (YYYY-MM-DD), or null if RGB-only. */
  date: string | null
  source: `gibs:${string}` | null
  /** Optional 8-day surface reflectance true-colour composite date (YYYY-MM-DD). */
  rgbDate?: string
  rgbSource?: `gibs:${string}`
  fetchedAt: number
  lat: number
  lon: number
  reachKm: number
  stepKm: number
  size: number
  ndvi: Float32Array
  rgb?: Uint8Array
}

/** Recent liquid precipitation, snowfall and soil moisture summary from Open-Meteo (`/v1/land-weather`). */
export interface RecentLandWeather {
  date: string
  source: `open-meteo:${string}`
  fetchedAt: number
  /** Total liquid rain (mm) over the past 14, 30 and 60 completed local days, or null when missing. */
  precip14dMm: number | null
  precip30dMm: number | null
  precip60dMm: number | null
  /** Fraction `[0, 1]` of completed days with valid precipitation observations in each window. */
  precipCoverage14d: number
  precipCoverage30d: number
  precipCoverage60d: number
  /** Total snowfall (cm) over the past 14 completed local days, or null if absent. */
  snowfall14dCm: number | null
  /** Whole days since the last completed day with ≥ 1 mm liquid rain, or null if dry/unavailable. */
  daysSinceRain: number | null
  soilMoistureTop: number | null
  soilMoistureRoot: number | null
}

/** Resolved land properties at one coordinate, with explicit provenance and observation date per value. */
export interface LandSample {
  /** WorldCover class index (`1..10`), or null outside loaded coverage / unknown class 0. */
  cover: number | null
  rgb: [number, number, number]
  rgbSource: LandSource
  rgbDate: string | null
  ndvi: number
  ndviSource: LandSource
  ndviDate: string | null
  ndsi: number | null
  ndsiSource: LandSource | null
  ndsiDate: string | null
  dryness: number
  drynessSource: LandSource
  drynessDate: string | null
  snowProb: number
  snowSource: LandSource
  snowDate: string | null
  valid: number
}

/** Combined living-land data bundle held per place (fields stay null until loaded). */
export interface LandData {
  cover: LandCover | null
  near: NearLandGrid | null
  far: FarLandGrid | null
  weather: RecentLandWeather | null
}
