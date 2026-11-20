import { useEffect, useState } from 'react'
import type { Place } from '../../config/place'
import { fetchFarLand } from './gibs'
import { createCoverWatcher, createGridWatcher } from './gridWatch'
import {
  FAR_TTL_MS, MAX_STALE_MS, NEAR_TTL_MS,
  readCachedFar, readCachedNear, readCachedWeather,
  writeCachedFar, writeCachedNear, writeCachedWeather, type LandCacheStore,
} from './landCache'
import { loadLandCover, type LandCover } from './landData'
import { fetchNearLand } from './satellite'
import type { FarLandGrid, LandData, NearLandGrid } from './types'
import { createWeatherWatcher } from './weatherWatch'

const EMPTY: LandData = { cover: null, near: null, far: null, weather: null }

/**
 * Living-land data hook: never blocks first paint; loads ±6 km high-res + ±60 km coarse WorldCover
 * (with runtime COG fallback outside Israel), serves cached observations immediately, refreshes
 * stale/missing near, far and weather sources in the background, and rechecks freshness & hard
 * stale caps on focus/visibility or via scheduled timers.
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

    const nearWatcher = createGridWatcher<NearLandGrid>(place, signal, (near) => merge({ near }), {
      ttlMs: NEAR_TTL_MS, maxStaleMs: MAX_STALE_MS,
      readCached: (id, t) => readCachedNear(id, store, t),
      writeCached: (id, g, t) => writeCachedNear(id, g, store, t),
      fetchGrid: (p, s) => fetchNearLand(p, s),
    })

    const farWatcher = createGridWatcher<FarLandGrid>(place, signal, (far) => merge({ far }), {
      ttlMs: FAR_TTL_MS, maxStaleMs: MAX_STALE_MS,
      readCached: (id, t) => readCachedFar(id, store, t),
      writeCached: (id, g, t) => writeCachedFar(id, g, store, t),
      fetchGrid: (p, s) => fetchFarLand(p, s),
    })

    const weatherWatcher = createWeatherWatcher(place, signal, (weather) => merge({ weather }), {
      readCached: (id, t) => readCachedWeather(id, store, t),
      writeCached: (id, w, t) => writeCachedWeather(id, w, store, t),
    })

    const coverWatcher = createCoverWatcher(place, signal, (cover) => merge({ cover }), { store })

    const recheckAll = () => {
      void coverWatcher.check()
      void nearWatcher.check()
      void farWatcher.check()
      void weatherWatcher.check()
    }
    recheckAll()

    const onVis = () => { if (typeof document !== 'undefined' && document.visibilityState === 'visible') recheckAll() }
    if (typeof window !== 'undefined') window.addEventListener('focus', recheckAll)
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVis)

    return () => {
      controller.abort()
      coverWatcher.dispose()
      nearWatcher.dispose()
      farWatcher.dispose()
      weatherWatcher.dispose()
      if (typeof window !== 'undefined') window.removeEventListener('focus', recheckAll)
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
