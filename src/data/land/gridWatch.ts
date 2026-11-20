import type { Place } from '../../config/place'
import { observationFreshness, type CacheHit } from './landCache'

/**
 * Active-tab lifecycle watcher for satellite grids (`NearLandGrid`, `FarLandGrid`).
 * Serves cached grids immediately, rechecks on focus/visibility or scheduled timers once `ttlMs`
 * elapses, and drops mounted observations exceeding `maxStaleMs` independently of in-flight fetches.
 */
const MAX_TIMEOUT_MS = 2_147_483_647 // 32-bit signed setTimeout ceiling (~24.85 days)

export interface GridWatcherOpts<T> {
  ttlMs: number
  maxStaleMs: number
  readCached: (placeId: string, now: number) => Promise<CacheHit<T> | null>
  writeCached: (placeId: string, value: T, now: number) => Promise<void>
  fetchGrid: (place: Place, signal: AbortSignal) => Promise<T | null>
  now?: () => number
}

export interface GridWatcher {
  check(): Promise<void>
  dispose(): void
}

export function createGridWatcher<T>(
  place: Place,
  signal: AbortSignal,
  onUpdate: (next: T | null) => void,
  opts: GridWatcherOpts<T>,
): GridWatcher {
  const clock = opts.now ?? Date.now
  const { ttlMs, maxStaleMs } = opts
  let active: { value: T; savedAt: number } | null = null
  let inFlight: Promise<void> | null = null
  let timer: ReturnType<typeof setTimeout> | undefined

  const clearTimer = () => { if (timer !== undefined) { clearTimeout(timer); timer = undefined } }

  const expireIfNeeded = () => {
    if (signal.aborted || !active) return
    if (observationFreshness(active.savedAt, ttlMs, maxStaleMs, clock()) === 'expired') {
      active = null
      clearTimer()
      onUpdate(null)
    }
  }

  const schedule = () => {
    clearTimer()
    if (!active || signal.aborted) return
    const now = clock()
    const status = observationFreshness(active.savedAt, ttlMs, maxStaleMs, now)
    if (status === 'expired') { expireIfNeeded(); return }
    const age = now - active.savedAt
    const toExpiry = Math.max(0, maxStaleMs - age) + 1000
    const toRefresh = status === 'fresh' ? Math.max(0, ttlMs - age) + 1000 : toExpiry
    const delay = Math.min(MAX_TIMEOUT_MS, toRefresh, toExpiry)
    timer = setTimeout(() => { expireIfNeeded(); void check() }, delay)
  }

  const publish = (value: T, savedAt: number) => {
    if (signal.aborted) return
    if (observationFreshness(savedAt, ttlMs, maxStaleMs, clock()) === 'expired') { expireIfNeeded(); return }
    active = { value, savedAt }
    onUpdate(value)
    schedule()
  }

  const check = (): Promise<void> => {
    if (signal.aborted) return Promise.resolve()
    expireIfNeeded()
    if (inFlight) return inFlight
    if (active && observationFreshness(active.savedAt, ttlMs, maxStaleMs, clock()) === 'fresh') {
      return Promise.resolve()
    }
    inFlight = (async () => {
      if (!active) {
        const hit = await opts.readCached(place.id, clock()).catch(() => null)
        if (signal.aborted) return
        if (hit && observationFreshness(hit.savedAt, ttlMs, maxStaleMs, clock()) !== 'expired') {
          publish(hit.value, hit.savedAt)
          if (hit.fresh && observationFreshness(hit.savedAt, ttlMs, maxStaleMs, clock()) === 'fresh') return
        }
      }
      const reply = await opts.fetchGrid(place, signal).catch(() => null)
      if (!reply || signal.aborted) return
      const savedAt = clock()
      await opts.writeCached(place.id, reply, savedAt).catch(() => undefined)
      publish(reply, savedAt)
    })().finally(() => {
      inFlight = null
      expireIfNeeded()
      schedule()
    })
    return inFlight
  }

  return { check, dispose: clearTimer }
}
