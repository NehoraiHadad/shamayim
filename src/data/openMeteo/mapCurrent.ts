import { blendNumber, CLOUD_ICON_WEIGHT } from '../../domain/blend'
import { nearestWindDirection } from '../../domain/bracket'
import { skyCodeForCover } from '../../domain/conditions'
import { applyCloudAdjustment, type CloudAdjustment } from '../../domain/correction/cloud'
import type { CurrentWeather, HourPoint } from '../../domain/types'
import { expectUnit, num, numOrNull, obj, str, type Json } from './guards'
import { thickCloud } from './mapHelpers'

type CurrentCloud = Pick<HourPoint, 'cloudLow' | 'cloudMid' | 'cloudHigh'> & { cloudCover: number | null }

export function mapCurrent(raw: Json, hours: readonly Pick<HourPoint, 'time' | 'windDirection'>[] = [],
  ecmwf?: CurrentCloud, adjustment?: CloudAdjustment): CurrentWeather {
  const current = obj(raw.current, 'current')
  expectUnit(obj(raw.current_units ?? {}, 'current_units'), 'temperature_2m', '°C', 'current_units')

  const cloud = (icon: number | null, field: keyof CurrentCloud) =>
    blendNumber({ icon, ecmwf: ecmwf?.[field] ?? null }, CLOUD_ICON_WEIGHT)
  const iconCover = numOrNull(current.cloud_cover)
  const iconLow = numOrNull(current.cloud_cover_low)
  const paired = iconCover !== null && iconLow !== null && ecmwf?.cloudCover != null && ecmwf.cloudLow != null
  const clouds = applyCloudAdjustment(cloud(iconCover, 'cloudCover'), cloud(iconLow, 'cloudLow'),
    paired ? adjustment : undefined)
  const cloudLow = clouds.low
  const cloudMid = cloud(numOrNull(current.cloud_cover_mid), 'cloudMid')
  const cloudCover = clouds.cover ?? num(current.cloud_cover, 'current.cloud_cover')

  const time = str(current.time, 'current.time')
  return {
    time,
    temperature: num(current.temperature_2m, 'current.temperature_2m'),
    feelsLike: num(current.apparent_temperature, 'current.apparent_temperature'),
    isDay: num(current.is_day, 'current.is_day') === 1,
    weatherCode: skyCodeForCover(num(current.weather_code, 'current.weather_code'), cloudCover),
    cloudCover,
    thickCloud: thickCloud(cloudLow, cloudMid),
    cloudLow,
    cloudMid,
    cloudHigh: cloud(numOrNull(current.cloud_cover_high), 'cloudHigh'),
    windSpeed: num(current.wind_speed_10m, 'current.wind_speed_10m'),
    windGusts: num(current.wind_gusts_10m, 'current.wind_gusts_10m'),
    windDirection: numOrNull(current.wind_direction_10m) ?? nearestWindDirection(hours, time) ?? 0,
    precipitation: numOrNull(current.precipitation) ?? 0,
    snowfall: numOrNull(current.snowfall) ?? 0,
    visibility: numOrNull(current.visibility),
    humidity: numOrNull(current.relative_humidity_2m),
  }
}
