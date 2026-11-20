import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadFootprintLandCover, resetLandCoverCache } from './landData'

const LAND_DIR = path.resolve('public/data/land/il')

function diskFetch(): typeof fetch {
  return (async (input) => {
    const file = path.basename(String(input))
    const full = path.join(LAND_DIR, file)
    if (!fs.existsSync(full)) return new Response(null, { status: 404 })
    return new Response(fs.readFileSync(full, 'utf8'), { status: 200 })
  }) as typeof fetch
}

afterEach(() => {
  vi.unstubAllGlobals()
  resetLandCoverCache()
})

describe('loadFootprintLandCover with generated coarse WorldCover overview', () => {
  it('covers ±60 km panorama footprints across borders, restores omitted sea tiles as water, and keeps true nodata explicit', async () => {
    const place = { lat: 32.3465, lon: 35.5325 }
    const cover = await loadFootprintLandCover(place, undefined, 6, diskFetch())
    expect(cover).not.toBeNull()

    // 60 km east of Shadmot (~36.17° E, Jordan): outside the old 36.0° E fine extent, now covered by coarse overview!
    expect(cover!.coverAt(32.3465, 36.17)).toBeGreaterThan(0)
    // 60 km north of northern Galilee (33.85° N, 35.60° E, Lebanon) and 60 km south of Eilat (29.05° N, 35.00° E)
    expect(cover!.coverAt(33.85, 35.60)).toBeGreaterThan(0)
    expect(cover!.coverAt(29.05, 35.00)).toBeGreaterThan(0)

    // Missing all-water fine tile inside Israel bbox (321_346 = 32.15° N, 34.65° E, Mediterranean off Tel Aviv): water (8), NOT 0!
    expect(fs.existsSync(path.join(LAND_DIR, '321_346.json'))).toBe(false)
    expect(cover!.coverAt(32.15, 34.65)).toBe(8)

    // Dead Sea and Kinneret remain water (8)
    expect(cover!.coverAt(31.50, 35.48)).toBe(8)
    expect(cover!.coverAt(32.82, 35.58)).toBe(8)

    // True ESA WorldCover offshore nodata (open Mediterranean ~65 km west of coast at 32.10° N, 34.05° E) stays explicit 0
    expect(cover!.coverAt(32.10, 34.05)).toBe(0)
    // Outside entire bbox stays 0
    expect(cover!.coverAt(40.0, 20.0)).toBe(0)
  })

  it('does not poison the shared coarse promise on caller abort and retries after transient failure', async () => {
    resetLandCoverCache()
    const coarseJson = fs.readFileSync(path.join(LAND_DIR, 'coarse.json'), 'utf8')
    let coarseCalls = 0
    let failNext = true
    const mockFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('index.json')) return new Response(null, { status: 404 })
      if (url.endsWith('coarse.json')) {
        coarseCalls++
        // Shared coarse load must NOT bind the caller's per-mount abort signal
        expect(init?.signal).toBeUndefined()
        if (failNext) { failNext = false; return new Response(null, { status: 503 }) }
        return new Response(coarseJson, { status: 200 })
      }
      return new Response(null, { status: 404 })
    })
    vi.stubGlobal('fetch', mockFetch)

    // 1. Transient 503 returns null but clears the failed slot so next caller retries
    const first = await loadFootprintLandCover({ lat: 32.35, lon: 35.53 })
    expect(first).toBeNull()
    expect(coarseCalls).toBe(1)

    // 2. Caller aborts immediately while starting the shared coarse load -> caller gets null,
    //    but a subsequent fresh caller succeeds without being poisoned!
    const ctrl = new AbortController()
    const p1 = loadFootprintLandCover({ lat: 32.35, lon: 35.53 }, ctrl.signal)
    ctrl.abort()
    expect(await p1).toBeNull()

    const p2 = await loadFootprintLandCover({ lat: 32.35, lon: 35.53 })
    expect(p2).not.toBeNull()
    expect(p2!.coverAt(32.3465, 36.17)).toBeGreaterThan(0)
    expect(p2!.coverAt(32.15, 34.65)).toBe(8)
    expect(coarseCalls).toBe(2) // shared successful promise reused across callers!
  })
})
