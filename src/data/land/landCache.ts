import { createIdbStore, createMemoryStore, type LandCacheStore } from './idbStore'
import { packFarGrid, packNearGrid, unpackFarGrid, unpackNearGrid, type PackedFarGrid, type PackedNearGrid } from './landPack'
import type { FarLandGrid, NearLandGrid, RecentLandWeather } from './types'

/**
 * Per-place TTL cache for living-land observations.
 * Uses IndexedDB (`shamayim-land-v1`) via `idbStore.ts` with kind-specific fresh TTLs and stale caps:
 * - Near S2 / Far GIBS: fresh 5 d / 3 d, stale-while-revalidate up to 30 d.
 * - Weather: anchored to the upstream `weather.fetchedAt` timestamp (so a Worker `STALE` copy is
 *   never promoted to fresh), fresh 6 h, evicted after 24 h (`WEATHER_MAX_STALE_MS`).
 */
export const NEAR_TTL_MS = 5 * 86_400_000
export const FAR_TTL_MS = 3 * 86_400_000
export const WEATHER_TTL_MS = 6 * 3_600_000
export const MAX_STALE_MS = 30 * 86_400_000
export const WEATHER_MAX_STALE_MS = 24 * 3_600_000

const CACHE_VERSION = 2

export type LandCacheKind = 'near' | 'far' | 'weather'
export type WeatherFreshness = 'fresh' | 'stale' | 'expired'
export { createIdbStore, createMemoryStore, type LandCacheStore }

export interface CacheHit<T> {
  value: T
  fresh: boolean
}

interface StoredRecord { v: number; savedAt: number; payload: unknown }

const TTL_BY_KIND: Record<LandCacheKind, number> = {
  near: NEAR_TTL_MS,
  far: FAR_TTL_MS,
  weather: WEATHER_TTL_MS,
}

const MAX_STALE_BY_KIND: Record<LandCacheKind, number> = {
  near: MAX_STALE_MS,
  far: MAX_STALE_MS,
  weather: WEATHER_MAX_STALE_MS,
}

const cacheKey = (kind: LandCacheKind, placeId: string) => `${kind}:${placeId}`

let defaultStore: LandCacheStore | null = null

export function getLandCacheStore(): LandCacheStore {
  defaultStore ??= createIdbStore(typeof indexedDB !== 'undefined' ? indexedDB : undefined)
  return defaultStore
}

/** Classifies an active `RecentLandWeather` observation against upstream freshness & stale limits. */
export function weatherFreshness(weather: RecentLandWeather, now = Date.now()): WeatherFreshness {
  const age = now - weather.fetchedAt
  if (age < 0 || age > WEATHER_MAX_STALE_MS) return 'expired'
  return age <= WEATHER_TTL_MS ? 'fresh' : 'stale'
}

/** Milliseconds until an active weather entry becomes stale (or 0 if already stale/expired). */
export function weatherRefreshDelayMs(weather: RecentLandWeather | null, now = Date.now()): number | null {
  if (!weather) return null
  const remaining = WEATHER_TTL_MS - (now - weather.fetchedAt)
  return Math.max(0, remaining)
}

async function readRaw(kind: LandCacheKind, placeId: string, store: LandCacheStore, now: number): Promise<CacheHit<unknown> | null> {
  const raw = (await store.get(cacheKey(kind, placeId))) as StoredRecord | null
  if (!raw || raw.v !== CACHE_VERSION || typeof raw.savedAt !== 'number') return null
  const age = now - raw.savedAt
  if (age < 0 || age > MAX_STALE_BY_KIND[kind]) { await store.del(cacheKey(kind, placeId)); return null }
  return { value: raw.payload, fresh: age <= TTL_BY_KIND[kind] }
}

export async function readCachedNear(placeId: string, store = getLandCacheStore(), now = Date.now()): Promise<CacheHit<NearLandGrid> | null> {
  const hit = await readRaw('near', placeId, store, now)
  return hit ? { value: unpackNearGrid(hit.value as PackedNearGrid), fresh: hit.fresh } : null
}

export async function writeCachedNear(placeId: string, grid: NearLandGrid, store = getLandCacheStore(), now = Date.now()): Promise<void> {
  await store.set(cacheKey('near', placeId), { v: CACHE_VERSION, savedAt: now, payload: packNearGrid(grid) })
}

export async function readCachedFar(placeId: string, store = getLandCacheStore(), now = Date.now()): Promise<CacheHit<FarLandGrid> | null> {
  const hit = await readRaw('far', placeId, store, now)
  return hit ? { value: unpackFarGrid(hit.value as PackedFarGrid), fresh: hit.fresh } : null
}

export async function writeCachedFar(placeId: string, grid: FarLandGrid, store = getLandCacheStore(), now = Date.now()): Promise<void> {
  await store.set(cacheKey('far', placeId), { v: CACHE_VERSION, savedAt: now, payload: packFarGrid(grid) })
}

export async function readCachedWeather(placeId: string, store = getLandCacheStore(), now = Date.now()): Promise<CacheHit<RecentLandWeather> | null> {
  const hit = await readRaw('weather', placeId, store, now)
  return hit ? { value: hit.value as RecentLandWeather, fresh: hit.fresh } : null
}

/** Stores recent weather anchored to its upstream `fetchedAt` timestamp (capped at `now`). */
export async function writeCachedWeather(placeId: string, weather: RecentLandWeather, store = getLandCacheStore(), now = Date.now()): Promise<void> {
  const anchored = Number.isFinite(weather.fetchedAt) && weather.fetchedAt > 0
    ? Math.min(weather.fetchedAt, now)
    : now
  await store.set(cacheKey('weather', placeId), { v: CACHE_VERSION, savedAt: anchored, payload: weather })
}
