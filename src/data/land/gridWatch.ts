import type { Place } from '../../config/place'
import type { OpenTiffFn } from './cogReader'
import { observationFreshness, type CacheHit, type LandCacheStore } from './landCache'
import { loadFootprintLandCoverResult, type LandCover } from './landData'

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

export interface CoverWatcherOpts {
  store?: LandCacheStore; fetchImpl?: typeof fetch; openTiff?: OpenTiffFn; timeoutMs?: number; now?: () => number
}

/** Focus/mount watcher for footprint WorldCover: only defers rechecks using explicit completion metadata. */
export function createCoverWatcher(
  place: Place, signal: AbortSignal, onUpdate: (next: LandCover | null) => void, opts: CoverWatcherOpts = {},
): GridWatcher {
  const clock = opts.now ?? Date.now
  let inFlight: Promise<void> | null = null
  let nextCheckAt: number | null = null
  const check = (): Promise<void> => {
    if (signal.aborted) return Promise.resolve()
    if (inFlight) return inFlight
    if (nextCheckAt !== null && clock() < nextCheckAt) return Promise.resolve()
    inFlight = loadFootprintLandCoverResult(place, signal, 6, opts.fetchImpl ?? globalThis.fetch, {
      placeId: place.id, store: opts.store, openTiff: opts.openTiff,
      now: clock, timeoutMs: opts.timeoutMs, onUpdate,
    }).then((res) => {
      if (!signal.aborted) nextCheckAt = res.nextCheckAt
    }).catch(() => undefined).finally(() => { inFlight = null })
    return inFlight
  }
  return { check, dispose: () => undefined }
}
