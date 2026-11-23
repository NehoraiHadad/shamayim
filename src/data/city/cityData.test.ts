import { expect, it, vi } from 'vitest'
import { cellsForBand } from './columns'
import { squareCentre, encodeRuns, COLS, ROWS } from './grid'
import type { CityCell } from './types'

it('falls back without an index, then loads only indexed cells in the near band', async () => {
  const { loadCity } = await import('./cityData')
  const place = squareCentre({ cell: '320_348', row: 14, col: 20 })
  const index = { bbox: [31, 34, 33, 35], cells: ['320_348', '310_347'] }
  const bytes = new Uint8Array(COLS * ROWS * 3)
  bytes.set([243, 10, 255], (14 * COLS + 20) * 3)
  const request = vi.fn()
    .mockResolvedValueOnce(new Response(null, { status: 404 }))
    .mockResolvedValueOnce(Response.json(index))
    .mockResolvedValueOnce(Response.json({ v: 2, r: encodeRuns(bytes), t: [], p: [] }))
  vi.stubGlobal('fetch', request)
  try {
    const signal = new AbortController().signal
    expect(await loadCity(place, signal)).toBeNull()
    const data = await loadCity(place, signal)
    expect(data?.rows[1].some(bin => bin.built > 0 && bin.levels === 3)).toBe(true)
    expect(data?.raster?.at(place.lat, place.lon)).toEqual({ built: 1, levels: 3, p90: 10, front: Math.sqrt(5000) })
    expect(request).toHaveBeenCalledTimes(3)
    expect(request.mock.calls[2][0]).toMatch(/\/320_348\.json$/)
    expect(await loadCity({ lat: 0, lon: 0 }, signal)).toBeNull()
  } finally {
    vi.unstubAllGlobals()
  }
})

it('loads outer squares and towers while keeping the original strip and tower filters', async () => {
  vi.resetModules()
  const { loadCity } = await import('./cityData')
  const place = { lat: 32.06, lon: 34.85 }
  const key = '321_348'
  const cell: CityCell = { v: 1, r: [[0, 0, btoa(String.fromCharCode(0x82, 18))]], t: [
    [32.1, 34.85, 100, 2, 'North tower'],
    [32.1, 34.85, 99, 1],
    [32.11, 34.85, 110, 1],
  ] }
  const fetchCell = vi.fn(async (url: string) => Response.json(url.endsWith('/index.json')
    ? { bbox: [30, 34, 34, 36], cells: [key] } : cell))
  vi.stubGlobal('fetch', fetchCell)
  try {
    expect(cellsForBand(place)).not.toContain(key)
    const city = await loadCity(place, new AbortController().signal)
    expect(fetchCell).toHaveBeenCalledTimes(2)
    expect(city?.towers).toMatchObject([{ name: 'North tower', heightM: 100, wClass: 2, dx: 0 }])
    expect(city?.towers[0].dy).toBeCloseTo(4.4528)
    expect(city?.rows.flat().every(column => column.built === 0)).toBe(true)
    const outer = squareCentre({ cell: key, row: 0, col: 0 })
    expect(city?.raster?.at(outer.lat, outer.lon)).toEqual({ built: 8 / 15, levels: 2, p90: 18 })
    expect(city?.raster?.towers).toHaveLength(3)
  } finally {
    vi.unstubAllGlobals()
  }
})

it('fetches cells reached by the sixth kilometre', async () => {
  vi.resetModules()
  const { loadCity } = await import('./cityData')
  const place = { lat: 32.05, lon: 34.85 }
  const key = '321_348'
  const fetchCell = vi.fn(async (url: string) => Response.json(url.endsWith('/index.json')
    ? { bbox: [30, 34, 34, 36], cells: [key] } : { v: 1, r: [], t: [] }))
  vi.stubGlobal('fetch', fetchCell)
  try {
    expect(cellsForBand(place, 5)).not.toContain(key)
    expect((await loadCity(place, new AbortController().signal))?.raster).toBeDefined()
    expect(fetchCell.mock.calls[1][0]).toMatch(/\/321_348\.json$/)
  } finally {
    vi.unstubAllGlobals()
  }
})
