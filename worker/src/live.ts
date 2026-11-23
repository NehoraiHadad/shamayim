/**
 * Live correction from the IMS station network (research/verification/live_lapse.py, results/temp-report.html §6).
 *
 * Once an hour (cron) the Worker takes every station's latest temperature, compares it with the app's day-0 blend at
 * that station and subtracts the station's usual error (`stations.ts`): the remainder is what the forecast is getting
 * wrong today. `/v1/live` returns the Gaussian-weighted (σ 20 km) mean of those anomalies around a place; the app
 * applies it to "now" and the next hours with a decay (held-out test: −10 % error now, −8 % an hour ahead).
 */
import { SEASON_CENTRE_DOY, STATIONS, type Station } from './stations'

const HOUR = 3600_000
const IMS = 'https://api.ims.gov.il/v1/envista'
const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast'
/** ICON's share of the app's temperature blend for today (app: domain/correction/temperature.ts). */
const ICON_WEIGHT = 0.8
/** Station forecasts are refreshed when older than this (one Open-Meteo request for all stations). */
export const FORECAST_REFRESH_MS = 3 * HOUR
/** An observation older than this is not used. */
const OBS_MAX_AGE_MS = 90 * 60_000
/** `/v1/live` answers nothing from a run older than this. */
export const LIVE_MAX_AGE_MS = 3 * HOUR
const SIGMA_KM = 20
const MIN_WEIGHT = 0.05

export interface KV {
  get(key: string): Promise<string | null>
  put(key: string, value: string): Promise<void>
}

export interface LiveDeps {
  kv: KV
  fetch: typeof fetch
  now: () => number
  token: string
}

/** Blended hourly forecasts at every station, from `start` (UTC ms, on the hour), in STATIONS order. */
export interface StationForecasts {
  fetchedAt: number
  start: number
  temps: (number | null)[][]
}

/** One station's anomaly: forecast minus observed minus its usual error (°C), and when it was observed. */
export type Anomaly = [id: number, lat: number, lon: number, anomaly: number, observedAt: number]

export interface LiveRun {
  at: number
  stations: Anomaly[]
}

/**
 * IMS labels every reading with a +02:00 or +03:00 offset, but the wall clock is Israel standard time all year
 * (verified: no jump at the DST change; radiation peaks at standard-time noon). So the label is read as UTC+2.
 */
export function imsTime(label: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(label)
  if (!m) return null
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) - 2 * HOUR
}

/** Latest valid TD per station from one region's `/regions/{id}/data/latest` answer. */
export function parseRegionLatest(body: unknown): Map<number, { t: number; td: number }> {
  const out = new Map<number, { t: number; td: number }>()
  if (!Array.isArray(body)) return out
  for (const row of body) {
    const id = row?.stationId
    const data = row?.regionData
    const t = typeof data?.datetime === 'string' ? imsTime(data.datetime) : null
    const td = Array.isArray(data?.channels)
      ? data.channels.find((c: { name?: string; valid?: boolean; value?: unknown }) => c?.name === 'TD' && c.valid === true)
      : undefined
    if (typeof id === 'number' && t !== null && typeof td?.value === 'number' && Number.isFinite(td.value)) {
      out.set(id, { t, td: td.value })
    }
  }
  return out
}

function dayOfYear(ms: number): number {
  const d = new Date(ms)
  return Math.round((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 1)) / 864e5) + 1
}

/** The station's usual error at UTC time `t`, smooth between season centres (as the app reads its tables). */
export function usualError(station: Station, t: number): number {
  const std = t + 2 * HOUR // Israel standard time
  const hour = new Date(std).getUTCHours()
  const doy = dayOfYear(std)
  const c = SEASON_CENTRE_DOY
  const d = doy < c[0] ? doy + 365 : doy
  for (let i = 0; i < 4; i++) {
    const a = c[i]
    const b = i === 3 ? c[0] + 365 : c[i + 1]
    if (d >= a && d < b) {
      const f = (d - a) / (b - a)
      return station.bias[i][hour] * (1 - f) + station.bias[(i + 1) % 4][hour] * f
    }
  }
  return station.bias[0][hour]
}

/** The forecast at `t` by linear interpolation between hours, or null outside the forecast. */
export function forecastAt(fc: StationForecasts, index: number, t: number): number | null {
  const x = (t - fc.start) / HOUR
  const i = Math.floor(x)
  const row = fc.temps[index]
  const a = row?.[i]
  const b = row?.[i + 1]
  if (a == null) return null
  if (b == null) return x === i ? a : null
  return a + (b - a) * (x - i)
}

