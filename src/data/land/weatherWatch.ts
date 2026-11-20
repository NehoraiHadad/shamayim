import type { Place } from '../../config/place'
import {
  readCachedWeather, weatherExpiryDelayMs, weatherFreshness, weatherRefreshDelayMs, writeCachedWeather,
} from './landCache'
import { fetchRecentWeather } from './recentWeather'
import type { RecentLandWeather } from './types'

/**
 * Active-tab recent-weather lifecycle controller:
 * - Validates cached and fetched replies against `WEATHER_MAX_STALE_MS` (24 h) before publishing.
 * - Schedules refresh (6 h) and hard expiry (24 h) timers separately so a stale reply or failed
 *   refresh at 6 h still clears the expired entry on an open tab at 24 h.
 * - Coalesces simultaneous focus, visibility and timer rechecks into a single in-flight request.
 */

export interface WeatherRecheckDeps {
  readCached?: (placeId: string, now: number) => Promise<{ value: RecentLandWeather; fresh: boolean } | null>
  fetchWeather?: (place: Place, signal: AbortSignal) => Promise<RecentLandWeather | null>
  writeCached?: (placeId: string, weather: RecentLandWeather, now: number) => Promise<void>
  now?: () => number
}

export async function checkActiveWeather(
  place: Place,
  current: RecentLandWeather | null,
  signal: AbortSignal,
  onUpdate: (next: RecentLandWeather | null) => void,
  deps: WeatherRecheckDeps = {},
): Promise<RecentLandWeather | null> {
  const clock = deps.now ?? Date.now
  const now = clock()
  const readCached = deps.readCached ?? ((id, t) => readCachedWeather(id, undefined, t))
  const fetchWeather = deps.fetchWeather ?? ((p, s) => fetchRecentWeather(p, { signal: s }))
  const writeCached = deps.writeCached ?? ((id, w, t) => writeCachedWeather(id, w, undefined, t))

  let active = current
  if (active) {
    const status = weatherFreshness(active, now)
    if (status === 'fresh') return active
    if (status === 'expired') { active = null; onUpdate(null) }
  } else {
    const hit = await readCached(place.id, now).catch(() => null)
    if (signal.aborted) return active
    if (hit && weatherFreshness(hit.value, clock()) !== 'expired') {
      active = hit.value
      onUpdate(hit.value)
      if (hit.fresh && weatherFreshness(hit.value, clock()) === 'fresh') return active
    }
  }

  const reply = await fetchWeather(place, signal).catch(() => null)
  if (!reply || signal.aborted) return active
  const after = clock()
  if (weatherFreshness(reply, after) === 'expired') return active
  await writeCached(place.id, reply, after).catch(() => undefined)
  if (!signal.aborted) { active = reply; onUpdate(reply) }
  return active
}

export interface WeatherWatcher {
  check(): Promise<void>
  dispose(): void
}

export function createWeatherWatcher(
  place: Place,
  signal: AbortSignal,
  onUpdate: (next: RecentLandWeather | null) => void,
  deps: WeatherRecheckDeps = {},
): WeatherWatcher {
  const clock = deps.now ?? Date.now
  let active: RecentLandWeather | null = null
  let inFlight: Promise<void> | null = null
  let refreshTimer: ReturnType<typeof setTimeout> | undefined
  let expiryTimer: ReturnType<typeof setTimeout> | undefined

  const clearTimers = () => {
    if (refreshTimer !== undefined) { clearTimeout(refreshTimer); refreshTimer = undefined }
    if (expiryTimer !== undefined) { clearTimeout(expiryTimer); expiryTimer = undefined }
  }

  const schedule = (weather: RecentLandWeather | null) => {
    clearTimers()
    if (!weather || signal.aborted) return
    const now = clock()
    const refreshDelay = weatherRefreshDelayMs(weather, now)
    if (refreshDelay !== null && refreshDelay > 0) {
      refreshTimer = setTimeout(() => { void check() }, refreshDelay + 1000)
    }
    const expiryDelay = weatherExpiryDelayMs(weather, now)
    if (expiryDelay !== null) {
      expiryTimer = setTimeout(() => { void check() }, expiryDelay + 1000)
    }
  }

  const publish = (next: RecentLandWeather | null) => {
    active = next
    onUpdate(next)
    schedule(next)
  }

  const check = (): Promise<void> => {
    if (signal.aborted) return Promise.resolve()
    if (inFlight) return inFlight
    inFlight = checkActiveWeather(place, active, signal, publish, deps)
      .then((finalActive) => {
        active = finalActive
        schedule(active)
      })
      .finally(() => { inFlight = null })
    return inFlight
  }

  return { check, dispose: clearTimers }
}
