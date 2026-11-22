import { describe, expect, it } from 'vitest'
import { acrossSpeed, carriedS, carriedShadow, carriedSheet, minuteStart, pxPerRadAt } from './advect'
import type { LayerOf } from './types'

const sheet = (speeds: number[]): LayerOf<'cloudSheet'> => ({
  kind: 'cloudSheet', id: 'cloudSheet.low', surface: 'sky', z: 8, lattice: 'low', genus: 'sc', bounds: { x: 0, y: 0, w: 300, h: 60 },
  xs: [0, 300], ys: [0, 20, 60], alpha: [1, 1, 1, 1, 1, 1], tone: [0, 0, 0, 0, 0, 0], body: [1, 1, 1], shade: [0.5, 0.5, 0.5],
  lit: [1, 1, 1], speeds, key: 'k',
})

describe('the wind carry between minutes', () => {
  it('moves a point the way the wind turns its azimuth, slower with range', () => {
    // An east wind past a point due north turns it toward the east: azimuth grows.
    const near = acrossSpeed([1, 0], [0, 1], 2, 100), far = acrossSpeed([1, 0], [0, 1], 20, 100)
    expect(near).toBeGreaterThan(0)
    expect(far).toBeCloseTo(near / 10, 9)
    // A wind along the view moves nothing across it.
    expect(acrossSpeed([0, 1], [0, 1], 2, 100)).toBe(0)
    expect(acrossSpeed([1, 0], [0, 1], 0, 100)).toBe(0)
  })

  it('reads px per radian, signed by which way azimuth runs across the view', () => {
    expect(pxPerRadAt((x) => x / 4, 100)).toBeCloseTo(4 * 180 / Math.PI, 6)
    expect(pxPerRadAt((x) => 10 - x / 4, 100)).toBeCloseTo(-4 * 180 / Math.PI, 6)
    // Across north (359° → 0°) the turn is still a quarter degree.
    expect(pxPerRadAt((x) => (359.9 + x / 4) % 360, 0)).toBeCloseTo(4 * 180 / Math.PI, 6)
  })

  it('carries from the start of the minute, never before it, nor past the cap, nor under reduced motion', () => {
    const from = minuteStart({ laidAt: 100, sinceS: 30 })
    const spec = { mode: 'drift' as const, advect: { from, bands: [] } }
    expect(from).toBe(70)
    expect(carriedS(spec, 60)).toBe(0)
    expect(carriedS(spec, 100)).toBe(30)
    expect(carriedS(spec, 1000)).toBe(75)
    expect(carriedS(spec, 100, true)).toBe(0)
    expect(carriedS(undefined, 100)).toBe(0)
  })

  it('cuts a sheet into thin bands whose speeds follow its rows', () => {
    const carried = carriedSheet(sheet([3, 2, 0]), 5)
    const bands = carried.animated!.advect!.bands
    expect(carried.animated!.advect!.from).toBe(5)
    expect(bands[0].y).toBe(0)
    expect(bands.length).toBe(10)
    bands.slice(1).forEach((band, i) => {
      expect(band.y - bands[i].y).toBe(6)
      expect(band.speed).toBeLessThanOrEqual(bands[i].speed)
      expect(bands[i].speed - band.speed).toBeLessThan(0.31)
    })
    expect(bands[0].speed).toBeCloseTo(3 - 3 / 20, 9)
  })

  it('leaves a sheet with no wind still', () => {
    const still = sheet([0, 0, 0])
    expect(carriedSheet(still, 5)).toBe(still)
  })

  it('carries a plane of shadows at the speed of the shadows at each height', () => {
    const blob = (y: number, speed: number) => ({ cellId: y, centre: [0, 5] as [number, number], x: 100, y, rx: 20, ry: 5, alpha: 0.4, speed })
    const shadow: LayerOf<'cloudShadow'> = { kind: 'cloudShadow', id: 'cloudShadow.far', surface: 'land', z: 40.3, plane: 'far',
      rgb: [0, 0, 0], clip: null, bounds: { x: 0, y: 0, w: 375, h: 60 }, blobs: [blob(50, 1), blob(10, 0.2)], key: 'k' }
    const bands = carriedShadow(shadow, 0).animated!.advect!.bands
    expect(bands.length).toBe(10)
    expect(bands[0].speed).toBeCloseTo(0.2, 9)
    expect(bands[bands.length - 1].speed).toBeCloseTo(1, 9)
    expect(bands[4].speed).toBeGreaterThan(0.2)
    expect(bands[4].speed).toBeLessThan(1)
    expect(carriedShadow({ ...shadow, blobs: [] }, 0).animated).toBeUndefined()
  })
})
