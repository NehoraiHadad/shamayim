import type { CurrentWeather } from '../../domain/types'
import { expectUnit, num, obj, str, type Json } from './guards'

export function mapCurrent(raw: Json): CurrentWeather {
  const current = obj(raw.current, 'current')
  expectUnit(obj(raw.current_units ?? {}, 'current_units'), 'temperature_2m', '°C', 'current_units')

  return {
    time: str(current.time, 'current.time'),
    temperature: num(current.temperature_2m, 'current.temperature_2m'),
    feelsLike: num(current.apparent_temperature, 'current.apparent_temperature'),
    isDay: num(current.is_day, 'current.is_day') === 1,
    weatherCode: num(current.weather_code, 'current.weather_code'),
    cloudCover: num(current.cloud_cover, 'current.cloud_cover'),
    windSpeed: num(current.wind_speed_10m, 'current.wind_speed_10m'),
    windGusts: num(current.wind_gusts_10m, 'current.wind_gusts_10m'),
  }
}
