import type { DayPoint, Forecast, HourPoint } from '../domain/types'

const pad = (n: number) => String(n).padStart(2, '0')
const DATES = ['2026-07-14', '2026-07-15', '2026-07-16', '2026-07-17']

export interface DaySpec {
  max: number
  min: number
  code?: number
  /** Per-hour overrides by hour of day. */
  hour?: (h: number) => Partial<HourPoint>
}

/** Build a synthetic forecast: index 0 = yesterday, 1 = today, 2 = tomorrow, 3 = day after. */
export function makeForecast(
  days: DaySpec[], pm10?: (date: string, h: number) => number,
  optional: Partial<Pick<Forecast, 'nowcast' | 'normals'>> = {},
): Forecast {
  const hours: HourPoint[] = []
  const dayPoints: DayPoint[] = days.map((spec, i) => {
    const date = DATES[i]
    for (let h = 0; h < 24; h++) {
      const overrides = spec.hour?.(h) ?? {}
      // Simple diurnal curve: min at 05:00, max at 14:00.
      const phase = Math.max(0, Math.sin(((h - 5) / 18) * Math.PI))
      hours.push({
        time: `${date}T${pad(h)}:00`,
        temperature: spec.min + (spec.max - spec.min) * phase,
        precipProb: 0,
        precipitation: 0,
        weatherCode: spec.code ?? 0,
        cloudCover: 5,
        windSpeed: 8,
        windGusts: 15,
        ...overrides,
        humidity: overrides.humidity === undefined ? 40 : overrides.humidity,
      })
    }
    return {
      date,
      weatherCode: spec.code ?? 0,
      tempMax: spec.max,
      tempMin: spec.min,
      precipProbMax: 0,
      precipSum: 0,
      windGustsMax: 15,
      sunrise: `${date}T05:40`,
      sunset: `${date}T19:45`,
      lowConfidence: false,
      confidence: 'high',
      spread: { tempMax: 0, tempMin: 0, precipProb: 0 },
    }
  })
  const air = pm10
    ? hours.map((h) => ({ time: h.time, pm10: pm10(h.time.slice(0, 10), Number(h.time.slice(11, 13))), dust: null, uv: null }))
    : null
  return {
    placeId: 'test',
    elevation: -175,
    current: {
      time: `${DATES[1]}T09:00`, temperature: 30, feelsLike: 30, isDay: true,
      weatherCode: 0, cloudCover: 5, windSpeed: 8, windGusts: 15,
      windDirection: 300, precipitation: 0, snowfall: 0, visibility: 24000,
      humidity: 40,
    },
    hours,
    days: dayPoints,
    air,
    normals: optional.normals ?? null,
    nowcast: optional.nowcast ?? null,
    fetchedAt: 0,
    source: 'test',
    models: ['test'],
  }
}

export const TODAY = DATES[1]
