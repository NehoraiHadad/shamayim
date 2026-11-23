import type { Place } from '../../config/place'
import type { Forecast } from '../../domain/types'
import { HttpError } from '../fetchFailure'
import { applyLive } from '../../domain/correction/live'
import { fetchLive } from '../live'
import { fetchNormals, normalsFor } from '../normals'
import type { WeatherProvider } from '../WeatherProvider'
import { fetchedAtOf } from '../weatherApi'
import { mapAir } from './mapAir'
import { mapForecast } from './mapForecast'
import { airUrl, forecastUrl } from './request'

const TIMEOUT_MS = 8000

interface Fetched {
  body: unknown
  /** When the data left Open-Meteo (the Worker's shared copy may be older than this request). */
  fetchedAt: number
}

async function getJson(url: string, signal?: AbortSignal): Promise<Fetched> {
  const timeout = AbortSignal.timeout(TIMEOUT_MS)
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout
  const res = await fetch(url, { signal: combined })
  if (!res.ok) throw new HttpError(res.status, new URL(url).host, await reasonOf(res))
  return { body: await res.json(), fetchedAt: fetchedAtOf(res.headers) }
}

/** Open-Meteo explains a refusal as `{ "error": true, "reason": "…" }`; anything else gives no reason. */
async function reasonOf(res: Response): Promise<string> {
  try {
    const body = await res.json() as { reason?: unknown }
    return typeof body.reason === 'string' ? body.reason : ''
  } catch {
    return ''
  }
}

/** One retry with jitter for transient network failures (not for a 429). */
async function getJsonRetry(url: string, signal?: AbortSignal): Promise<Fetched> {
  try {
    return await getJson(url, signal)
  } catch (err) {
    // A refused request (429) only spends more of the quota if it is sent again straight away.
    if (signal?.aborted || (err instanceof HttpError && err.status === 429)) throw err
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 600))
    return getJson(url, signal)
  }
}

export const openMeteoIcon: WeatherProvider = {
  id: 'open-meteo-icon',
  async getForecast(place: Place, signal?: AbortSignal): Promise<Forecast> {
    const [forecastRes, airRes, normalsRes, liveRes] = await Promise.allSettled([
      getJsonRetry(forecastUrl(place), signal),
      getJson(airUrl(place), signal),
      fetchNormals(place, signal),
      fetchLive(place, signal),
    ])
    if (forecastRes.status === 'rejected') throw forecastRes.reason
    const { utcOffsetSeconds, ...base } = mapForecast(forecastRes.value.body)
    // The IMS stations' current anomaly around the place, on "now" and the next hours (domain/correction/live).
    const live = liveRes.status === 'fulfilled' ? liveRes.value : null
    const mapped = { ...base, ...applyLive(base.current, base.hours, live, utcOffsetSeconds) }
    let air = null
    if (airRes.status === 'fulfilled') {
      try {
        air = mapAir(airRes.value.body)
      } catch (err) {
        console.warn('[shamayim] air data ignored', err)
      }
    }
    return {
      placeId: place.id,
      ...mapped,
      air,
      normals: normalsRes.status === 'fulfilled' && normalsRes.value
        ? normalsFor(normalsRes.value, mapped.days.map((d) => d.date)) : null,
      fetchedAt: forecastRes.value.fetchedAt,
      source: 'Open-Meteo · DWD ICON + ECMWF',
      models: ['icon_seamless', 'ecmwf_ifs025'],
    }
  },
}
