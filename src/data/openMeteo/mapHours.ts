import { blendNumber, blendWeatherCode, iconWeight, roundTemperature } from '../../domain/blend'
import type { HourPoint } from '../../domain/types'
import { DataError, obj, str, type Json } from './guards'
import { pairs } from './mapHelpers'

export function mapHours(raw: Json, today: string): HourPoint[] {
  const hourly = obj(raw.hourly, 'hourly')
  const time = hourly.time
  if (!Array.isArray(time)) throw new DataError('hourly.time: missing')

  const length = time.length
  const temp = pairs(hourly, 'temperature_2m', length, 'hourly')
  const precipProb = pairs(hourly, 'precipitation_probability', length, 'hourly')
  const precipitation = pairs(hourly, 'precipitation', length, 'hourly')
  const weatherCode = pairs(hourly, 'weather_code', length, 'hourly')
  const cloudCover = pairs(hourly, 'cloud_cover', length, 'hourly')
  const windSpeed = pairs(hourly, 'wind_speed_10m', length, 'hourly')
  const windGusts = pairs(hourly, 'wind_gusts_10m', length, 'hourly')
  const dates = [...new Set(time.map((value, index) => str(value, `hourly.time[${index}]`).slice(0, 10)))]
  const todayIndex = dates.indexOf(today)

  return time.flatMap((value, index) => {
    const stamp = str(value, `hourly.time[${index}]`)
    const weight = iconWeight(dates.indexOf(stamp.slice(0, 10)) - todayIndex)
    const blendedTemp = blendNumber(temp[index], weight)
    if (blendedTemp === null) return []

    return [{
      time: stamp,
      temperature: roundTemperature(blendedTemp),
      precipProb: blendNumber(precipProb[index], weight),
      precipitation: blendNumber(precipitation[index], weight) ?? 0,
      weatherCode: blendWeatherCode(weatherCode[index], precipProb[index], weight) ?? 0,
      cloudCover: blendNumber(cloudCover[index], weight) ?? 0,
      windSpeed: blendNumber(windSpeed[index], weight) ?? 0,
      windGusts: blendNumber(windGusts[index], weight) ?? 0,
    }]
  })
}
