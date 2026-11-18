import { expect, it, vi } from 'vitest'
import { loadCity } from './cityData'
import { squareCentre, encodeRuns, COLS, ROWS } from './grid'

it('falls back without an index, then loads only indexed cells in the near band', async () => {
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
