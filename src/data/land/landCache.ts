import { packFarGrid, packNearGrid, unpackFarGrid, unpackNearGrid, type PackedFarGrid, type PackedNearGrid } from './landPack'
import type { FarLandGrid, NearLandGrid, RecentLandWeather } from './types'

/**
 * Per-place TTL cache for living-land observations.
 * Uses IndexedDB (`shamayim-land-v1`) so binary TypedArrays (~60 KB per near grid) persist natively
 * without bloating `localStorage`; falls back to an in-memory store when IndexedDB is unavailable.
 */
export const NEAR_TTL_MS = 5 * 86_400_000
export const FAR_TTL_MS = 3 * 86_400_000
export const WEATHER_TTL_MS = 6 * 3_600_000
export const MAX_STALE_MS = 30 * 86_400_000

const DB_NAME = 'shamayim-land-v1'
const STORE_NAME = 'entries'
const CACHE_VERSION = 1

export type LandCacheKind = 'near' | 'far' | 'weather'

export interface CacheHit<T> {
  value: T
  fresh: boolean
}

export interface LandCacheStore {
  get(key: string): Promise<unknown>
  set(key: string, value: unknown): Promise<void>
  del(key: string): Promise<void>
}

interface StoredRecord { v: number; savedAt: number; payload: unknown }

const TTL_BY_KIND: Record<LandCacheKind, number> = {
  near: NEAR_TTL_MS,
  far: FAR_TTL_MS,
  weather: WEATHER_TTL_MS,
}

const cacheKey = (kind: LandCacheKind, placeId: string) => `${kind}:${placeId}`

/** In-memory cache store for unit tests and environments without IndexedDB. */
export function createMemoryStore(): LandCacheStore {
  const map = new Map<string, unknown>()
  return {
    async get(key) { return map.get(key) ?? null },
    async set(key, value) { map.set(key, value) },
    async del(key) { map.delete(key) },
  }
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE_NAME)) req.result.createObjectStore(STORE_NAME)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch { resolve(null) }
  })
}

let defaultStore: LandCacheStore | null = null

export function getLandCacheStore(): LandCacheStore {
  if (defaultStore) return defaultStore
  const mem = createMemoryStore()
  const dbPromise = openDb()
  defaultStore = {
    async get(key) {
      const db = await dbPromise
      if (!db) return mem.get(key)
      return new Promise((resolve) => {
        try {
          const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key)
          req.onsuccess = () => resolve(req.result ?? null)
          req.onerror = () => resolve(mem.get(key))
        } catch { resolve(mem.get(key)) }
      })
    },
    async set(key, value) {
      await mem.set(key, value)
      const db = await dbPromise
      if (!db) return
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite')
          tx.objectStore(STORE_NAME).put(value, key)
          tx.oncomplete = () => resolve()
          tx.onerror = () => resolve()
        } catch { resolve() }
      })
    },
    async del(key) {
      await mem.del(key)
      const db = await dbPromise
      if (!db) return
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite')
          tx.objectStore(STORE_NAME).delete(key)
          tx.oncomplete = () => resolve()
          tx.onerror = () => resolve()
        } catch { resolve() }
      })
    },
  }
  return defaultStore
}

async function readRaw(kind: LandCacheKind, placeId: string, store: LandCacheStore, now: number): Promise<CacheHit<unknown> | null> {
  const raw = (await store.get(cacheKey(kind, placeId))) as StoredRecord | null
  if (!raw || raw.v !== CACHE_VERSION || typeof raw.savedAt !== 'number') return null
  const age = now - raw.savedAt
  if (age < 0 || age > MAX_STALE_MS) { await store.del(cacheKey(kind, placeId)); return null }
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

export async function writeCachedWeather(placeId: string, weather: RecentLandWeather, store = getLandCacheStore(), now = Date.now()): Promise<void> {
  await store.set(cacheKey('weather', placeId), { v: CACHE_VERSION, savedAt: now, payload: weather })
}
