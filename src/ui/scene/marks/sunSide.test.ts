import { describe, expect, it } from 'vitest'
import { BACKLIT_PX, sunSideOf } from './LightRig'

describe('sunSideOf', () => {
  it('lights the face toward the sun, and none while the sun stands behind the body', () => {
    expect(sunSideOf(100, 200)).toBe('w')
    expect(sunSideOf(300, 200)).toBe('e')
    expect(sunSideOf(200 - BACKLIT_PX + 1, 200)).toBeNull()
    expect(sunSideOf(200 + BACKLIT_PX - 1, 200)).toBeNull()
    expect(sunSideOf(null, 200)).toBeNull()
  })

  it('never swaps sides between two adjacent sun positions: it passes through the backlit spell', () => {
    const sides = Array.from({ length: 81 }, (_, i) => sunSideOf(160 + i, 200))
    sides.slice(1).forEach((side, i) => expect(side && sides[i] && side !== sides[i]).toBeFalsy())
  })
})
