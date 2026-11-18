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
  windSpeed: number
  windGusts: number
  /** Relative humidity, 0–100; null when unavailable. */
  humidity: number | null
  /** Snow lying on the ground at the end of the hour, metres (0 when none or unknown). */
  snowDepth: number
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
