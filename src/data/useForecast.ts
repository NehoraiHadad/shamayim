import { useCallback, useEffect, useRef, useState } from 'react'
import type { Place } from '../config/place'
import { withForecastRefresh } from '../domain/forecastRefresh'
import { nowIn } from '../domain/now'
import type { Forecast } from '../domain/types'
import { freshnessOf, readCache, writeCache, type Freshness } from './cache'
import { toFetchFailure, type FetchFailure } from './fetchFailure'
import type { WeatherProvider } from './WeatherProvider'

export type LoadStatus = 'loading' | 'ready' | 'refreshing' | 'error'

export interface ForecastState {
  forecast: Forecast | null
  status: LoadStatus
  freshness: Freshness | null
  error: FetchFailure | null
  refresh: () => void
}

/** Stale-while-revalidate: show the cache instantly, refetch when it is not fresh. */
export function useForecast(place: Place, provider: WeatherProvider, receiptTime: () => number): ForecastState {
  const [forecast, setForecast] = useState<Forecast | null>(() => readCache(place.id))
  const [status, setStatus] = useState<LoadStatus>(forecast ? 'ready' : 'loading')
  const [error, setError] = useState<FetchFailure | null>(null)
  const [activePlaceId, setActivePlaceId] = useState(place.id)
  const inFlight = useRef<AbortController | null>(null)
  const latest = useRef(forecast)
  useEffect(() => {
    latest.current = forecast
  }, [forecast])

  const load = useCallback(
    (force: boolean) => {
      setActivePlaceId((current) => current === place.id ? current : place.id)
      const cached = latest.current?.placeId === place.id ? latest.current : readCache(place.id)
      if (latest.current !== cached) {
        latest.current = cached
        setForecast(cached)
        setError(null)
        setStatus(cached ? 'ready' : 'loading')
      }
      const sameDay = cached?.current.time.slice(0, 10) === nowIn(place.timezone).slice(0, 10)
      if (!force && cached && sameDay && freshnessOf(cached) === 'fresh') return
      if (inFlight.current) return
      const ctrl = new AbortController()
      inFlight.current = ctrl
      setStatus(cached ? 'refreshing' : 'loading')
      provider
        .getForecast(place, ctrl.signal)
        .then((fetched) => {
          if (ctrl.signal.aborted) return
          // A shared stale copy (served while Open-Meteo refuses) can be older than what this device already has.
          if (!cached || cached.fetchedAt <= fetched.fetchedAt) {
            const next = withForecastRefresh(fetched, cached, receiptTime())
            writeCache(fetched)
            latest.current = next
            setForecast(next)
          }
          setError(null)
          setStatus('ready')
        })
        .catch((err: unknown) => {
          if (ctrl.signal.aborted) return
          setError(toFetchFailure(err))
          setStatus(latest.current ? 'ready' : 'error')
        })
        .finally(() => {
          if (inFlight.current === ctrl) inFlight.current = null
        })
    },
    [place, provider, receiptTime],
  )

  useEffect(() => {
    let mounted = true
    queueMicrotask(() => mounted && load(false))
    const onVisible = () => document.visibilityState === 'visible' && load(false)
    const onOnline = () => load(false)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    return () => {
      mounted = false
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
      inFlight.current?.abort()
      inFlight.current = null
    }
  }, [load])

  const visible = forecast?.placeId === place.id ? forecast : null
  const active = activePlaceId === place.id
  return {
    forecast: visible,
    status: active ? status : 'loading',
    freshness: visible ? freshnessOf(visible) : null,
    error: active ? error : null,
    refresh: () => load(true),
  }
}
