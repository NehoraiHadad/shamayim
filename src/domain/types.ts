/** Local wall-clock timestamp in the place's timezone, e.g. "2026-11-16T14:00". */
export type LocalTime = string
/** Local date, e.g. "2026-11-16". */
export type LocalDate = string

export interface CurrentWeather {
  time: LocalTime
  temperature: number
  feelsLike: number
  isDay: boolean
  weatherCode: number
  cloudCover: number
  windSpeed: number
  windGusts: number
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
  fetchedAt: number
  source: string
}
