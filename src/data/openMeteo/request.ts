import type { Place } from '../../config/place'

export const FORECAST_MODEL = 'icon_seamless'
/** ICON-EU high-resolution horizon; later days come from ICON Global. */
export const HIGH_RES_DAYS = 5

const CURRENT = [
  'temperature_2m', 'apparent_temperature', 'is_day', 'weather_code',
  'cloud_cover', 'wind_speed_10m', 'wind_gusts_10m',
]
const HOURLY = [
  'temperature_2m', 'precipitation_probability', 'precipitation', 'weather_code',
  'cloud_cover', 'wind_speed_10m', 'wind_gusts_10m',
]
const DAILY = [
  'weather_code', 'temperature_2m_max', 'temperature_2m_min',
  'precipitation_probability_max', 'precipitation_sum', 'wind_gusts_10m_max',
  'sunrise', 'sunset',
]

function base(place: Place): URLSearchParams {
  return new URLSearchParams({
    latitude: String(place.lat),
    longitude: String(place.lon),
    timezone: place.timezone,
  })
}

export function forecastUrl(place: Place): string {
  const p = base(place)
  p.set('models', FORECAST_MODEL)
  p.set('forecast_days', '7')
  p.set('past_days', '1')
  p.set('wind_speed_unit', 'kmh')
  p.set('current', CURRENT.join(','))
  p.set('hourly', HOURLY.join(','))
  p.set('daily', DAILY.join(','))
  return `https://api.open-meteo.com/v1/forecast?${p}`
}

export function airUrl(place: Place): string {
  const p = base(place)
  p.set('forecast_days', '2')
  p.set('hourly', 'pm10,dust,uv_index')
  return `https://air-quality-api.open-meteo.com/v1/air-quality?${p}`
}
