import { describe, expect, it } from 'vitest'
import { ridgeLightPaths, ridgeLightRay } from './ridgeLighting'

type Point = [number, number]
const valley: Point[] = [[0, 20], [10, 28], [20, 40], [30, 28], [40, 20]]
const options = { noonWeight: 0, rimX: null, depth: 16 }
const bands = (path: string) => Array.from(path.matchAll(/M([^,]+),[^H]+H([^L]+)/g),
  ([, left, right]) => [Number(left), Number(right)])

describe('ridge geometry', () => {
  it('mirrors the lit flank between eastern and western light', () => {
    const east = bands(ridgeLightPaths(valley, { ...options, ray: [1, .4] }).crescent)
    const west = bands(ridgeLightPaths(valley, { ...options, ray: [-1, .4] }).crescent)
    expect(east).toHaveLength(1)
    expect(west).toEqual(east.map(([left, right]) => [40 - right, 40 - left]))
    expect(east[0][1]).toBeLessThan(20)
  })

  it('shortens the same-ridge shadow as the ray rises', () => {
    const low = ridgeLightPaths(valley, { ...options, ray: [1, .4] }).crescent
    const higher = ridgeLightPaths(valley, { ...options, ray: [1, 1] }).crescent
    expect(bands(higher)[0][1]).toBeGreaterThan(bands(low)[0][1])
  })

  it('separates bands on either side of a shadow', () => {
    const ridge: Point[] = [[0, 15], [10, 25], [20, 50], [30, 15], [40, 25], [50, 30]]
    const intervals = bands(ridgeLightPaths(ridge, { ...options, ray: [1, .5] }).crescent)
    expect(intervals).toHaveLength(2)
    expect(intervals[0][1]).toBeLessThan(intervals[1][0])
  })

  it('gives matching noon depths on equal slopes and the most depth on flats', () => {
    const noon = { ...options, ray: [0, 1] as Point, noonWeight: 1 }
    const slope: Point[] = [[0, 20], [10, 28], [20, 36]]
    const opposite: Point[] = [[0, 36], [10, 28], [20, 20]]
    for (const profile of [slope, opposite]) {
      expect(ridgeLightPaths(profile, noon).crescent).toContain('10,30.5')
    }
    expect(ridgeLightPaths([[0, 28], [10, 28], [20, 28]], noon).crescent).toContain('10,31.2')
    expect(ridgeLightRay(0, 45)[0]).toBe(0)
    expect(ridgeLightRay(1, 5)[1]).toBeLessThan(ridgeLightRay(1, 20)[1])
    expect(ridgeLightRay(2, -3)).toEqual([1, ridgeLightRay(1, .5)[1]])
  })

  it('handles empty, single, repeated and flat profiles without nonfinite coordinates', () => {
    for (const profile of [[], [[0, 30]], [[0, 30], [0, 35]]] as Point[][]) {
      expect(ridgeLightPaths(profile, { ...options, ray: [1, 1] })).toEqual({ crescent: '', rim: '' })
    }
    const clean: Point[] = [[0, 30], [10, 30], [20, 30]]
    const flat = ridgeLightPaths(clean, { ...options, ray: [0, 1] })
    expect(flat.crescent).toContain('10,46')
    expect(flat.crescent).not.toMatch(/NaN|Infinity/)
    expect(ridgeLightPaths([[0, 30], ...clean], { ...options, ray: [0, 1] })).toEqual(flat)
  })

  it('draws a local rim without a twilight crescent', () => {
    const profile: Point[] = [[0, 30], [100, 60], [200, 30], [300, 50]]
    const result = ridgeLightPaths(profile, { ...options, ray: null, rimX: 255 })
    expect(result).toEqual({ crescent: '', rim: 'M185,34.5L200,30L300,50' })
  })
})
