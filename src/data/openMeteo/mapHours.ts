import { blendDirection, blendNumber, blendWeatherCode, CLOUD_ICON_WEIGHT, iconWeight, roundTemperature } from '../../domain/blend'
import { bracketAt } from '../../domain/bracket'
import { skyCodeForCover } from '../../domain/conditions'
import { applyCloudAdjustment, cloudAdjustment, cloudCalibrationWeight } from '../../domain/correction/cloud'
import { hourlyTemperatureAdd, temperatureIconWeight } from '../../domain/correction/temperature'
import { correctGust, correctHumidity, humidityIconWeight } from '../../domain/correction/windHumidity'
import { minutesBetweenLocal } from '../../domain/minutes'
import type { HourPoint, LocalTime, WindVector } from '../../domain/types'
import { DataError, obj, str, type Json } from './guards'
import { pairs, thickCloud, type Pair } from './mapHelpers'

/** Fill from original samples up to three wall-clock hours away, earlier first on ties. */
function fillNeighbours(stamps: readonly LocalTime[], values: readonly (number | null)[]) {
  let before = -1, after = 0
  return values.map((value, i) => {
    if (value !== null) {
      before = i
      return value
    }
    if (after <= i) {
      after = i + 1
      while (after < values.length && values[after] === null) after++
    }
    const back = before < 0 ? Infinity : minutesBetweenLocal(stamps[before], stamps[i])
    const ahead = after === values.length ? Infinity : minutesBetweenLocal(stamps[i], stamps[after])
    return Math.min(back, ahead) > 180 ? null : values[back <= ahead ? before : after]
  })
}

/**
 * `now` (the response's current time) and `utcOffsetSeconds` place each hour's lead and standard-time hour for the
 * national temperature correction (domain/correction/temperature).
 */
