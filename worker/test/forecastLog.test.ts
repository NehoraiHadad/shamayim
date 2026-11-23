import { describe, expect, it, vi } from 'vitest'
import { parseCities, parseInca, writeForecastLog } from '../src/forecastLog'

const CITIES = `<?xml version="1.0" encoding="utf-8"?><LocationForecasts><Identification><IssueDateTime>Mon Nov 23 05:08:23 IST 2026</IssueDateTime></Identification>
<Location><LocationMetaData><LocationId>2</LocationId><LocationNameEng>Tel Aviv Coast</LocationNameEng><DisplayLat>32.0821</DisplayLat><DisplayLon>34.7802</DisplayLon></LocationMetaData>
<LocationData><Forecast><ForecastTime>2026-11-22 02:00:00</ForecastTime><Temperature>17.4</Temperature><RelativeHumidity>87</RelativeHumidity><WindSpeed>4</WindSpeed><Rain>0.00</Rain><WeatherCode>1230</WeatherCode><MinTemp>15</MinTemp><MaxTemp>22</MaxTemp></Forecast></LocationData></Location></LocationForecasts>`
const INCA = `<HourlyLocationsForecast><Identification><IssueDateTime>Mon Nov 23 07:26:23 AM IST 2026</IssueDateTime></Identification>
<Location><LocationMetaData><LocationName>EDEN FARM</LocationName><LocationLatitude>32.4667</LocationLatitude><LocationLongitude>35.4833</LocationLongitude></LocationMetaData>
<LocationData><Forecast><ForecastTime>23/11/2026 5:00 UTC</ForecastTime><Temperature>11.2</Temperature><RelativeHumidity>92</RelativeHumidity><WindSpeed>0.7</WindSpeed></Forecast></LocationData></Location></HourlyLocationsForecast>`

describe('forecast log', () => {
  it('parses the IMS city and INCA files', () => {
    const c = parseCities(CITIES)
    expect(c.issued).toContain('Nov 23')
    expect(c.points[0]).toMatchObject({ id: 'c2', name: 'Tel Aviv Coast', lat: 32.0821, lon: 34.7802 })
    expect(c.points[0].steps[0]).toEqual(['2026-11-22 02:00:00', 17.4, 87, 4, 0, 1230, 15, 22])
    const i = parseInca(INCA)
    expect(i.points[0]).toMatchObject({ id: 'iEDEN FARM', lat: 32.4667 })
    expect(i.points[0].steps[0]).toEqual(['23/11/2026 5:00 UTC', 11.2, 92, 0.7])
  })

  it('stores IMS and Open-Meteo at the same points, recording a failed part instead of dropping the entry', async () => {
    const data = new Map<string, string>()
    const kv = { get: async (k: string) => data.get(k) ?? null, put: async (k: string, v: string) => { data.set(k, v) } }
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('isr_cities_1week_6hr_forecast.xml')) return new Response(CITIES)
      if (url.endsWith('IMS_001.xml')) return new Response('nope', { status: 503 })
      return Response.json([{ hourly: { time: ['2026-11-23T00:00'], temperature_2m_icon_seamless: [15] } }])
    })
    const key = await writeForecastLog({ kv, fetch: fetch as unknown as typeof globalThis.fetch, now: () => Date.UTC(2026, 10, 23, 6, 40) })
    expect(key).toBe('log:2026-11-23T06')
    const entry = JSON.parse(data.get(key)!)
    expect(entry.cities.points).toHaveLength(1)
    expect(entry.openMeteo.c2).toMatchObject({ time0: '2026-11-23T00:00', temperature_2m_icon_seamless: [15] })
    expect(entry.errors[0]).toContain('IMS_001.xml')
    expect(fetch.mock.calls.length).toBeLessThanOrEqual(3)
  })
})
