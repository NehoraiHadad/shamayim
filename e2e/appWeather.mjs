import { sunPosition } from '../src/astro/sun.ts'
import { utcOf } from '../src/astro/utc.ts'
import { addMinutes } from '../src/domain/minutes.ts'
import { nowIn } from '../src/domain/now.ts'

const models = ['icon_seamless', 'ecmwf_ifs025']
const weather = {
  clear: { cloud: 0, precipitation: 0, probability: 0, code: 0, visibility: 40000 },
  rainbow: { cloud: 45, precipitation: 0.8, probability: 60, code: 80, visibility: 25000 },
}

function daylight(day, { lat, lon, timezone }) {
  const midnight = `${day}T00:00`
  const start = utcOf(midnight, timezone).getTime()
  const end = utcOf(addMinutes(midnight, 1440), timezone).getTime()
  const aboveHorizon = ms => sunPosition(new Date(ms), lat, lon).altitude >= -0.833
  let previous = aboveHorizon(start - 60_000)
  const times = { sunrise: null, sunset: null }
  for (let ms = start; ms < end; ms += 60_000) {
    const up = aboveHorizon(ms)
    if (up !== previous) times[up ? 'sunrise' : 'sunset'] = nowIn(timezone, new Date(ms))
    previous = up
  }
  return times
}

export function applyFixtureWeather(forecast, place, name) {
  if (!Object.hasOwn(weather, name)) throw new Error(`Unknown app weather "${name}". Use clear or rainbow.`)
  const { cloud, precipitation, probability, code, visibility } = weather[name]
  const fields = {
    cloud_cover: cloud, cloud_cover_low: cloud, cloud_cover_mid: 0, cloud_cover_high: 0,
    precipitation, precipitation_probability: probability, weather_code: code, visibility,
  }
  Object.assign(forecast.current, fields, { snowfall: 0 })
  const daylightByDay = forecast.daily.time.map(day => daylight(day, place))
  const hourlyCount = forecast.hourly.time.length
  const dailyFields = {
    weather_code: code, precipitation_probability_max: probability, precipitation_sum: precipitation * 24,
  }
  for (const model of models) {
    for (const [key, value] of Object.entries(fields)) {
      forecast.hourly[`${key}_${model}`] = Array(hourlyCount).fill(value)
    }
    for (const [key, value] of Object.entries(dailyFields)) {
      forecast.daily[`${key}_${model}`] = Array(daylightByDay.length).fill(value)
    }
    forecast.daily[`sunrise_${model}`] = daylightByDay.map(day => day.sunrise)
    forecast.daily[`sunset_${model}`] = daylightByDay.map(day => day.sunset)
  }
}
