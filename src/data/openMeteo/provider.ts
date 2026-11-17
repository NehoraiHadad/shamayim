import type { Place } from '../../config/place'
import type { Forecast } from '../../domain/types'
import { HttpError } from '../fetchFailure'
import type { WeatherProvider } from '../WeatherProvider'
import { mapAir } from './mapAir'
import { mapForecast } from './mapForecast'
import { airUrl, forecastUrl } from './request'

const TIMEOUT_MS = 8000

async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const timeout = AbortSignal.timeout(TIMEOUT_MS)
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout
  const res = await fetch(url, { signal: combined })
  if (!res.ok) throw new HttpError(res.status, new URL(url).host, await reasonOf(res))
  return res.json()
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
async function getJsonRetry(url: string, signal?: AbortSignal): Promise<unknown> {
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
    const [forecastRes, airRes] = await Promise.allSettled([
      getJsonRetry(forecastUrl(place), signal),
      getJson(airUrl(place), signal),
    ])
    if (forecastRes.status === 'rejected') throw forecastRes.reason
    const mapped = mapForecast(forecastRes.value)
    let air = null
    if (airRes.status === 'fulfilled') {
      try {
        air = mapAir(airRes.value)
      } catch (err) {
        console.warn('[shamayim] air data ignored', err)
      }
    }
    return {
      placeId: place.id,
      ...mapped,
      air,
      fetchedAt: Date.now(),
      source: 'Open-Meteo · DWD ICON + ECMWF',
      models: ['icon_seamless', 'ecmwf_ifs025'],
    }
  },
}
