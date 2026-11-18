import { describe, expect, it } from 'vitest'
import { readSeen, seenY } from './layout'

describe('single clouds in sky px', () => {
  it('stands a near cloud higher than a far one, never below just over the ridges', () => {
    expect(seenY(30, 330)).toBeLessThan(seenY(5, 330))
    expect(seenY(1, 330)).toBe(330 - 46)
    expect(seenY(80, 330)).toBeGreaterThanOrEqual(48)
  })
  it('reads the scene attribute into centres, sizes and strengths, ignoring junk', () => {
    const [a, ...rest] = readSeen('0.250,10.0,0.100,0.80;x,y', 0, 400, 330)
    expect(rest).toHaveLength(0)
    expect(a.x).toBe(100)
    expect(a.rx).toBe(40)
    expect(a.ry).toBeLessThan(a.rx)
    expect(a.strength).toBe(0.8)
    expect(readSeen(undefined, 0, 400, 330)).toEqual([])
  })
})
