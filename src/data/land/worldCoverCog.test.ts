import { afterEach, describe, expect, it, vi } from 'vitest'
import { CogHttpError, createOpenTiff, isCogNotFound, type TiffImageLike, type TiffLike } from './cogReader'
import { COVER_TTL_MS, createMemoryStore, readCachedCover } from './landCache'
import { loadFootprintLandCover, resetLandCoverCache, type LandCover } from './landData'
import { WORLDCOVER_SAS_URL } from './worldCoverCog'

const PARIS = { lat: 48.86, lon: 2.35 } // ±60 km spans N48E000 (west) and N48E003 (east of 3.0° E)

function sasFetch(token = 'sas-tok'): typeof fetch {
  return (async (input) => {
    if (String(input) === WORLDCOVER_SAS_URL) {
      return new Response(JSON.stringify({ token, 'msft:expiry': '2099-01-01T00:00:00Z' }), { status: 200 })
    }
    return new Response(null, { status: 404 })
  }) as typeof fetch
}

function constantCog(tLat: number, tLon: number, worldCoverCode: number): TiffLike {
  const img: TiffImageLike = {
    getWidth: () => 562, getHeight: () => 562,
    getBoundingBox: () => [tLon, tLat, tLon + 3, tLat + 3], getGeoKeys: () => ({}),
    async readRasters({ window: [x0, y0, x1, y1] }) {
      return new Uint8Array((x1 - x0) * (y1 - y0)).fill(worldCoverCode)
    },
  }
  return { getImageCount: async () => 1, getImage: async () => img }
}

afterEach(() => { vi.useRealTimers(); resetLandCoverCache() })

