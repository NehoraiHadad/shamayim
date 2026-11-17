/**
 * Where weather data comes from. With `VITE_WEATHER_API_BASE` set at build time the app calls the Shamayim Worker
 * (`worker/`), a shared cache in front of Open-Meteo; without it, Open-Meteo directly (local dev, tests).
 */

export type WeatherEndpoint = 'forecast' | 'air-quality' | 'elevation'

const OPEN_METEO: Record<WeatherEndpoint, string> = {
  forecast: 'https://api.open-meteo.com/v1/forecast',
  'air-quality': 'https://air-quality-api.open-meteo.com/v1/air-quality',
  elevation: 'https://api.open-meteo.com/v1/elevation',
}

/** The endpoint URL for `query`; `base` defaults to the build-time variable, read at call time. */
export function weatherUrl(endpoint: WeatherEndpoint, query: URLSearchParams, base = import.meta.env.VITE_WEATHER_API_BASE): string {
  const root = base?.trim().replace(/\/+$/, '')
  const path = root ? `${root}/v1/${endpoint}` : OPEN_METEO[endpoint]
  return `${path}?${query}`
}

/**
 * When the data left Open-Meteo: the Worker's `X-Fetched-At` (a shared copy may be minutes old), else now.
 * Never later than now, so a clock ahead of the device's cannot make old data look newer.
 */
export function fetchedAtOf(headers: Headers, now = Date.now()): number {
  const value = Number(headers.get('X-Fetched-At'))
  return Number.isFinite(value) && value > 0 ? Math.min(value, now) : now
}
