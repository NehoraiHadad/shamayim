import { describe, expect, it } from 'vitest'
import { SLOT_W, timeAtX, xAtTime } from './stripLayout'

describe('RTL strip time coordinates', () => {
  it('puts later hours to the left and round-trips minutes', () => {
    const first = '2026-11-17T10:00', width = 24 * SLOT_W
    expect(xAtTime('2026-11-17T11:00', first, width)).toBe(xAtTime(first, first, width) - SLOT_W)
    expect(timeAtX(xAtTime('2026-11-17T13:37', first, width), first, width)).toBe('2026-11-17T13:37')
  })
})
