import { expect, it, vi } from 'vitest'
import { cellsForBand } from './columns'
import { squareCentre, encodeRuns, COLS, ROWS } from './grid'
import type { CityCell } from './types'

it('falls back without an index, then loads only indexed cells in the near band', async () => {
  const { loadCity } = await import('./cityData')
  const place = squareCentre({ cell: '320_348', row: 14, col: 20 })
  const index = { bbox: [31, 34, 33, 35], cells: ['320_348', '310_347'] }
  const bytes = new Uint8Array(COLS * ROWS * 2)
  bytes.set([243, 10], (14 * COLS + 20) * 2)
  const request = vi.fn()
    .mockResolvedValueOnce(new Response(null, { status: 404 }))
    .mockResolvedValueOnce(Response.json(index))
    .mockResolvedValueOnce(Response.json({ v: 1, r: encodeRuns(bytes), t: [] }))
  vi.stubGlobal('fetch', request)
  try {
    const signal = new AbortController().signal
    expect(await loadCity(place, signal)).toBeNull()
    const data = await loadCity(place, signal)
    expect(data?.rows[1].some(bin => bin.built > 0 && bin.levels === 3)).toBe(true)
    expect(request).toHaveBeenCalledTimes(3)
    expect(request.mock.calls[2][0]).toMatch(/\/320_348\.json$/)
    expect(await loadCity({ lat: 0, lon: 0 }, signal)).toBeNull()
  } finally {
    vi.unstubAllGlobals()
  }
})

it('loads tower-only outer cells and leaves the fabric band at three kilometres', async () => {
  vi.resetModules()
  const { loadCity } = await import('./cityData')
  const place = { lat: 32.06, lon: 34.85 }
  const key = '321_348'
  const cell: CityCell = { v: 1, r: [], t: [
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
  } finally {
    vi.unstubAllGlobals()
  }
})
