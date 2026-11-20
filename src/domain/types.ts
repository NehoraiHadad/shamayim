/** Local wall-clock timestamp in the place's timezone, e.g. "2026-11-16T14:00". */
export type LocalTime = string
/** Local date, e.g. "2026-11-16". */
export type LocalDate = string
export type Confidence = 'high' | 'medium' | 'low'

export interface CurrentWeather {
  time: LocalTime
  temperature: number
  feelsLike: number
  isDay: boolean
  weatherCode: number
  cloudCover: number
  /** Low and mid cloud together, 0–100 (what hides the moon; thin high cloud does not). Null when not known. */
  thickCloud?: number | null
  windSpeed: number
  windGusts: number
  /** Degrees the wind comes FROM (meteorological), 0 = north. */
  windDirection: number
  /** mm in the last interval (rain + showers + melted snow). */
  precipitation: number
  /** cm in the last interval. */
  snowfall: number
  /** metres; null when the model has none. */
  visibility: number | null
  /** Relative humidity, 0–100; null when unavailable. */
  humidity: number | null
}

export interface HourPoint {
  time: LocalTime
  temperature: number
  precipProb: number | null
  precipitation: number
  weatherCode: number
  cloudCover: number
  /** Low and mid cloud together, 0–100; null when not known. */
  thickCloud?: number | null
  windSpeed: number
  windGusts: number
  /** Relative humidity, 0–100; null when unavailable. */
  humidity: number | null
  /** Snow lying on the ground at the end of the hour, metres (0 when none or unknown). */
  snowDepth: number
  /**
   * Cloud by layer, 0–100 each (low < 2 km, mid 2–6 km, high above); null or absent when not known (an older cached
   * answer, or a model without them). Read by the canvas scene's world state (`src/world/clouds.ts`).
   */
  cloudLow?: number | null
  cloudMid?: number | null
  cloudHigh?: number | null
  /** Degrees the 10 m wind comes FROM (meteorological, 0 = north); null or absent when not asked or not known. */
  windDirection?: number | null
  /** Horizontal visibility, metres; null or absent when not asked or not known. */
  visibility?: number | null
  /**
   * Wind at the clouds' heights: 850 hPa (~1.5 km, low cloud), 700 hPa (~3 km, mid), 300 hPa (~9 km, high). Null or
   * absent when not asked or not known; the world then derives it from the 10 m wind (marked as a fallback).
   */
  windAloft?: { low: WindVector | null; mid: WindVector | null; high: WindVector | null } | null
  /**
   * The air at airliners' cruise level, 250 hPa (~10.4 km): temperature (°C) and relative humidity over water (%). Null or
   * absent when not asked or not known; the world then takes a climatological guess for contrails (marked as a fallback).
   */
  cruise?: { temperature: number; humidity: number } | null
}

/** A wind: speed in km/h and the direction it comes FROM (deg, 0 = north). */
export interface WindVector {
  speed: number
  fromDeg: number
}

export interface DayPoint {
  date: LocalDate
  weatherCode: number
  tempMax: number
  tempMin: number
  precipProbMax: number | null
  precipSum: number
  windGustsMax: number
  sunrise: LocalTime
  sunset: LocalTime
  /**
   * When the sun really comes over / goes behind the land around the place (later / earlier than the flat-horizon
   * times above behind a mountain). Set by the scene once the horizon panorama is known. Only the scene's sun, glow and
   * light go by it; every label ("זריחה"/"שקיעה", "אור יום") keeps the calendar times above
   * (docs/design/VISIBLE-SUN-WORDING.md).
   */
  visibleSunrise?: LocalTime
  visibleSunset?: LocalTime
  /** Days beyond the high-resolution ICON-EU horizon. */
  lowConfidence: boolean
  confidence: Confidence
  spread: { tempMax: number; tempMin: number; precipProb: number }
}

export interface AirPoint {
  time: LocalTime
  pm10: number | null
  dust: number | null
  uv: number | null
}

export interface Forecast {
  placeId: string
  elevation: number
  current: CurrentWeather
  hours: HourPoint[]
  /** Includes yesterday at index 0 (past_days=1). */
  days: DayPoint[]
  air: AirPoint[] | null
  nowcast: NowcastPoint[] | null
  normals: Record<LocalDate, DayNormal> | null
  fetchedAt: number
  source: string
  models: string[]
}

/** mm in the 15 minutes ending at time (local wall clock). */
export interface NowcastPoint {
  time: LocalTime
  precipitation: number
}

export interface DayNormal {
  tempMax: number
  tempMaxSd: number
  tempMin: number
  gustMax: number
  gustMaxSd: number
}
