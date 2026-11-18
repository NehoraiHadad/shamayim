import { describe, expect, it } from 'vitest'
import { sunLightOf } from './LightRig'

describe('sunLightOf', () => {
  it('lights the face toward the sun, fully from 30° off the body', () => {
    expect(sunLightOf(100, 200)).toEqual({ side: 'w', k: 1 })
    expect(sunLightOf(300, 200)).toEqual({ side: 'e', k: 1 })
    expect(sunLightOf(null, 200)).toBeNull()
  })

  it('dims as sin δ toward the crossing, so the side swaps only where no light shows', () => {
    expect(sunLightOf(200 - 1.5 * 10, 200)!.k).toBeCloseTo(2 * Math.sin(Math.PI / 18), 2)
    const ks = Array.from({ length: 121 }, (_, i) => sunLightOf(140 + i, 200)!)
    ks.slice(1).forEach((light, i) => {
      expect(Math.abs(light.k - ks[i].k)).toBeLessThan(.035)
      if (light.side !== ks[i].side) expect(Math.max(light.k, ks[i].k)).toBeLessThan(.03)
    })
  })
})