describe('worldCoverCog partial-tile failure recovery, 404 absence and immediate stale publication', () => {
  it('publishes good slice on transient sibling failure, retries only failed tile before 30d TTL, and caches once complete', async () => {
    const store = createMemoryStore()
    let now = 1_795_000_000_000, eastUp = false
    const requested: string[] = []
    const openTiff = vi.fn(async (href: string) => {
      if (href.includes('N48E000')) { requested.push('N48E000'); return constantCog(48, 0, 50) } // built (5)
      if (href.includes('N48E003')) {
        requested.push('N48E003')
        if (!eastUp) throw new CogHttpError(503) // transient outage
        return constantCog(48, 3, 10) // tree (1)
      }
      throw new CogHttpError(404)
    })

    // 1. Cold load: west succeeds (5), east transiently fails (503) -> good slice published, cache marked incomplete
    const partial = await loadFootprintLandCover(PARIS, undefined, 6, sasFetch(), { placeId: 'paris', store, openTiff, now: () => now })
    expect(partial!.coverAt(48.86, 2.95)).toBe(5)
    expect(partial!.coverAt(48.86, 3.05)).toBe(0)
    const cached1 = await readCachedCover('paris', store, now)
    expect(cached1?.fresh).toBe(false)
    expect(cached1?.value.missingTiles).toEqual(['N48E003'])

    // 2. Reload just before 30d TTL after N48E003 recovers -> retries ONLY N48E003 and completes mosaic!
    now += COVER_TTL_MS - 60_000
    eastUp = true
    requested.length = 0
    const recovered = await loadFootprintLandCover(PARIS, undefined, 6, sasFetch(), { placeId: 'paris', store, openTiff, now: () => now })
    expect(requested).toEqual(['N48E003'])
    expect(recovered!.coverAt(48.86, 2.95)).toBe(5)
    expect(recovered!.coverAt(48.86, 3.05)).toBe(1)
    const cached2 = await readCachedCover('paris', store, now)
    expect(cached2?.fresh).toBe(true)
    expect(cached2?.value.missingTiles).toBeUndefined()

    // 3. Subsequent load before 30d makes zero COG requests
    requested.length = 0
    const hit = await loadFootprintLandCover(PARIS, undefined, 6, sasFetch(), { placeId: 'paris', store, openTiff, now: () => now + 1000 })
    expect(requested).toEqual([])
    expect(hit!.coverAt(48.86, 3.05)).toBe(1)
  })

  it('treats HTTP 404 absent tiles as complete without retrying', async () => {
    const store = createMemoryStore()
    const openTiff = vi.fn(async (href: string) => {
      if (href.includes('N48E000')) return constantCog(48, 0, 50)
      throw new CogHttpError(404) // known absent ocean tile
    })
    const cover = await loadFootprintLandCover(PARIS, undefined, 6, sasFetch(), { placeId: 'coast', store, openTiff })
    expect(cover!.coverAt(48.86, 2.35)).toBe(5)
    expect(cover!.coverAt(48.86, 3.05)).toBe(0)
    const cached = await readCachedCover('coast', store)
    expect(cached?.fresh).toBe(true)
    expect(cached?.value.missingTiles).toBeUndefined()
    openTiff.mockClear()
    await loadFootprintLandCover(PARIS, undefined, 6, sasFetch(), { placeId: 'coast', store, openTiff })
    expect(openTiff).not.toHaveBeenCalled()
  })

  it('preserves complete stale slices on partial refresh failure, publishes stale cover while pending, and enforces timeout', async () => {
    const store = createMemoryStore()
    let now = 1_795_000_000_000
    // Seed a complete mosaic (west=5, east=1) at t0
    await loadFootprintLandCover(PARIS, undefined, 6, sasFetch(), {
      placeId: 'paris', store, now: () => now,
      openTiff: async (href) => (href.includes('N48E000') ? constantCog(48, 0, 50) : constantCog(48, 3, 10)),
    })

    // Advance 45 days (stale 30–90 d): defer COG open and verify stale cover is published immediately while pending!
    now += 45 * 86_400_000
    let resolveWest!: (t: TiffLike) => void
    const updates: (LandCover | null)[] = []
    const refreshPromise = loadFootprintLandCover(PARIS, undefined, 6, sasFetch(), {
      placeId: 'paris', store, now: () => now,
      onUpdate: (c) => updates.push(c),
      openTiff: (href) => {
        if (href.includes('N48E000')) return new Promise((r) => { resolveWest = r })
        return Promise.reject(new CogHttpError(503)) // east fails transiently during stale refresh
      },
    })
    await new Promise((r) => setTimeout(r, 0))
    expect(updates).toHaveLength(1) // published stale cache BEFORE live COG resolved!
    expect(updates[0]!.coverAt(48.86, 2.95)).toBe(5)
    expect(updates[0]!.coverAt(48.86, 3.05)).toBe(1)

    // West refreshes to crop (4), east failed -> east stale slice (1) MUST be preserved, NOT overwritten with 0!
    resolveWest(constantCog(48, 0, 40))
    const merged = await refreshPromise
    expect(updates).toHaveLength(2)
    expect(merged!.coverAt(48.86, 2.95)).toBe(4)
    expect(merged!.coverAt(48.86, 3.05)).toBe(1)
    const afterPartial = await readCachedCover('paris', store, now)
    expect(afterPartial?.fresh).toBe(false)
    expect(afterPartial?.savedAt).toBe(1_795_000_000_000) // stale age preserved!

    // Hung COG refresh hits timeoutMs cleanly while keeping already-published stale cover intact
    vi.useFakeTimers()
    const timedUpdates: (LandCover | null)[] = []
    const hung = loadFootprintLandCover(PARIS, undefined, 6, sasFetch(), {
      placeId: 'paris', store, now: () => now, timeoutMs: 200,
      onUpdate: (c) => timedUpdates.push(c), openTiff: () => new Promise(() => undefined),
    })
    await vi.advanceTimersByTimeAsync(0)
    expect(timedUpdates).toHaveLength(1); expect(timedUpdates[0]!.coverAt(48.86, 3.05)).toBe(1)
    await vi.advanceTimersByTimeAsync(250)
    const timedRes = await hung
    expect(timedRes!.coverAt(48.86, 2.95)).toBe(4); expect(timedRes!.coverAt(48.86, 3.05)).toBe(1)
    vi.useRealTimers()
  })

  it('preserves HTTP status via createOpenTiff so 404 absence is distinct from 503 transient failure', async () => {
    const open404 = createOpenTiff((async () => new Response(null, { status: 404 })) as typeof fetch)
    const open503 = createOpenTiff((async () => new Response(null, { status: 503 })) as typeof fetch)
    expect(isCogNotFound(await open404('https://example.test/a.tif').catch((e) => e))).toBe(true)
    expect(isCogNotFound(await open503('https://example.test/b.tif').catch((e) => e))).toBe(false)
  })
})
