import { describe, expect, it } from 'vitest'
import type { FieldCell } from '../../world/field/types'
import { shadowEdge, shadowLobes } from './cloudShadowEdge'

const tower = { seed: 521, lattice: 'tower', genus: 'cb', baseKm: 1.5, vKm: 10, r: 2 } as FieldCell

describe('tower shadow heads', () => {
  it('projects the visible head proportions and anvil along the solar ray', () => {
    const sprite = { seed: tower.seed, w: 40, tall: 100 }
    const lobes = shadowLobes(tower, 0, 1, .4, 1.3, -1, sprite)
    const anvil = shadowLobes(tower, 0, 1, .4, 1.3, -1, { ...sprite, anvil: 1 })
    expect(anvil).not.toEqual(lobes)
    expect(shadowLobes(tower, 0, 1, -.4, 1.3, -1, sprite)).not.toEqual(lobes)
    const mirrored = shadowLobes(tower, 0, -1, .4, 1.3, -1, sprite)
    for (let i = 0; i < lobes.length; i++) {
      expect(mirrored[(lobes.length * 3 / 2 - i) % lobes.length]).toBeCloseTo(lobes[i], 12)
    }
  })

  it('keeps the equivalent beam area when the tower outline changes', () => {
    const lobes = shadowLobes(tower, 0, 1, .4, 1.3, -1)
    expect(Math.max(...lobes) - Math.min(...lobes)).toBeGreaterThan(.08)
    const area = (rim: number[]) => {
      const edge = shadowEdge(rim, 3, 8, 3, 1, .5)
      const radial = edge.lobes.map(lobe => edge.centre + lobe)
      const meanSquared = radial.reduce((sum, a, i) => {
        const b = radial[(i + 1) % radial.length]
        return sum + (a * a + a * b + b * b) / 3
      }, 0) / radial.length
      return meanSquared + (edge.widthX ** 2 + edge.widthY ** 2) / 32
    }
    expect(area(lobes)).toBeCloseTo(area(lobes.map(() => 0)), 12)
  })
})
