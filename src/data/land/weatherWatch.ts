import type { Place } from '../../config/place'
import {
  readCachedWeather, weatherExpiryDelayMs, weatherFreshness, weatherRefreshDelayMs, writeCachedWeather,
} from './landCache'
import { fetchRecentWeather } from './recentWeather'
import type { RecentLandWeather } from './types'

/**
 * Active-tab recent-weather lifecycle controller:
 * - Clears expired active observations independently of in-flight request coalescing.
 * - Re-validates replies against `WEATHER_MAX_STALE_MS` (24 h) at actual publication time (after cache writes).
 * - Schedules refresh (6 h) and hard expiry (24 h) timers separately and coalesces overlapping refresh triggers.
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
  const liveOrNull = (w: RecentLandWeather | null) => (w && weatherFreshness(w, clock()) !== 'expired' ? w : null)

  let active = current
  if (active) {
    const status = weatherFreshness(active, now)
    if (status === 'fresh') return active
    if (status === 'expired') { active = null; onUpdate(null) }
  } else {
    const hit = await readCached(place.id, now).catch(() => null)
    if (signal.aborted) return liveOrNull(active)
    if (hit && weatherFreshness(hit.value, clock()) !== 'expired') {
      active = hit.value
      onUpdate(hit.value)
      if (hit.fresh && weatherFreshness(hit.value, clock()) === 'fresh') return active
    }
  }

  const reply = await fetchWeather(place, signal).catch(() => null)
  if (!reply || signal.aborted) return liveOrNull(active)
  const afterFetch = clock()
  if (weatherFreshness(reply, afterFetch) === 'expired') return liveOrNull(active)
  await writeCached(place.id, reply, afterFetch).catch(() => undefined)
  // Re-validate at publication time in case a slow cache write crossed the 24 h expiry cutoff.
  if (signal.aborted || weatherFreshness(reply, clock()) === 'expired') return liveOrNull(active)
  active = reply
  onUpdate(reply)
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

  const expireIfNeeded = () => {
    if (signal.aborted || !active) return
    if (weatherFreshness(active, clock()) === 'expired') {
      active = null
      clearTimers()
      onUpdate(null)
    }
  }

  const schedule = (weather: RecentLandWeather | null) => {
    clearTimers()
    if (!weather || signal.aborted) return
    const now = clock()
    if (weatherFreshness(weather, now) === 'expired') { expireIfNeeded(); return }
    const refreshDelay = weatherRefreshDelayMs(weather, now)
    if (refreshDelay !== null && refreshDelay > 0) {
      refreshTimer = setTimeout(() => { void check() }, refreshDelay + 1000)
    }
    const expiryDelay = weatherExpiryDelayMs(weather, now)
    if (expiryDelay !== null) {
      expiryTimer = setTimeout(() => { expireIfNeeded(); void check() }, expiryDelay + 1000)
    }
  }

  const publish = (next: RecentLandWeather | null) => {
    if (signal.aborted) return
    if (next && weatherFreshness(next, clock()) === 'expired') { expireIfNeeded(); return }
    if (next === null && active === null) return
    active = next
    onUpdate(next)
    schedule(next)
  }

  const check = (): Promise<void> => {
    if (signal.aborted) return Promise.resolve()
    expireIfNeeded()
    if (inFlight) return inFlight
    inFlight = checkActiveWeather(place, active, signal, publish, deps)
      .then(() => { expireIfNeeded(); schedule(active) })
      .finally(() => { inFlight = null })
    return inFlight
  }

  return { check, dispose: clearTimers }
}
