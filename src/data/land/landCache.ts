import { createIdbStore, createMemoryStore, type LandCacheStore } from './idbStore'
import { packFarGrid, packNearGrid, unpackFarGrid, unpackNearGrid, type PackedFarGrid, type PackedNearGrid } from './landPack'
import type { FarLandGrid, NearLandGrid, RecentLandWeather } from './types'
import type { CoarseCoverJson } from './worldCoverGrid'

/**
 * Per-place TTL cache for living-land observations.
 * Uses IndexedDB (`shamayim-land-v1`) via `idbStore.ts` with kind-specific fresh TTLs and stale caps:
 * - Near S2 / Far GIBS: fresh 5 d / 3 d, stale-while-revalidate up to 30 d.
 * - Weather: anchored to the upstream `weather.fetchedAt` timestamp (so a Worker `STALE` copy is
 *   never promoted to fresh), fresh 6 h, evicted after 24 h (`WEATHER_MAX_STALE_MS`).
 * - Remote coarse WorldCover: static annual product, fresh 30 d, stale up to 90 d.
 */
export const NEAR_TTL_MS = 5 * 86_400_000
export const FAR_TTL_MS = 3 * 86_400_000
export const WEATHER_TTL_MS = 6 * 3_600_000
export const COVER_TTL_MS = 30 * 86_400_000
export const COVER_PARTIAL_TTL_MS = 3_600_000 // 1 h short TTL for partial WorldCover mosaics
export const MAX_STALE_MS = 30 * 86_400_000
export const WEATHER_MAX_STALE_MS = 24 * 3_600_000
export const COVER_MAX_STALE_MS = 90 * 86_400_000

const CACHE_VERSION = 3
export const COVER_CACHE_VERSION = 4 // bumped independently so pre-completeness v3 records are dropped

export type LandCacheKind = 'near' | 'far' | 'weather' | 'cover'
export type ObservationFreshness = 'fresh' | 'stale' | 'expired'
export type WeatherFreshness = ObservationFreshness
export { createIdbStore, createMemoryStore, type LandCacheStore }

export interface CacheHit<T> {
  value: T
  fresh: boolean
  savedAt: number
}
export interface CoverCacheHit extends CacheHit<CoarseCoverJson> { complete: boolean }

interface StoredRecord { v: number; savedAt: number; payload: unknown }
interface StoredCoverRecord { v: number; savedAt: number; complete: boolean; payload: CoarseCoverJson }

const TTL_BY_KIND: Record<LandCacheKind, number> = {
  near: NEAR_TTL_MS,
  far: FAR_TTL_MS,
  weather: WEATHER_TTL_MS,
  cover: COVER_TTL_MS,
}

const MAX_STALE_BY_KIND: Record<LandCacheKind, number> = {
  near: MAX_STALE_MS,
  far: MAX_STALE_MS,
  weather: WEATHER_MAX_STALE_MS,
  cover: COVER_MAX_STALE_MS,
}

const cacheKey = (kind: LandCacheKind, placeId: string) => `${kind}:${placeId}`

let defaultStore: LandCacheStore | null = null

export function getLandCacheStore(): LandCacheStore {
  defaultStore ??= createIdbStore(typeof indexedDB !== 'undefined' ? indexedDB : undefined)
  return defaultStore
}

/** Classifies any cached/mounted observation timestamp against fresh TTL and hard stale cap. */
export function observationFreshness(
  savedAt: number, ttlMs: number, maxStaleMs: number, now = Date.now(),
): ObservationFreshness {
  const age = now - savedAt
  if (!Number.isFinite(age) || age < 0 || age > maxStaleMs) return 'expired'
  return age <= ttlMs ? 'fresh' : 'stale'
}

/** Classifies an active `RecentLandWeather` observation against upstream freshness & stale limits. */
export function weatherFreshness(weather: RecentLandWeather, now = Date.now()): WeatherFreshness {
  return observationFreshness(weather.fetchedAt, WEATHER_TTL_MS, WEATHER_MAX_STALE_MS, now)
}

/** Milliseconds until an active weather entry becomes stale (or 0 if already stale/expired). */
export function weatherRefreshDelayMs(weather: RecentLandWeather | null, now = Date.now()): number | null {
  if (!weather) return null
  return Math.max(0, WEATHER_TTL_MS - (now - weather.fetchedAt))
}