/** One Open-Meteo request for every station: the two models' hourly temperature, blended as the app blends today. */
export async function fetchStationForecasts(deps: Pick<LiveDeps, 'fetch' | 'now'>): Promise<StationForecasts> {
  const q = new URLSearchParams({
    latitude: STATIONS.map((s) => s.lat.toFixed(4)).join(','),
    longitude: STATIONS.map((s) => s.lon.toFixed(4)).join(','),
    hourly: 'temperature_2m',
    models: 'icon_seamless,ecmwf_ifs025',
    timezone: 'GMT',
    past_days: '1',
    forecast_days: '2',
  })
  const res = await deps.fetch(`${OPEN_METEO}?${q}`, { signal: AbortSignal.timeout(20_000) })
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
  const body = await res.json()
  const list = Array.isArray(body) ? body : [body]
  if (list.length !== STATIONS.length) throw new Error('Open-Meteo: wrong number of locations')
  const first = list[0]?.hourly?.time?.[0]
  if (typeof first !== 'string') throw new Error('Open-Meteo: no hourly time')
  const start = Date.parse(`${first}Z`)
  const temps = list.map((loc) => {
    const icon: unknown[] = loc?.hourly?.temperature_2m_icon_seamless ?? []
    const ecmwf: unknown[] = loc?.hourly?.temperature_2m_ecmwf_ifs025 ?? []
    return icon.map((v, i) => {
      const a = typeof v === 'number' ? v : null
      const e = typeof ecmwf[i] === 'number' ? (ecmwf[i] as number) : null
      if (a === null) return e
      if (e === null) return a
      return ICON_WEIGHT * a + (1 - ICON_WEIGHT) * e
    })
  })
  return { fetchedAt: deps.now(), start, temps }
}

/** The hourly job: refresh station forecasts when stale, read the latest observations, store the anomalies. */
export async function refreshLive(deps: LiveDeps): Promise<LiveRun> {
  const now = deps.now()
  let fc: StationForecasts | null = null
  try {
    const raw = await deps.kv.get('forecasts')
    fc = raw ? (JSON.parse(raw) as StationForecasts) : null
  } catch {
    fc = null
  }
  if (!fc || now - fc.fetchedAt > FORECAST_REFRESH_MS) {
    try {
      fc = await fetchStationForecasts(deps)
      await deps.kv.put('forecasts', JSON.stringify(fc))
    } catch (err) {
      console.warn('[live] station forecasts not refreshed', err)
      if (!fc || now - fc.fetchedAt > 4 * FORECAST_REFRESH_MS) throw err
    }
  }
  const regions = [...new Set(STATIONS.map((s) => s.region))]
  const answers = await Promise.allSettled(regions.map(async (r) => {
    const res = await deps.fetch(`${IMS}/regions/${r}/data/latest`, {
      headers: { Authorization: `ApiToken ${deps.token}` }, signal: AbortSignal.timeout(20_000),
    })
    if (!res.ok) throw new Error(`IMS region ${r}: ${res.status}`)
    return parseRegionLatest(await res.json())
  }))
  const obs = new Map<number, { t: number; td: number }>()
  for (const a of answers) {
    if (a.status === 'fulfilled') for (const [id, o] of a.value) obs.set(id, o)
    else console.warn('[live]', a.reason)
  }
  const stations: Anomaly[] = []
  STATIONS.forEach((s, i) => {
    const o = obs.get(s.id)
    if (!o || now - o.t > OBS_MAX_AGE_MS || o.t > now + 10 * 60_000) return
    const f = forecastAt(fc!, i, o.t)
    if (f === null) return
    const a = f - o.td - usualError(s, o.t)
    // A reading this far off is a sensor fault, not weather the neighbours should inherit.
    if (Math.abs(a) > 8) return
    stations.push([s.id, s.lat, s.lon, Math.round(a * 100) / 100, o.t])
  })
  const run = { at: now, stations }
  await deps.kv.put('live', JSON.stringify(run))
  return run
}

export interface LiveAnswer {
  /** Weighted anomaly (forecast − observed beyond the usual error, °C); null when no station is near enough. */
  anomaly: number | null
  /** Sum of the Gaussian weights (1 = one station on the spot). */
  weight: number
  stations: number
  /** When the stations measured (UTC ms, weighted mean); null with no anomaly. */
  observedAt: number | null
}

/** The anomaly around a place: Gaussian-weighted (σ 20 km) mean of the stations' anomalies. */
export function liveFor(run: LiveRun | null, lat: number, lon: number, now: number): LiveAnswer {
  const none: LiveAnswer = { anomaly: null, weight: 0, stations: 0, observedAt: null }
  if (!run || now - run.at > LIVE_MAX_AGE_MS) return none
  let w = 0, sum = 0, t = 0, n = 0
  for (const [, sLat, sLon, a, at] of run.stations) {
    const km = Math.hypot((sLat - lat) * 111, (sLon - lon) * 94)
    const g = Math.exp(-0.5 * (km / SIGMA_KM) ** 2)
    if (g < 1e-3) continue
    w += g
    sum += g * a
    t += g * at
    n++
  }
  if (w < MIN_WEIGHT) return { ...none, weight: Math.round(w * 1000) / 1000, stations: n }
  return { anomaly: Math.round((sum / w) * 100) / 100, weight: Math.round(w * 1000) / 1000, stations: n, observedAt: Math.round(t / w) }
}
