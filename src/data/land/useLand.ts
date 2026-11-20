import { useEffect, useState } from 'react'
import type { Place } from '../../config/place'
import { fetchFarLand } from './gibs'
import {
  readCachedFar, readCachedNear, readCachedWeather,
  writeCachedFar, writeCachedNear, writeCachedWeather,
} from './landCache'
import { loadLandCover, type LandCover } from './landData'
import { fetchRecentWeather } from './recentWeather'
import { fetchNearLand } from './satellite'
import type { LandData } from './types'

const EMPTY: LandData = { cover: null, near: null, far: null, weather: null }

/**
 * Living-land data hook: returns immediately (never blocking first paint) with cached observations
 * as soon as IndexedDB replies, then refreshes stale or missing Sentinel-2 near, NASA GIBS far and
 * recent-weather data asynchronously in the background.
 */
export function useLand(place: Place, enabled: boolean): LandData {
  const [state, setState] = useState<LandData & { id: string }>(() => ({ id: place.id, ...EMPTY }))

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    const { signal } = controller
    const alive = () => !signal.aborted
    const merge = (patch: Partial<LandData>) => {
      if (alive()) setState((prev) => ({ ...(prev.id === place.id ? prev : EMPTY), id: place.id, ...patch }))
    }

    loadLandCover(place, signal).then((cover) => merge({ cover })).catch(() => undefined)

    readCachedNear(place.id).then((hit) => {
      if (hit) merge({ near: hit.value })
      if (!hit || !hit.fresh) {
        return fetchNearLand(place, signal).then((near) => {
          if (!near || !alive()) return
          void writeCachedNear(place.id, near)
          merge({ near })
        })
      }
    }).catch(() => undefined)

    readCachedFar(place.id).then((hit) => {
      if (hit) merge({ far: hit.value })
      if (!hit || !hit.fresh) {
        return fetchFarLand(place, signal).then((far) => {
          if (!far || !alive()) return
          void writeCachedFar(place.id, far)
          merge({ far })
        })
      }
    }).catch(() => undefined)

    readCachedWeather(place.id).then((hit) => {
      if (hit) merge({ weather: hit.value })
      if (!hit || !hit.fresh) {
        return fetchRecentWeather(place, { signal }).then((weather) => {
          if (!weather || !alive()) return
          void writeCachedWeather(place.id, weather)
          merge({ weather })
        })
      }
    }).catch(() => undefined)

    return () => controller.abort()
  }, [place, enabled])

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
