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
  if (!res.ok) throw new HttpError(res.status, new URL(url).host)
  return res.json()
}

/** One retry with jitter for transient network failures. */
async function getJsonRetry(url: string, signal?: AbortSignal): Promise<unknown> {
  try {
    return await getJson(url, signal)
  } catch (err) {
    if (signal?.aborted) throw err
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
