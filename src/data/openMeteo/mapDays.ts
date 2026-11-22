import { blendNumber, blendWeatherCode, HIGH_RES_DAYS, iconWeight, roundTemperature } from '../../domain/blend'
import { confidenceFor } from '../../domain/confidence'
import { dailyMaxAdd, temperatureIconWeight } from '../../domain/correction/temperature'
import type { DayPoint } from '../../domain/types'
import { DataError, obj, str, type Json } from './guards'
import { pairs, spread } from './mapHelpers'
import { modelColumn } from './suffix'

export function mapDays(raw: Json, today: string): DayPoint[] {
  const daily = obj(raw.daily, 'daily')
  const time = daily.time
  if (!Array.isArray(time)) throw new DataError('daily.time: missing')

  const length = time.length
  const weatherCode = pairs(daily, 'weather_code', length, 'daily')
  const tempMax = pairs(daily, 'temperature_2m_max', length, 'daily')
  const tempMin = pairs(daily, 'temperature_2m_min', length, 'daily')
  const precipProb = pairs(daily, 'precipitation_probability_max', length, 'daily')
  const precipSum = pairs(daily, 'precipitation_sum', length, 'daily')
  const windGusts = pairs(daily, 'wind_gusts_10m_max', length, 'daily')
  const sunrise = modelColumn(daily, 'sunrise', 'icon_seamless', length, 'daily')
  const sunriseFallback = modelColumn(daily, 'sunrise', 'ecmwf_ifs025', length, 'daily')
  const sunset = modelColumn(daily, 'sunset', 'icon_seamless', length, 'daily')
  const sunsetFallback = modelColumn(daily, 'sunset', 'ecmwf_ifs025', length, 'daily')
  const todayIndex = time.indexOf(today)

  return time.flatMap((value, index) => {
    const date = str(value, `daily.time[${index}]`)
    const offset = index - todayIndex
    const weight = iconWeight(offset)
    const tempWeight = temperatureIconWeight(offset)
    const max = blendNumber(tempMax[index], tempWeight)
    const min = blendNumber(tempMin[index], tempWeight)
    if (max === null || min === null) return []

    const differences = {
      tempMax: spread(tempMax[index]),
      tempMin: spread(tempMin[index]),
      precipProb: spread(precipProb[index]),
    }
    return [{
      date,
      weatherCode: blendWeatherCode(weatherCode[index], precipProb[index], weight) ?? 0,
      tempMax: roundTemperature(max + dailyMaxAdd(offset)),
      tempMin: roundTemperature(min),
      precipProbMax: blendNumber(precipProb[index], weight),
      precipSum: blendNumber(precipSum[index], weight) ?? 0,
      windGustsMax: blendNumber(windGusts[index], weight) ?? 0,
      sunrise: str(sunrise[index] ?? sunriseFallback[index], `daily.sunrise[${index}]`),
      sunset: str(sunset[index] ?? sunsetFallback[index], `daily.sunset[${index}]`),
      lowConfidence: offset >= HIGH_RES_DAYS,
      confidence: confidenceFor(differences, offset),
      spread: differences,
    }]
  })
}
