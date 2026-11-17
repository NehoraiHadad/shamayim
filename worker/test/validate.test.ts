import { describe, expect, it } from 'vitest'
import { ROUTES, routeFor } from '../src/routes'
import { canonicalQuery } from '../src/validate'

const forecast = ROUTES['/v1/forecast']
const air = ROUTES['/v1/air-quality']
const elevation = ROUTES['/v1/elevation']

/** The exact query the app builds in src/data/openMeteo/request.ts. */
const APP_FORECAST = new URLSearchParams({
  latitude: '32.348', longitude: '35.5', timezone: 'Asia/Jerusalem',
  models: 'icon_seamless,ecmwf_ifs025', forecast_days: '7', past_days: '1', wind_speed_unit: 'kmh',
  current: 'temperature_2m,apparent_temperature,is_day,weather_code,cloud_cover,wind_speed_10m,wind_gusts_10m,'
    + 'wind_direction_10m,precipitation,snowfall,visibility,relative_humidity_2m',
  hourly: 'temperature_2m,precipitation_probability,precipitation,weather_code,cloud_cover,wind_speed_10m,'
    + 'wind_gusts_10m,relative_humidity_2m',
  daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,'
    + 'wind_gusts_10m_max,sunrise,sunset',
  minutely_15: 'precipitation', forecast_minutely_15: '12',
})

const query = (route = forecast, params: Record<string, string> | URLSearchParams = APP_FORECAST) =>
  canonicalQuery(route, new URLSearchParams(params))

function points(n: number, value: string): string {
  return Array(n).fill(value).join(',')
}

describe('routes', () => {
  it('knows the four endpoints and nothing else', () => {
    expect(Object.keys(ROUTES)).toHaveLength(4)
    expect(routeFor('/v1/normals')?.name).toBe('normals')
    expect(routeFor('/v1/forecast')?.name).toBe('forecast')
    expect(routeFor('/v1/air-quality')?.name).toBe('air-quality')
    expect(routeFor('/v1/elevation')?.name).toBe('elevation')
    expect(routeFor('/v1/geocoding')).toBeNull()
    expect(routeFor('/toString')).toBeNull()
  })
})

describe('canonicalQuery', () => {
  it('canonicalizes normals coordinates and refuses extra or missing parameters', () => {
    const normals = ROUTES['/v1/normals']
    expect(query(normals, { longitude: '35.50001', latitude: '32.348123' }))
      .toEqual({ ok: true, query: 'latitude=32.3481&longitude=35.5' })
    expect(query(normals, { latitude: '32', longitude: '35', daily: 'temperature_2m_max' }).ok).toBe(false)
    expect(query(normals, { latitude: '32' }).ok).toBe(false)
    expect(normals.freshMs).toBe(365 * 24 * 3600_000)
    expect(normals.staleMs).toBe(Infinity)
  })
  it('accepts the app forecast query unchanged', () => {
    const result = query()
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.query).toBe(APP_FORECAST.toString())
  })

  it('accepts both ends of the 15-minute forecast range', () => {
    for (const n of [1, 16]) {
      const p = new URLSearchParams(APP_FORECAST)
      p.set('forecast_minutely_15', String(n))
      expect(query(forecast, p).ok).toBe(true)
    }
  })

  it('builds the same key whatever the parameter order', () => {
    const reversed = new URLSearchParams([...APP_FORECAST].reverse())
    expect(query(forecast, reversed)).toEqual(query())
  })

  it('accepts the app air-quality query', () => {
    expect(query(air, { latitude: '32.348', longitude: '35.5', timezone: 'Asia/Jerusalem', forecast_days: '2', hourly: 'pm10,dust,uv_index' }))
      .toEqual({ ok: true, query: 'latitude=32.348&longitude=35.5&timezone=Asia%2FJerusalem&forecast_days=2&hourly=pm10%2Cdust%2Cuv_index' })
  })

  it('rounds coordinates to 4 decimals', () => {
    const result = query(air, { latitude: '32.34812345', longitude: '1e-7' })
    expect(result).toEqual({ ok: true, query: 'latitude=32.3481&longitude=0' })
  })

  it.each([
    [{ apikey: 'x' }, 'Parameter not allowed: apikey'],
    [{ hourly: 'temperature_2m,soil_moisture_0_1cm' }, 'Invalid value for hourly'],
    [{ hourly: 'temperature_2m,temperature_2m' }, 'Invalid value for hourly'],
    [{ models: 'gfs_seamless' }, 'Invalid value for models'],
    [{ forecast_days: '16' }, 'Invalid value for forecast_days'],
    [{ forecast_minutely_15: '0' }, 'Invalid value for forecast_minutely_15'],
    [{ forecast_minutely_15: '17' }, 'Invalid value for forecast_minutely_15'],
    [{ minutely_15: 'temperature_2m' }, 'Invalid value for minutely_15'],
    [{ wind_speed_unit: 'mph' }, 'Invalid value for wind_speed_unit'],
    [{ timezone: '../etc' }, 'Invalid value for timezone'],
    [{ latitude: '91' }, 'Invalid value for latitude'],
    [{ longitude: '-180.5' }, 'Invalid value for longitude'],
    [{ latitude: 'abc' }, 'Invalid value for latitude'],
    [{ latitude: '' }, 'Invalid value for latitude'],
  ])('rejects %o', (change, reason) => {
    const params = new URLSearchParams(APP_FORECAST)
    for (const [name, value] of Object.entries(change)) params.set(name, value)
    expect(query(forecast, params)).toEqual({ ok: false, reason })
  })

  it('rejects a repeated or missing parameter', () => {
    expect(query(forecast, new URLSearchParams('latitude=1&latitude=2&longitude=3'))).toEqual({ ok: false, reason: 'Parameter repeated: latitude' })
    expect(query(forecast, { latitude: '1' })).toEqual({ ok: false, reason: 'Missing parameter: longitude' })
  })

  it('accepts 41 elevation points and caps the count', () => {
    expect(query(elevation, { latitude: points(41, '32.3'), longitude: points(41, '35.5') }).ok).toBe(true)
    expect(query(elevation, { latitude: points(51, '32.3'), longitude: points(51, '35.5') }))
      .toEqual({ ok: false, reason: 'Invalid value for latitude' })
  })

  it('rejects elevation lists of different length or with a bad point', () => {
    expect(query(elevation, { latitude: points(3, '32.3'), longitude: points(2, '35.5') }).ok).toBe(false)
    expect(query(elevation, { latitude: '32.3,95', longitude: '35.5,35.6' }))
      .toEqual({ ok: false, reason: 'Invalid value for latitude' })
  })
})
