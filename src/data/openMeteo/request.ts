import type { Place } from '../../config/place'
import { weatherUrl } from '../weatherApi'

export const FORECAST_MODELS = 'icon_seamless,ecmwf_ifs025'

export const CURRENT = [
  'temperature_2m', 'apparent_temperature', 'is_day', 'weather_code',
  'cloud_cover', 'wind_speed_10m', 'wind_gusts_10m', 'wind_direction_10m',
  'precipitation', 'snowfall', 'visibility', 'relative_humidity_2m',
  // Cloud by layer: the moon shines through thin high cloud, not through low and mid cloud. The Worker must list
  // these before this ships (README: "Order when the app asks Open-Meteo for something new").
  'cloud_cover_low', 'cloud_cover_mid', 'cloud_cover_high',
]
export const HOURLY = [
  'temperature_2m', 'precipitation_probability', 'precipitation', 'weather_code',
  'cloud_cover', 'wind_speed_10m', 'wind_gusts_10m',
  'relative_humidity_2m', 'snow_depth',
  'cloud_cover_low', 'cloud_cover_mid', 'cloud_cover_high',
]
/**
 * Hourly fields the canvas scene's world state reads (`src/world/`, docs/design/CANVAS-SCENE-PLAN.md §1a): the wind's
 * direction, the visibility and the wind at cloud heights of each hour. The Worker's allowlist lists them (`worker/src/routes.ts`), but the
 * deployed Worker must know them before the app asks (README: "Order when the app asks Open-Meteo for something new"),
 * or every forecast gets a 400. So they stay off until the Worker is deployed and checked; until then the world falls
 * back to the current wind direction, to visibility from humidity and to the wind aloft from the 10 m wind
 * (`src/world/air.ts`, `wind.ts`).
 */
export const SCENE_HOURLY = [
  'wind_direction_10m', 'visibility',
  // Wind at the clouds' heights (low, mid, high cloud drift with it): owner decision 2026-11-19.
  'wind_speed_850hPa', 'wind_direction_850hPa', 'wind_speed_700hPa', 'wind_direction_700hPa',
  'wind_speed_300hPa', 'wind_direction_300hPa',
  // C10: the air at airliners' cruise level (250 hPa, ~10.4 km): whether a plane leaves a contrail (Schmidt–Appleman) and
  // whether it persists (ice supersaturation). Absent, the world takes a climatological guess (`world/contrails.ts`).
  'temperature_250hPa', 'relative_humidity_250hPa',
] as const
/** Flip to true once the deployed Worker answers `hourly=wind_direction_10m,visibility,wind_speed_850hPa` with 200. */
export const ASK_SCENE_HOURLY = true
/**
 * The storm's fuel (CAPE, J/kg) and the freezing level (m): how convective an hour's cloud is beyond what its weather code
 * says. Without them the code alone decides (`atmo/fieldWeather.ts`).
 */
export const STORM_HOURLY = ['cape', 'freezing_level_height'] as const
/** On since the deployed Worker (448728a6, 22 Nov) answers `hourly=cape,freezing_level_height` with values. */
export const ASK_STORM_HOURLY = true

export const DAILY = [
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

export function forecastUrl(place: Place, { sceneHourly = ASK_SCENE_HOURLY, stormHourly = ASK_STORM_HOURLY }:
  { sceneHourly?: boolean; stormHourly?: boolean } = {}): string {
  const p = base(place)
  p.set('models', FORECAST_MODELS)
  p.set('forecast_days', '7')
  p.set('past_days', '1')
  p.set('wind_speed_unit', 'kmh')
  p.set('current', CURRENT.join(','))
  p.set('hourly', [...HOURLY, ...(sceneHourly ? SCENE_HOURLY : []), ...(stormHourly ? STORM_HOURLY : [])].join(','))
  p.set('daily', DAILY.join(','))
  p.set('minutely_15', 'precipitation')
  p.set('forecast_minutely_15', '12')
  return weatherUrl('forecast', p)
}

export function airUrl(place: Place): string {
  const p = base(place)
  p.set('forecast_days', '2')
  p.set('hourly', 'pm10,dust,uv_index')
  return weatherUrl('air-quality', p)
}
