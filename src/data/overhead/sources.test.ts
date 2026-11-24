import { describe, expect, it } from 'vitest'
import { bboxAround, latestSatelliteSlot, parseRadarIndex, radarTiles, satelliteMapUrl, satelliteSlotFor } from './sources'

describe('parseRadarIndex', () => {
  it('reads past frames oldest first, in milliseconds', () => {
    const index = parseRadarIndex({ host: 'https://tilecache.rainviewer.com',
      radar: { past: [{ time: 1800, path: '/v2/radar/b' }, { time: 1200, path: '/v2/radar/a' }], nowcast: [] } })
    expect(index.frames.map((f) => f.time)).toEqual([1_200_000, 1_800_000])
    expect(radarTiles(index, index.frames[0])).toBe('https://tilecache.rainviewer.com/v2/radar/a/512/{z}/{x}/{y}/2/1_1.png')
  })
  it('gives no frames for an unknown shape', () => {
    expect(parseRadarIndex({ nope: 1 }).frames).toEqual([])
    expect(parseRadarIndex(null).frames).toEqual([])
  })
})

describe('satellite slots', () => {
  const now = Date.UTC(2026, 10, 18, 9, 7)
  it('picks the newest 15-minute slot at least 30 minutes old', () => {
    expect(new Date(latestSatelliteSlot(now)).toISOString()).toBe('2026-11-18T08:30:00.000Z')
  })
  it('matches a radar frame to the last slot before it, never past the newest', () => {
    expect(new Date(satelliteSlotFor(Date.UTC(2026, 10, 18, 8, 10), now)).toISOString()).toBe('2026-11-18T08:00:00.000Z')
    expect(new Date(satelliteSlotFor(Date.UTC(2026, 10, 18, 9, 0), now)).toISOString()).toBe('2026-11-18T08:30:00.000Z')
  })
  it('keeps the MapLibre bbox placeholder unescaped', () => {
    expect(satelliteMapUrl('msg_fes:clm', '{bbox-epsg-3857}', 256, null)).toMatch(/&bbox=\{bbox-epsg-3857\}$/)
  })
  it('builds a square box in metres', () => {
    const [x0, y0, x1, y1] = bboxAround(35, 32, 30).split(',').map(Number)
    expect(x1 - x0).toBeCloseTo(y1 - y0, -1)
    expect(x1 - x0).toBeGreaterThan(30_000)
  })
})