/** Milliseconds until an active weather entry exceeds `WEATHER_MAX_STALE_MS` (24 h), or 0 if expired. */
export function weatherExpiryDelayMs(weather: RecentLandWeather | null, now = Date.now()): number | null {
  if (!weather) return null
  return Math.max(0, WEATHER_MAX_STALE_MS - (now - weather.fetchedAt))
}

async function readRaw(kind: LandCacheKind, placeId: string, store: LandCacheStore, now: number): Promise<CacheHit<unknown> | null> {
  const raw = (await store.get(cacheKey(kind, placeId))) as StoredRecord | null
  if (!raw || raw.v !== CACHE_VERSION || typeof raw.savedAt !== 'number') return null
  const status = observationFreshness(raw.savedAt, TTL_BY_KIND[kind], MAX_STALE_BY_KIND[kind], now)
  if (status === 'expired') { await store.del(cacheKey(kind, placeId)); return null }
  return { value: raw.payload, fresh: status === 'fresh', savedAt: raw.savedAt }
}

export async function readCachedNear(placeId: string, store = getLandCacheStore(), now = Date.now()): Promise<CacheHit<NearLandGrid> | null> {
  const hit = await readRaw('near', placeId, store, now)
  return hit ? { value: unpackNearGrid(hit.value as PackedNearGrid), fresh: hit.fresh, savedAt: hit.savedAt } : null
}

export async function writeCachedNear(placeId: string, grid: NearLandGrid, store = getLandCacheStore(), now = Date.now()): Promise<void> {
  await store.set(cacheKey('near', placeId), { v: CACHE_VERSION, savedAt: now, payload: packNearGrid(grid) })
}

export async function readCachedFar(placeId: string, store = getLandCacheStore(), now = Date.now()): Promise<CacheHit<FarLandGrid> | null> {
  const hit = await readRaw('far', placeId, store, now)
  return hit ? { value: unpackFarGrid(hit.value as PackedFarGrid), fresh: hit.fresh, savedAt: hit.savedAt } : null
}

export async function writeCachedFar(placeId: string, grid: FarLandGrid, store = getLandCacheStore(), now = Date.now()): Promise<void> {
  await store.set(cacheKey('far', placeId), { v: CACHE_VERSION, savedAt: now, payload: packFarGrid(grid) })
}

export async function readCachedWeather(placeId: string, store = getLandCacheStore(), now = Date.now()): Promise<CacheHit<RecentLandWeather> | null> {
  const hit = await readRaw('weather', placeId, store, now)
  return hit ? { value: hit.value as RecentLandWeather, fresh: hit.fresh, savedAt: hit.savedAt } : null
}

/** Stores recent weather anchored to its upstream `fetchedAt` timestamp (capped at `now`). */
export async function writeCachedWeather(placeId: string, weather: RecentLandWeather, store = getLandCacheStore(), now = Date.now()): Promise<void> {
  const anchored = Number.isFinite(weather.fetchedAt) && weather.fetchedAt > 0
    ? Math.min(weather.fetchedAt, now)
    : now
  await store.set(cacheKey('weather', placeId), { v: CACHE_VERSION, savedAt: anchored, payload: weather })
}

export async function readCachedCover(placeId: string, store = getLandCacheStore(), now = Date.now()): Promise<CoverCacheHit | null> {
  const key = cacheKey('cover', placeId)
  const raw = (await store.get(key)) as StoredCoverRecord | null
  if (!raw || raw.v !== COVER_CACHE_VERSION || typeof raw.savedAt !== 'number' || typeof raw.complete !== 'boolean') {
    if (raw) await store.del(key)
    return null
  }
  const value = raw.payload as CoarseCoverJson
  const complete = raw.complete && value?.complete === true && !value.missingTiles?.length
  const status = observationFreshness(raw.savedAt, complete ? COVER_TTL_MS : COVER_PARTIAL_TTL_MS, COVER_MAX_STALE_MS, now)
  if (status === 'expired') { await store.del(key); return null }
  return { value: { ...value, complete }, fresh: status === 'fresh', complete, savedAt: raw.savedAt }
}

export async function writeCachedCover(placeId: string, raw: CoarseCoverJson, store = getLandCacheStore(), now = Date.now()): Promise<void> {
  const complete = raw.complete === true && !raw.missingTiles?.length
  const payload: CoarseCoverJson = complete
    ? { v: raw.v, bbox: raw.bbox, stepDeg: raw.stepDeg, rows: raw.rows, cols: raw.cols, r: raw.r, complete: true }
    : { ...raw, complete: false }
  await store.set(cacheKey('cover', placeId), { v: COVER_CACHE_VERSION, savedAt: now, complete, payload })
}
