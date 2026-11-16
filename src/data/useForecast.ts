import { useCallback, useEffect, useRef, useState } from 'react'
import type { Place } from '../config/place'
import type { Forecast } from '../domain/types'
import { freshnessOf, readCache, writeCache, type Freshness } from './cache'
import type { WeatherProvider } from './WeatherProvider'

export type LoadStatus = 'loading' | 'ready' | 'refreshing' | 'error'

export interface ForecastState {
  forecast: Forecast | null
  status: LoadStatus
  freshness: Freshness | null
  error: string | null
  refresh: () => void
}

/** Stale-while-revalidate: show the cache instantly, refetch when it is not fresh. */
export function useForecast(place: Place, provider: WeatherProvider): ForecastState {
  const [forecast, setForecast] = useState<Forecast | null>(() => readCache(place.id))
  const [status, setStatus] = useState<LoadStatus>(forecast ? 'ready' : 'loading')
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef<AbortController | null>(null)
  const latest = useRef(forecast)
  latest.current = forecast

  const load = useCallback(
    (force: boolean) => {
      const cached = latest.current
      if (!force && cached && freshnessOf(cached) === 'fresh') return
      if (inFlight.current) return
      const ctrl = new AbortController()
      inFlight.current = ctrl
      setStatus(cached ? 'refreshing' : 'loading')
      provider
        .getForecast(place, ctrl.signal)
        .then((f) => {
          writeCache(f)
          setForecast(f)
          setError(null)
          setStatus('ready')
        })
        .catch((err: unknown) => {
          if (ctrl.signal.aborted) return
          setError(err instanceof Error ? err.message : String(err))
          setStatus(latest.current ? 'ready' : 'error')
        })
        .finally(() => {
          if (inFlight.current === ctrl) inFlight.current = null
        })
    },
    [place, provider],
  )

  useEffect(() => {
    load(false)
    const onVisible = () => document.visibilityState === 'visible' && load(false)
    const onOnline = () => load(false)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
      inFlight.current?.abort()
      inFlight.current = null
    }
  }, [load])

  return {
    forecast,
    status,
    freshness: forecast ? freshnessOf(forecast) : null,
    error,
    refresh: () => load(true),
  }
}
