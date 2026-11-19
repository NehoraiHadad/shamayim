import { describe, expect, it } from 'vitest'
import { seaSpan } from './seaLine'

describe('seaSpan', () => {
  it('runs from the west flank to the east flank, tucked a little into each nearest the middle', () => {
    const ridge: [number, number][] = [[0, 40], [100, 80], [200, 100], [300, 60], [375, 90]]
    const { x1, x2 } = seaSpan(ridge, 72)
    expect(x1).toBeCloseTo(74)
    expect(x2).toBeCloseTo(276)
  })

  it('falls back to a fixed span where the ridge never rises past sea level', () => {
    expect(seaSpan([[0, 100], [375, 100]], 72)).toEqual({ x1: 96, x2: 276 })
  })

  it('keeps the fixed span on a coast, where the middle of the scene stands above sea level', () => {
    expect(seaSpan([[0, 90], [100, 60], [200, 50], [375, 80]], 72)).toEqual({ x1: 96, x2: 276 })
  })
})
