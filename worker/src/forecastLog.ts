/**
 * Forecast log: every 6 hours, keep what the IMS forecast and what the app's models said, at the same points, so they
 * can later be verified against IMS station observations (research/verification/). Nothing reads it in production.
 *
 *  - IMS city forecasts (175 cities, 6-hourly, 8 days; the first 3 days written by a forecaster) and the INCA hourly
 *    model (ECMWF-based, 72 h) at 10 IMS stations — public XML files, no archive exists anywhere, so this is the only
 *    way to learn whether they beat the corrected Open-Meteo blend and deserve a place in it.
 *  - Open-Meteo at the same points: both models' hourly temperature, rain, rain probability, humidity, wind and gusts,
 *    3 days. The rain probability is the number the app shows; logging it is how its calibration can be checked.
 * Stored in Workers KV under `log:<UTC issue hour>` (a few hundred kB each, four writes a day).
 */
import type { KV } from './live'

const XML = 'https://ims.gov.il/sites/default/files/ims_data/xml_files'
const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast'
const OM_HOURLY = ['temperature_2m', 'precipitation', 'precipitation_probability', 'relative_humidity_2m',
  'wind_speed_10m', 'wind_gusts_10m']

export interface LogPoint { id: string; name: string; lat: number; lon: number }

const text = (block: string, tag: string) => new RegExp(`<${tag}>([^<]*)</${tag}>`).exec(block)?.[1]?.trim() ?? ''
const num = (s: string) => (s === '' || !Number.isFinite(Number(s)) ? null : Number(s))

/** The 175-city 6-hourly file: [time, temperature, RH, wind, rain, weather code, min, max] per step. */
export function parseCities(xml: string): { issued: string; points: (LogPoint & { steps: (string | number | null)[][] })[] } {
  const issued = text(xml, 'IssueDateTime')
  const points = [...xml.matchAll(/<Location>([\s\S]*?)<\/Location>/g)].map(([, loc]) => ({
    id: `c${text(loc, 'LocationId')}`,
    name: text(loc, 'LocationNameEng'),
    lat: Number(text(loc, 'DisplayLat')),
    lon: Number(text(loc, 'DisplayLon')),
    steps: [...loc.matchAll(/<Forecast>([\s\S]*?)<\/Forecast>/g)].map(([, f]) => [
      text(f, 'ForecastTime'), num(text(f, 'Temperature')), num(text(f, 'RelativeHumidity')), num(text(f, 'WindSpeed')),
      num(text(f, 'Rain')), num(text(f, 'WeatherCode')), num(text(f, 'MinTemp')), num(text(f, 'MaxTemp')),
    ]),
  })).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon) && p.steps.length)
  return { issued, points }
}

/** The INCA hourly file: [time (UTC), temperature, RH, wind speed] per hour. */
export function parseInca(xml: string): { issued: string; points: (LogPoint & { steps: (string | number | null)[][] })[] } {
  const issued = text(xml, 'IssueDateTime')
  const points = [...xml.matchAll(/<Location>([\s\S]*?)<\/Location>/g)].map(([, loc]) => ({
    id: `i${text(loc, 'LocationName')}`,
    name: text(loc, 'LocationName'),
    lat: Number(text(loc, 'LocationLatitude')),
    lon: Number(text(loc, 'LocationLongitude')),
    steps: [...loc.matchAll(/<Forecast>([\s\S]*?)<\/Forecast>/g)].map(([, f]) => [
      text(f, 'ForecastTime'), num(text(f, 'Temperature')), num(text(f, 'RelativeHumidity')), num(text(f, 'WindSpeed')),
    ]),
  })).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon) && p.steps.length)
  return { issued, points }
}

async function getText(f: typeof fetch, url: string, encoding = 'utf-8'): Promise<string> {
  const res = await f(url, { signal: AbortSignal.timeout(30_000) })
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  return new TextDecoder(encoding).decode(await res.arrayBuffer())
}

/** Open-Meteo for many points in one request; per point: { time0, <var>_<model>: number[] }. */
async function openMeteoAt(f: typeof fetch, points: LogPoint[]): Promise<Record<string, unknown>[]> {
  const q = new URLSearchParams({
    latitude: points.map((p) => p.lat.toFixed(4)).join(','),
    longitude: points.map((p) => p.lon.toFixed(4)).join(','),
    hourly: OM_HOURLY.join(','),
    models: 'icon_seamless,ecmwf_ifs025',
    timezone: 'GMT',
    forecast_days: '3',
    wind_speed_unit: 'kmh',
  })
  const res = await f(`${OPEN_METEO}?${q}`, { signal: AbortSignal.timeout(30_000) })
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
  const body = await res.json()
  const list: Record<string, unknown>[] = Array.isArray(body) ? body : [body]
  return list.map((loc) => {
    const hourly = (loc?.hourly ?? {}) as Record<string, unknown[]>
    const out: Record<string, unknown> = { time0: hourly.time?.[0] ?? null }
    for (const [k, v] of Object.entries(hourly)) if (k !== 'time') out[k] = v
    return out
  })
}

/** One log entry: IMS cities + INCA + Open-Meteo at all those points. Parts that fail are recorded as errors. */
export async function writeForecastLog(deps: { kv: KV; fetch: typeof fetch; now: () => number }): Promise<string> {
  const at = new Date(deps.now())
  const key = `log:${at.toISOString().slice(0, 13)}`
  const entry: Record<string, unknown> = { at: at.toISOString(), errors: [] as string[] }
  const errors = entry.errors as string[]
  const points: LogPoint[] = []
  try {
    const cities = parseCities(await getText(deps.fetch, `${XML}/isr_cities_1week_6hr_forecast.xml`))
    entry.cities = cities
    points.push(...cities.points)
  } catch (err) { errors.push(String(err)) }
  try {
    const inca = parseInca(await getText(deps.fetch, `${XML}/IMS_001.xml`, 'iso-8859-1'))
    entry.inca = inca
    points.push(...inca.points)
  } catch (err) { errors.push(String(err)) }
  if (points.length) {
    try {
      const om = await openMeteoAt(deps.fetch, points.map(({ id, name, lat, lon }) => ({ id, name, lat, lon })))
      entry.openMeteo = Object.fromEntries(points.map((p, i) => [p.id, om[i]]))
    } catch (err) { errors.push(String(err)) }
  }
  await deps.kv.put(key, JSON.stringify(entry))
  return key
}
