import type { CurrentWeather } from '../../domain/types'
import { expectUnit, num, numOrNull, obj, str, type Json } from './guards'
import { thickCloud } from './mapHelpers'

export function mapCurrent(raw: Json): CurrentWeather {
  const current = obj(raw.current, 'current')
  expectUnit(obj(raw.current_units ?? {}, 'current_units'), 'temperature_2m', '°C', 'current_units')

  const cloudLow = numOrNull(current.cloud_cover_low)
  const cloudMid = numOrNull(current.cloud_cover_mid)

  return {
    time: str(current.time, 'current.time'),
    temperature: num(current.temperature_2m, 'current.temperature_2m'),
    feelsLike: num(current.apparent_temperature, 'current.apparent_temperature'),
    isDay: num(current.is_day, 'current.is_day') === 1,
    weatherCode: num(current.weather_code, 'current.weather_code'),
    cloudCover: num(current.cloud_cover, 'current.cloud_cover'),
    thickCloud: thickCloud(cloudLow, cloudMid),
    cloudLow,
    cloudMid,
    windSpeed: num(current.wind_speed_10m, 'current.wind_speed_10m'),
    windGusts: num(current.wind_gusts_10m, 'current.wind_gusts_10m'),
    windDirection: numOrNull(current.wind_direction_10m) ?? 0,
    precipitation: numOrNull(current.precipitation) ?? 0,
    snowfall: numOrNull(current.snowfall) ?? 0,
    visibility: numOrNull(current.visibility),
    humidity: numOrNull(current.relative_humidity_2m),
  }
}