export function mapHours(raw: Json, today: string, now: string, utcOffsetSeconds: number, calibrateClouds: boolean) {
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
  const cape = pairs(hourly, 'cape', length, 'hourly')
  const freezingLevel = pairs(hourly, 'freezing_level_height', length, 'hourly')
  const windSpeed10 = pairs(hourly, 'wind_speed_10m', length, 'hourly')
  const windGusts = pairs(hourly, 'wind_gusts_10m', length, 'hourly')
  const humidity = pairs(hourly, 'relative_humidity_2m', length, 'hourly')
  const snowDepth = pairs(hourly, 'snow_depth', length, 'hourly')
  const stamps = time.map((value, index) => str(value, `hourly.time[${index}]`))
  const dates = [...new Set(stamps.map(stamp => stamp.slice(0, 10)))]
  const todayIndex = dates.indexOf(today)
  const offsets = stamps.map(stamp => dates.indexOf(stamp.slice(0, 10)) - todayIndex)
  const weights = offsets.map(iconWeight)
  const fill = (read: (i: number) => number | null) => fillNeighbours(stamps, stamps.map((_, i) => read(i)))
  const numeric = (column: Pair[], weight: number | number[] = weights) =>
    fill(i => blendNumber(column[i], typeof weight === 'number' ? weight : weight[i]))
  const temperatures = numeric(temp, offsets.map(temperatureIconWeight)), modelTemperatures = numeric(temp)
  const probabilities = numeric(precipProb), rain = numeric(precipitation)
  const codes = fill(i => blendWeatherCode(weatherCode[i], precipProb[i], weights[i]))
  const cloudWeight = calibrateClouds ? CLOUD_ICON_WEIGHT : weights
  const cover = numeric(cloudCover, cloudWeight)
  const low = numeric(cloudLow, cloudWeight), mid = numeric(cloudMid, cloudWeight), high = numeric(cloudHigh, cloudWeight)
  const adjustments = stamps.map((stamp, i) => {
    if (!calibrateClouds || offsets[i] !== 0) return null
    const weight = cloudCalibrationWeight(minutesBetweenLocal(now, stamp))
    return weight === 0 ? null : cloudAdjustment({ cover: cloudCover[i], low: cloudLow[i], mid: cloudMid[i],
      high: cloudHigh[i], rain: precipitation[i] }, Number(stamp.slice(11, 13)), utcOffsetSeconds, weight)
  })
  const rawDirection = stamps.map((_, i) => blendDirection(windDirection[i], weights[i]))
  const directions = fillNeighbours(stamps, rawDirection)
  const observedDirections = stamps.map((time, i) => ({ time, windDirection: rawDirection[i] }))
  const visible = numeric(visibility)
  const winds = aloft.map(({ speed, from }) => ({ speed: numeric(speed), from: fill(i => blendDirection(from[i], weights[i])) }))
  const cruiseTemp = numeric(cruiseT), cruiseHumidity = numeric(cruiseRh)
  const fuel = numeric(cape), freezing = numeric(freezingLevel)
  const speeds = numeric(windSpeed10), gusts = numeric(windGusts), depth = numeric(snowDepth)
  const humidities = numeric(humidity, offsets.map(humidityIconWeight)), modelHumidities = numeric(humidity)

  const hours: HourPoint[] = stamps.flatMap((stamp, index) => {
    const blendedTemp = temperatures[index]
    if (blendedTemp === null) return []
    const windSpeed = speeds[index] ?? 0
    const gust = gusts[index]
    const rh = humidities[index]
    const modelRh = modelHumidities[index]
    const code = codes[index] ?? 0
    const clouds = applyCloudAdjustment(cover[index], low[index], adjustments[index])
    // Preserve the reported dry-sky category when neither model supplies a numeric cover.
    const cloud = clouds.cover ?? (code === 3 ? 100 : code === 2 ? 65 : code === 1 ? 25 : 0)

    return [{
      time: stamp,
      temperature: roundTemperature(blendedTemp + hourlyTemperatureAdd(stamp, now, utcOffsetSeconds)),
      modelTemperature: roundTemperature(modelTemperatures[index] ?? blendedTemp),
      precipProb: probabilities[index],
      precipitation: rain[index] ?? 0,
      weatherCode: skyCodeForCover(code, cloud),
      cloudCover: cloud,
      thickCloud: thickCloud(clouds.low, mid[index]),
      windSpeed,
      windGusts: gust === null ? 0 : correctGust(gust, windSpeed, stamp, now, utcOffsetSeconds),
      humidity: rh === null ? null : correctHumidity(rh, stamp, now, utcOffsetSeconds),
      ...(modelRh === null ? {} : { modelHumidity: modelRh }),
      snowDepth: depth[index] ?? 0,
      cloudLow: clouds.low,
      cloudMid: mid[index],
      cloudHigh: high[index],
      windDirection: directions[index],
      visibility: visible[index],
      windAloft: windAloft(winds.map(({ speed, from }) => vector(speed[index], from[index]))),
      cruise: cruiseOf(cruiseTemp[index], cruiseHumidity[index]),
      cape: fuel[index],
      freezingLevel: freezing[index],
    }]
  })
  if (!calibrateClouds) return { hours, observedDirections, ecmwfCloud: undefined, adjustmentAtCurrent: undefined }
  const { before, after, fraction } = bracketAt(stamps.map((time, index) => ({ time, index })), now)
  // The multi-model response gives one current reading (ICON). Sample the IFS cloud values around that time.
  const ecmwfAtCurrent = (column: Pair[]) => {
    const a = before ? column[before.index].ecmwf : null
    const b = after && fraction > 0 ? column[after.index].ecmwf : null
    return a === null || b === null ? a ?? b : a + (b - a) * fraction
  }
  const ecmwfCloud = {
    cloudCover: ecmwfAtCurrent(cloudCover),
    cloudLow: ecmwfAtCurrent(cloudLow),
    cloudMid: ecmwfAtCurrent(cloudMid),
    cloudHigh: ecmwfAtCurrent(cloudHigh),
  }
  // Interpolate the hourly adjustment separately so the provider's native current ICON reading is preserved.
  const a = before ? adjustments[before.index] : null
  const b = after && fraction > 0 ? adjustments[after.index] : null
  const adjustmentAtCurrent = a || b ? {
    cover: (a?.cover ?? 0) * (1 - fraction) + (b?.cover ?? 0) * fraction,
    low: (a?.low ?? 0) * (1 - fraction) + (b?.low ?? 0) * fraction,
  } : undefined
  return { hours, observedDirections, ecmwfCloud, adjustmentAtCurrent }
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
