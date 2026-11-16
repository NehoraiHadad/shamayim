import type { CurrentWeather, DayPoint, HourPoint } from '../../domain/types'
import { HIGH_RES_DAYS } from './request'
import { column, DataError, expectUnit, num, numOrNull, obj, str, type Json } from './guards'

export interface MappedForecast {
  elevation: number
  current: CurrentWeather
  hours: HourPoint[]
  days: DayPoint[]
}

function mapCurrent(raw: Json): CurrentWeather {
  const c = obj(raw.current, 'current')
  expectUnit(obj(raw.current_units ?? {}, 'current_units'), 'temperature_2m', '°C', 'current_units')
  return {
    time: str(c.time, 'current.time'),
    temperature: num(c.temperature_2m, 'current.temperature_2m'),
    feelsLike: num(c.apparent_temperature, 'current.apparent_temperature'),
    isDay: num(c.is_day, 'current.is_day') === 1,
    weatherCode: num(c.weather_code, 'current.weather_code'),
    cloudCover: num(c.cloud_cover, 'current.cloud_cover'),
    windSpeed: num(c.wind_speed_10m, 'current.wind_speed_10m'),
    windGusts: num(c.wind_gusts_10m, 'current.wind_gusts_10m'),
  }
}

function mapHours(raw: Json): HourPoint[] {
  const h = obj(raw.hourly, 'hourly')
  expectUnit(obj(raw.hourly_units ?? {}, 'hourly_units'), 'wind_speed_10m', 'km/h', 'hourly_units')
  const time = h.time
  if (!Array.isArray(time)) throw new DataError('hourly.time: missing')
  const n = time.length
  const col = (k: string) => column(h, k, n, 'hourly')
  const [t2m, pp, pr, wc, cc, ws, wg] = [
    'temperature_2m', 'precipitation_probability', 'precipitation', 'weather_code',
    'cloud_cover', 'wind_speed_10m', 'wind_gusts_10m',
  ].map(col)
  const out: HourPoint[] = []
  for (let i = 0; i < n; i++) {
    const temperature = numOrNull(t2m[i])
    if (temperature === null) continue // beyond model horizon
    out.push({
      time: str(time[i], `hourly.time[${i}]`),
      temperature,
      precipProb: numOrNull(pp[i]),
      precipitation: numOrNull(pr[i]) ?? 0,
      weatherCode: numOrNull(wc[i]) ?? 0,
      cloudCover: numOrNull(cc[i]) ?? 0,
      windSpeed: numOrNull(ws[i]) ?? 0,
      windGusts: numOrNull(wg[i]) ?? 0,
    })
  }
  return out
}

function mapDays(raw: Json, today: string): DayPoint[] {
  const d = obj(raw.daily, 'daily')
  const time = d.time
  if (!Array.isArray(time)) throw new DataError('daily.time: missing')
  const n = time.length
  const col = (k: string) => column(d, k, n, 'daily')
  const [wc, tmax, tmin, pp, ps, wg, sr, ss] = [
    'weather_code', 'temperature_2m_max', 'temperature_2m_min', 'precipitation_probability_max',
    'precipitation_sum', 'wind_gusts_10m_max', 'sunrise', 'sunset',
  ].map(col)
  const todayIndex = time.indexOf(today)
  return time.map((date, i) => ({
    date: str(date, `daily.time[${i}]`),
    weatherCode: num(wc[i], `daily.weather_code[${i}]`),
    tempMax: num(tmax[i], `daily.temperature_2m_max[${i}]`),
    tempMin: num(tmin[i], `daily.temperature_2m_min[${i}]`),
    precipProbMax: numOrNull(pp[i]),
    precipSum: numOrNull(ps[i]) ?? 0,
    windGustsMax: numOrNull(wg[i]) ?? 0,
    sunrise: str(sr[i], `daily.sunrise[${i}]`),
    sunset: str(ss[i], `daily.sunset[${i}]`),
    lowConfidence: todayIndex >= 0 && i - todayIndex >= HIGH_RES_DAYS,
  }))
}

export function mapForecast(input: unknown): MappedForecast {
  const raw = obj(input, 'forecast')
  const elevation = num(raw.elevation, 'elevation')
  if (elevation < -250 || elevation > -100) {
    console.warn(`[shamayim] unexpected elevation ${elevation} m for a Jordan Valley point`)
  }
  const current = mapCurrent(raw)
  return {
    elevation,
    current,
    hours: mapHours(raw),
    days: mapDays(raw, current.time.slice(0, 10)),
  }
}
