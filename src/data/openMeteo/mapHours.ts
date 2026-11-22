import { blendDirection, blendNumber, blendWeatherCode, iconWeight, roundTemperature } from '../../domain/blend'
import { hourlyTemperatureAdd, temperatureIconWeight } from '../../domain/correction/temperature'
import { correctGust, correctHumidity, humidityIconWeight } from '../../domain/correction/windHumidity'
import type { HourPoint, WindVector } from '../../domain/types'
import { DataError, obj, str, type Json } from './guards'
import { pairs, thickCloud } from './mapHelpers'

/**
 * `now` (the response's current time) and `utcOffsetSeconds` place each hour's lead and standard-time hour for the
 * national temperature correction (domain/correction/temperature).
 */
export function mapHours(raw: Json, today: string, now: string, utcOffsetSeconds: number): HourPoint[] {
  const hourly = obj(raw.hourly, 'hourly')
  const time = hourly.time
  if (!Array.isArray(time)) throw new DataError('hourly.time: missing')

  const length = time.length
  const temp = pairs(hourly, 'temperature_2m', length, 'hourly')
  const precipProb = pairs(hourly, 'precipitation_probability', length, 'hourly')
  const precipitation = pairs(hourly, 'precipitation', length, 'hourly')
  const weatherCode = pairs(hourly, 'weather_code', length, 'hourly')
  const cloudCover = pairs(hourly, 'cloud_cover', length, 'hourly')
  const cloudLow = pairs(hourly, 'cloud_cover_low', length, 'hourly')
  const cloudMid = pairs(hourly, 'cloud_cover_mid', length, 'hourly')
  const cloudHigh = pairs(hourly, 'cloud_cover_high', length, 'hourly')
  // Asked only once the Worker serves them (`request.ts`, ASK_SCENE_HOURLY); absent columns read as null.
  const windDirection = pairs(hourly, 'wind_direction_10m', length, 'hourly')
  const visibility = pairs(hourly, 'visibility', length, 'hourly')
  const aloft = (['850hPa', '700hPa', '300hPa'] as const).map((level) => ({
    speed: pairs(hourly, `wind_speed_${level}`, length, 'hourly'),
    from: pairs(hourly, `wind_direction_${level}`, length, 'hourly'),
  }))
  const cruiseT = pairs(hourly, 'temperature_250hPa', length, 'hourly')
  const cruiseRh = pairs(hourly, 'relative_humidity_250hPa', length, 'hourly')
  const windSpeed10 = pairs(hourly, 'wind_speed_10m', length, 'hourly')
  const windGusts = pairs(hourly, 'wind_gusts_10m', length, 'hourly')
  const humidity = pairs(hourly, 'relative_humidity_2m', length, 'hourly')
  const snowDepth = pairs(hourly, 'snow_depth', length, 'hourly')
  const dates = [...new Set(time.map((value, index) => str(value, `hourly.time[${index}]`).slice(0, 10)))]
  const todayIndex = dates.indexOf(today)

  return time.flatMap((value, index) => {
    const stamp = str(value, `hourly.time[${index}]`)
    const dayOffset = dates.indexOf(stamp.slice(0, 10)) - todayIndex
    const weight = iconWeight(dayOffset)
    const blendedTemp = blendNumber(temp[index], temperatureIconWeight(dayOffset))
    if (blendedTemp === null) return []
    const windSpeed = blendNumber(windSpeed10[index], weight) ?? 0
    const gust = blendNumber(windGusts[index], weight)
    const rh = blendNumber(humidity[index], humidityIconWeight(dayOffset))
    const modelRh = blendNumber(humidity[index], weight)

    return [{
      time: stamp,
      temperature: roundTemperature(blendedTemp + hourlyTemperatureAdd(stamp, now, utcOffsetSeconds)),
      modelTemperature: roundTemperature(blendNumber(temp[index], weight) ?? blendedTemp),
      precipProb: blendNumber(precipProb[index], weight),
      precipitation: blendNumber(precipitation[index], weight) ?? 0,
      weatherCode: blendWeatherCode(weatherCode[index], precipProb[index], weight) ?? 0,
      cloudCover: blendNumber(cloudCover[index], weight) ?? 0,
      thickCloud: thickCloud(blendNumber(cloudLow[index], weight), blendNumber(cloudMid[index], weight)),
      windSpeed,
      windGusts: gust === null ? 0 : correctGust(gust, windSpeed, stamp, now, utcOffsetSeconds),
      humidity: rh === null ? null : correctHumidity(rh, stamp, now, utcOffsetSeconds),
      ...(modelRh === null ? {} : { modelHumidity: modelRh }),
      snowDepth: blendNumber(snowDepth[index], weight) ?? 0,
      cloudLow: blendNumber(cloudLow[index], weight),
      cloudMid: blendNumber(cloudMid[index], weight),
      cloudHigh: blendNumber(cloudHigh[index], weight),
      windDirection: blendDirection(windDirection[index], weight),
      visibility: blendNumber(visibility[index], weight),
      windAloft: windAloft(aloft.map(({ speed, from }) => vector(blendNumber(speed[index], weight), blendDirection(from[index], weight)))),
      cruise: cruiseOf(blendNumber(cruiseT[index], weight), blendNumber(cruiseRh[index], weight)),
    }]
  })
}

const vector = (speed: number | null, fromDeg: number | null): WindVector | null =>
  speed === null || fromDeg === null ? null : { speed, fromDeg }

/** The three levels, or null when none is known (the fields not asked yet). */
function windAloft([low, mid, high]: (WindVector | null)[]): HourPoint['windAloft'] {
  return low || mid || high ? { low, mid, high } : null
}

/** The air at cruise level (250 hPa), or null when either field is not known (not asked yet). */
const cruiseOf = (temperature: number | null, humidity: number | null): HourPoint['cruise'] =>
  temperature === null || humidity === null ? null : { temperature, humidity }
