import type { LandCover } from './landData'

/** Provenance tag carried on every land measurement or fallback value. */
export type LandSource =
  | `s2:${string}`
  | `s2-mean:${string}`
  | `gibs:${string}`
  | `open-meteo:${string}`
  | 'climatology'

/** Broad physical climate zone derived solely from (lat, lon, elevationM), never place names. */
export type ClimateZone = 'arid' | 'semiarid' | 'mediterranean' | 'temperate' | 'tropical' | 'alpine'

/** Near-field Sentinel-2 L2A grid (±5 km at 100 m steps), SCL-masked and BOA-offset-corrected. */
export interface NearLandGrid {
  /** UTC acquisition date (YYYY-MM-DD). */
  date: string
  source: `s2:${string}`
  fetchedAt: number
  lat: number
  lon: number
  /** Half-side of the window in metres (default 5000). */
  reachM: number
  /** Cell size in metres (default 100). */
  stepM: number
  /** Grid cells along each side (`size × size`, row-major from north-west). */
  size: number
  /** Mean valid-ground sRGB bytes (`size * size * 3`), 0 when no valid pixel. */
  rgb: Uint8Array
  /** Mean valid-ground NDVI `[-1, 1]` (`size * size`), NaN when unavailable. */
  ndvi: Float32Array
  /** Mean valid-ground NDSI `[-1, 1]` (`size * size`), NaN when unavailable. */
  ndsi: Float32Array
  /** Fraction of SCL-valid ground pixels in each cell `[0, 1]` (`size * size`). */
  valid: Float32Array
  /** Solar geometry at acquisition (degrees, from STAC `view:sun_*`), for Stage 2 de-lighting. */
  sunElevation?: number
  sunAzimuth?: number
}

/** One sampled cell from a `NearLandGrid`. */
export interface NearCell {
  rgb: [number, number, number]
  ndvi: number | null
  ndsi: number | null
  valid: number
  source: `s2:${string}`
}

/** Far-field NASA GIBS grid (±60 km at 2 km steps) for panorama land tens of km out. */
export interface FarLandGrid {
  /** Rolling 8-day NDVI composite date (YYYY-MM-DD). */
  date: string
  source: `gibs:${string}`
  /** Optional 8-day surface reflectance true-colour composite date (YYYY-MM-DD). */
  rgbDate?: string
  rgbSource?: `gibs:${string}`
  fetchedAt: number
  lat: number
  lon: number
  reachKm: number
  stepKm: number
  size: number
  /** NDVI `[-0.2, 1]` (`size * size`, row-major from north-west), NaN where nodata. */
  ndvi: Float32Array
  /** Optional true-colour sRGB bytes (`size * size * 3`), 0 where missing. */
  rgb?: Uint8Array
}

/** Recent precipitation and soil moisture summary from Open-Meteo (via the Worker allowlist). */
export interface RecentLandWeather {
  /** Local date of the observation (YYYY-MM-DD). */
  date: string
  source: `open-meteo:${string}`
  fetchedAt: number
  /** Total precipitation (mm) over the past 14, 30 and 60 completed days. */
  precip14dMm: number
  precip30dMm: number
  precip60dMm: number
  /** Whole days since the last day with ≥ 1 mm rain, or null if dry across the 60-day window. */
  daysSinceRain: number | null
  /** Volumetric soil moisture (m³/m³) in the top 0–3 cm layer, or null if absent. */
  soilMoistureTop: number | null
  /** Volumetric soil moisture (m³/m³) in the 3–27 cm root zone, or null if absent. */
  soilMoistureRoot: number | null
}

/** Resolved land properties at one coordinate, with explicit provenance on every value. */
export interface LandSample {
  rgb: [number, number, number]
  rgbSource: LandSource
  ndvi: number
  ndviSource: LandSource
  ndsi: number | null
  ndsiSource: LandSource
  dryness: number
  drynessSource: LandSource
  snowProb: number
  snowSource: LandSource
  valid: number
  date: string | null
}

/** Combined living-land data bundle held per place (fields stay null until loaded). */
export interface LandData {
  cover: LandCover | null
  near: NearLandGrid | null
  far: FarLandGrid | null
  weather: RecentLandWeather | null
}
