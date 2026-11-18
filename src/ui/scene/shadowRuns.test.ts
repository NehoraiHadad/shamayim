import { describe, expect, it } from 'vitest'
import { shadowRuns } from './shadowRuns'

const valley = [[0, 20], [100, 100], [200, 20], [375, 20]] as const

describe('floor shadow', () => {
  it('puts the floor below the eastern ridge in shadow at a low morning sun, none at a high sun', () => {
    const low = shadowRuns(valley, [1, .3])
    expect(low.length).toBeGreaterThan(0)
    expect(low[0][0]).toBeLessThanOrEqual(100)
    expect(low[0][1]).toBeLessThan(200)
    expect(shadowRuns(valley, [1, 3])).toEqual([])
  })
})
