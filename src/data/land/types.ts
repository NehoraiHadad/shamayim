import type { LandCover } from './landData'

/** Provenance tag carried on every land measurement or fallback value. */
export type LandSource =
  | `s2:${string}` | `s2-mean:${string}` | `gibs:${string}` | `open-meteo:${string}` | 'climatology'

/** Physical climate regime derived from coordinate-indexed Köppen–Geiger + elevation, never place names. */
export type ClimateZone =
  | 'arid' | 'semiarid' | 'mediterranean' | 'humid-subtropical' | 'temperate' | 'continental' | 'tropical' | 'alpine'

/** Acquisition date of one contributing Sentinel-2 STAC granule (`YYYY-MM-DD`, UTC). */
export interface AcquisitionMeta { date: string }

/** Near-field Sentinel-2 L2A grid (±5 km at 100 m steps) in its native UTM projection. */
export interface NearLandGrid {
  /** Newest contributing acquisition date (`YYYY-MM-DD`). */
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
  /** Area-weighted mean valid-ground sRGB bytes (`size * size * 3`), 0 when no valid RGB pixel. */
  rgb: Uint8Array
  /** Area-weighted mean valid-ground NDVI `[-1, 1]` (`size * size`), NaN when unavailable. */
  ndvi: Float32Array
  /** Area-weighted mean valid-ground NDSI `[-1, 1]` (`size * size`), NaN when unavailable. */
  ndsi: Float32Array
  /** Observed snow fraction from SCL class 11 among valid non-water pixels (`[0, 1]`, NaN when unknown). */
  snow: Float32Array
  /** Area-weighted SCL-valid and per-measurement support fractions `[0, 1]`. */
  valid: Float32Array
  rgbValid: Float32Array
  ndviValid: Float32Array
  ndsiValid: Float32Array
  /** Contributing granules; per-channel `*AcqIndex[i]` indexes here (`255` = none). */
  acquisitions: AcquisitionMeta[]
  /** RGB contributor index into `acquisitions` (`255` = none). */
  acqIndex: Uint8Array
  ndviAcqIndex: Uint8Array
  ndsiAcqIndex: Uint8Array
  snowAcqIndex: Uint8Array
}

/** One sampled cell from a `NearLandGrid`, with independent per-measurement validity and dates. */
export interface NearCell {
  rgb: [number, number, number] | null
  ndvi: number | null
  ndsi: number | null
  snow: number | null
  valid: number
  rgbValid: number
  ndviValid: number
  ndsiValid: number
  date: string
  source: `s2:${string}`
  rgbDate: string | null
  rgbSource: `s2:${string}` | null
  ndviDate: string | null
  ndviSource: `s2:${string}` | null
  ndsiDate: string | null
  ndsiSource: `s2:${string}` | null
  snowDate: string | null
  snowSource: `s2:${string}` | null
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

/** Combined living-land data bundle held per place (fields stay null until loaded). */
export interface LandData {
  cover: LandCover | null
  near: NearLandGrid | null
  far: FarLandGrid | null
  weather: RecentLandWeather | null
}
