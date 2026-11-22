import { describe, expect, it } from 'vitest'
import { ridgeLightRay, ridgeLightSamples } from './ridgeLighting'

type Point = [number, number]
const valley: Point[] = [[0, 20], [10, 28], [20, 40], [30, 28], [40, 20]]
const options = { depth: 16 }
const lit = (profile: Point[], ray: Point) => ridgeLightSamples(profile, { ...options, ray }).filter((s) => s.amount > 0).map((s) => s.x)

describe('ridge geometry', () => {
  it('mirrors the lit flank between eastern and western light', () => {
    const east = lit(valley, [1, .4])
    const west = lit(valley, [-1, .4])
    expect(east.length).toBeGreaterThan(0)
    expect(east.map((x) => 40 - x).sort((a, b) => a - b)).toEqual(west)
  })

  it('lights more of the land as the ray rises', () => {
    const amount = (ray: Point) => ridgeLightSamples(valley, { ...options, ray }).reduce((sum, s) => sum + s.amount, 0)
    expect(amount([1, 1])).toBeGreaterThan(amount([1, .4]))
  })

  it('handles empty, single, repeated and flat profiles without nonfinite values', () => {
    for (const profile of [[], [[10, 20]], [[0, 20], [0, 20], [10, 20]], [[0, 30], [10, Number.NaN], [20, 30]]] as Point[][]) {
      for (const s of ridgeLightSamples(profile, { ...options, ray: [1, 1] })) {
        expect([s.x, s.y, s.amount].every(Number.isFinite)).toBe(true)
      }
    }
    expect(ridgeLightSamples(valley, { ...options, ray: null }).every((s) => s.amount === 0)).toBe(true)
  })

  it('takes the side from the disc and grazes the land at a low sun', () => {
    expect(ridgeLightRay(-2, 10)[0]).toBe(-1)
    expect(ridgeLightRay(1, 2)[1]).toBeLessThan(ridgeLightRay(1, 30)[1])
  })
})
