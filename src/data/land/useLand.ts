import { useEffect, useState } from 'react'
import type { Place } from '../../config/place'
import { fetchFarLand } from './gibs'
import {
  readCachedFar, readCachedNear, readCachedWeather, weatherFreshness, weatherRefreshDelayMs,
  writeCachedFar, writeCachedNear, writeCachedWeather, type LandCacheStore,
} from './landCache'
import { loadFootprintLandCover, loadLandCover, type LandCover } from './landData'
import { fetchRecentWeather } from './recentWeather'
import { fetchNearLand } from './satellite'
import type { LandData, RecentLandWeather } from './types'

const EMPTY: LandData = { cover: null, near: null, far: null, weather: null }

export interface WeatherRecheckDeps {
  readCached?: (placeId: string, now: number) => Promise<{ value: RecentLandWeather; fresh: boolean } | null>
  fetchWeather?: (place: Place, signal: AbortSignal) => Promise<RecentLandWeather | null>
  writeCached?: (placeId: string, weather: RecentLandWeather, now: number) => Promise<void>
  now?: () => number
}

/**
 * Checks an active `RecentLandWeather` entry for staleness/expiry:
 * - If expired past `WEATHER_MAX_STALE_MS` (24 h), immediately clears it via `onUpdate(null)`.
 * - If stale or expired, triggers a background refresh and persists on success.
 */
export async function checkActiveWeather(
  place: Place,
  current: RecentLandWeather | null,
  signal: AbortSignal,
  onUpdate: (next: RecentLandWeather | null) => void,
  deps: WeatherRecheckDeps = {},
): Promise<void> {
  const now = (deps.now ?? Date.now)()
  const readCached = deps.readCached ?? ((id, t) => readCachedWeather(id, undefined, t))
  const fetchWeather = deps.fetchWeather ?? ((p, s) => fetchRecentWeather(p, { signal: s }))
  const writeCached = deps.writeCached ?? ((id, w, t) => writeCachedWeather(id, w, undefined, t))

  if (current) {
    const status = weatherFreshness(current, now)
    if (status === 'fresh') return
    if (status === 'expired') onUpdate(null)
  } else {
    const hit = await readCached(place.id, now).catch(() => null)
    if (signal.aborted) return
    if (hit) {
      onUpdate(hit.value)
      if (hit.fresh) return
    }
  }
  const fresh = await fetchWeather(place, signal).catch(() => null)
  if (!fresh || signal.aborted) return
  await writeCached(place.id, fresh, (deps.now ?? Date.now)()).catch(() => undefined)
  if (!signal.aborted) onUpdate(fresh)
}

/**
 * Living-land data hook: never blocks first paint; loads ±6 km high-res + ±60 km coarse WorldCover,
 * serves cached observations immediately, refreshes stale/missing sources in the background, and
 * rechecks weather freshness on focus/visibility or at TTL expiry.
 */
export function useLand(place: Place, enabled: boolean, store?: LandCacheStore): LandData {
  const [state, setState] = useState<LandData & { id: string }>(() => ({ id: place.id, ...EMPTY }))

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    const { signal } = controller
    const alive = () => !signal.aborted
    let activeWeather: RecentLandWeather | null = null
    let expiryTimer: ReturnType<typeof setTimeout> | undefined

    const merge = (patch: Partial<LandData>) => {
      if (alive()) setState((prev) => ({ ...(prev.id === place.id ? prev : EMPTY), id: place.id, ...patch }))
    }

    const scheduleWeatherCheck = (weather: RecentLandWeather | null) => {
      if (expiryTimer !== undefined) { clearTimeout(expiryTimer); expiryTimer = undefined }
      const delay = weatherRefreshDelayMs(weather, Date.now())
      if (delay !== null && delay > 0) {
        expiryTimer = setTimeout(() => { void runWeatherCheck() }, delay + 1000)
      }
    }

    const setWeather = (weather: RecentLandWeather | null) => {
      activeWeather = weather
      merge({ weather })
      scheduleWeatherCheck(weather)
    }

    const runWeatherCheck = () => checkActiveWeather(place, activeWeather, signal, setWeather, {
      readCached: (id, t) => readCachedWeather(id, store, t),
      writeCached: (id, w, t) => writeCachedWeather(id, w, store, t),
    })

    loadFootprintLandCover(place, signal).then((cover) => merge({ cover })).catch(() => undefined)

    readCachedNear(place.id, store).then((hit) => {
      if (hit) merge({ near: hit.value })
      if (!hit || !hit.fresh) {
        return fetchNearLand(place, signal).then((near) => {
          if (!near || !alive()) return
          void writeCachedNear(place.id, near, store)
          merge({ near })
        })
      }
    }).catch(() => undefined)

    readCachedFar(place.id, store).then((hit) => {
      if (hit) merge({ far: hit.value })
      if (!hit || !hit.fresh) {
        return fetchFarLand(place, signal).then((far) => {
          if (!far || !alive()) return
          void writeCachedFar(place.id, far, store)
          merge({ far })
        })
      }
    }).catch(() => undefined)

    void runWeatherCheck()

    const onFocus = () => { void runWeatherCheck() }
    const onVis = () => { if (typeof document !== 'undefined' && document.visibilityState === 'visible') void runWeatherCheck() }
    if (typeof window !== 'undefined') window.addEventListener('focus', onFocus)
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVis)

    return () => {
      controller.abort()
      if (expiryTimer !== undefined) clearTimeout(expiryTimer)
      if (typeof window !== 'undefined') window.removeEventListener('focus', onFocus)
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVis)
    }
  }, [place, enabled, store])

  return state.id === place.id ? state : EMPTY
}

/** Only the land cover round a place (within `radiusKm`), for its portrait (`coverMarks`); null until known or outside. */
export function useLandCover(place: Place, radiusKm = 2): LandCover | null {
  const [cover, setCover] = useState<{ id: string; cover: LandCover | null } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    loadLandCover(place, controller.signal, radiusKm).then((next) => {
      if (!controller.signal.aborted) setCover({ id: place.id, cover: next })
    }).catch(() => undefined)
    return () => controller.abort()
  }, [place, radiusKm])
  return cover?.id === place.id ? cover.cover : null
}
