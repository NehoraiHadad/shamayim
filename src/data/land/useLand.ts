import { useEffect, useState } from 'react'
import type { Place } from '../../config/place'
import { fetchFarLand } from './gibs'
import {
  readCachedFar, readCachedNear, readCachedWeather,
  writeCachedFar, writeCachedNear, writeCachedWeather, type LandCacheStore,
} from './landCache'
import { loadFootprintLandCover, loadLandCover, type LandCover } from './landData'
import { fetchNearLand } from './satellite'
import type { LandData } from './types'
import { checkActiveWeather, createWeatherWatcher, type WeatherRecheckDeps } from './weatherWatch'

export { checkActiveWeather, createWeatherWatcher, type WeatherRecheckDeps }

const EMPTY: LandData = { cover: null, near: null, far: null, weather: null }

/**
 * Living-land data hook: never blocks first paint; loads ±6 km high-res + ±60 km coarse WorldCover,
 * serves cached observations immediately, refreshes stale/missing sources in the background, and
 * rechecks weather freshness and hard 24 h expiry on focus/visibility or via scheduled timers.
 */
export function useLand(place: Place, enabled: boolean, store?: LandCacheStore): LandData {
  const [state, setState] = useState<LandData & { id: string }>(() => ({ id: place.id, ...EMPTY }))

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    const { signal } = controller
    const alive = () => !signal.aborted

    const merge = (patch: Partial<LandData>) => {
      if (alive()) setState((prev) => ({ ...(prev.id === place.id ? prev : EMPTY), id: place.id, ...patch }))
    }

    const watcher = createWeatherWatcher(place, signal, (weather) => merge({ weather }), {
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

    void watcher.check()

    const onFocus = () => { void watcher.check() }
    const onVis = () => { if (typeof document !== 'undefined' && document.visibilityState === 'visible') void watcher.check() }
    if (typeof window !== 'undefined') window.addEventListener('focus', onFocus)
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVis)

    return () => {
      controller.abort()
      watcher.dispose()
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
