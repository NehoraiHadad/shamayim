import { describe, expect, it } from 'vitest'
import { bboxAround, latestSatelliteSlot, parseRadarIndex, radarTiles, satelliteMapUrl, satelliteSlotFor } from './sources'
import { cloudShare } from './useObservedCloud'

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

describe('cloudShare', () => {
  it('counts white pixels among opaque ones', () => {
    const px = new Uint8ClampedArray([255, 255, 255, 255, 0, 192, 0, 255, 0, 0, 255, 255, 0, 0, 0, 0])
    expect(cloudShare(px)).toBeCloseTo(100 / 3)
  })
})

describe('observed cloud sampling', () => {
  it('tries the newest slot that may be out (~15 min late) first, then older ones', async () => {
    const { candidateSlots } = await import('./useObservedCloud')
    const at = Date.UTC(2026, 10, 18, 15, 0)
    expect(candidateSlots(at).map((t) => new Date(t).toISOString().slice(11, 16))).toEqual(['14:45', '14:30', '14:15'])
  })
  it('reads the middle 30 km for cover and the whole sample for single clouds', async () => {
    const { readMask } = await import('./useObservedCloud')
    const n = 24
    const rgba = new Uint8ClampedArray(n * n * 4)
    for (let k = 0; k < n * n; k++) rgba.set([0, 200, 0, 255], k * 4)
    // One cloud pixel outside the middle 12×12: west, a little south.
    rgba.set([255, 255, 255, 255], (13 * n + 2) * 4)
    const got = readMask(rgba)!
    expect(got.cover).toBe(0)
    expect(got.sightings).toHaveLength(1)
    expect(got.sightings![0].azimuth).toBeGreaterThan(260)
    expect(got.sightings![0].azimuth).toBeLessThan(270)
  })
})
