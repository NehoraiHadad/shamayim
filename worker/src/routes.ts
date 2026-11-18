/**
 * The Open-Meteo endpoints the app uses, and exactly which query parameters each may carry.
 * Anything outside this table is refused, so the Worker is not an open proxy.
 */

import { normalsQuery, reduceNormals } from './normals'

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** How one query parameter is checked; the order of `params` is the order in the cache key and upstream URL. */
export type ParamSpec =
  | { kind: 'coord'; axis: 'lat' | 'lon' }
  | { kind: 'coordList'; axis: 'lat' | 'lon' }
  | { kind: 'int'; min: number; max: number }
  | { kind: 'enum'; values: readonly string[] }
  | { kind: 'list'; values: readonly string[] }
  | { kind: 'timezone' }

export interface Route {
  name: 'forecast' | 'air-quality' | 'elevation' | 'normals'
  upstream: string
  upstreamQuery?: (canonical: string) => string
  transform?: (body: string) => string
  params: Record<string, ParamSpec>
  required: readonly string[]
  /** Served from the shared cache without asking Open-Meteo while younger than this. */
  freshMs: number
  /** On an upstream failure, a cached copy up to this age is served instead (stale-if-error). */
  staleMs: number
}

const FORECAST_MODELS = ['icon_seamless', 'ecmwf_ifs025']
const CURRENT = [
  'temperature_2m', 'apparent_temperature', 'is_day', 'weather_code',
  'cloud_cover', 'wind_speed_10m', 'wind_gusts_10m', 'wind_direction_10m',
  'precipitation', 'snowfall', 'visibility', 'relative_humidity_2m',
]
const HOURLY = [
  'temperature_2m', 'precipitation_probability', 'precipitation', 'weather_code',
  'cloud_cover', 'wind_speed_10m', 'wind_gusts_10m', 'relative_humidity_2m', 'snow_depth',
]
const DAILY = [
  'weather_code', 'temperature_2m_max', 'temperature_2m_min',
  'precipitation_probability_max', 'precipitation_sum', 'wind_gusts_10m_max',
  'sunrise', 'sunset',
]
const AIR_HOURLY = ['pm10', 'dust', 'uv_index']

/** The app sends 41 points per elevation call; a little headroom, no more. */
export const MAX_ELEVATION_POINTS = 50

const LAT: ParamSpec = { kind: 'coord', axis: 'lat' }
const LON: ParamSpec = { kind: 'coord', axis: 'lon' }

export const ROUTES: Record<string, Route> = {
  '/v1/normals': {
    name: 'normals',
    upstream: 'https://archive-api.open-meteo.com/v1/archive',
    params: { latitude: LAT, longitude: LON },
    required: ['latitude', 'longitude'],
    freshMs: 365 * DAY,
    staleMs: Number.POSITIVE_INFINITY,
    upstreamQuery: normalsQuery,
    transform: reduceNormals,
  },
  '/v1/forecast': {
    name: 'forecast',
    upstream: 'https://api.open-meteo.com/v1/forecast',
    params: {
      latitude: LAT,
      longitude: LON,
      timezone: { kind: 'timezone' },
      models: { kind: 'list', values: FORECAST_MODELS },
      forecast_days: { kind: 'int', min: 1, max: 7 },
      past_days: { kind: 'int', min: 0, max: 1 },
      wind_speed_unit: { kind: 'enum', values: ['kmh'] },
      current: { kind: 'list', values: CURRENT },
      hourly: { kind: 'list', values: HOURLY },
      daily: { kind: 'list', values: DAILY },
      minutely_15: { kind: 'list', values: ['precipitation'] },
      forecast_minutely_15: { kind: 'int', min: 1, max: 16 },
    },
    required: ['latitude', 'longitude'],
    freshMs: 15 * MINUTE,
    staleMs: 12 * HOUR,
  },
  '/v1/air-quality': {
    name: 'air-quality',
    upstream: 'https://air-quality-api.open-meteo.com/v1/air-quality',
    params: {
      latitude: LAT,
      longitude: LON,
      timezone: { kind: 'timezone' },
      forecast_days: { kind: 'int', min: 1, max: 2 },
      hourly: { kind: 'list', values: AIR_HOURLY },
    },
    required: ['latitude', 'longitude'],
    freshMs: 60 * MINUTE,
    staleMs: 12 * HOUR,
  },
  '/v1/elevation': {
    name: 'elevation',
    upstream: 'https://api.open-meteo.com/v1/elevation',
    params: {
      latitude: { kind: 'coordList', axis: 'lat' },
      longitude: { kind: 'coordList', axis: 'lon' },
    },
    required: ['latitude', 'longitude'],
    freshMs: 30 * DAY,
    // Terrain does not change: any cached copy beats an error.
    staleMs: Number.POSITIVE_INFINITY,
  },
}

export function routeFor(pathname: string): Route | null {
  return Object.hasOwn(ROUTES, pathname) ? ROUTES[pathname] : null
}
