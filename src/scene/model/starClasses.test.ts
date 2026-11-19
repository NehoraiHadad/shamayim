import { describe, expect, it } from 'vitest'
import { STAR_CLASSES, starShare } from './starClasses'

describe('stars by twilight', () => {
  it('shows none while the sun is under 4.5° below, only the brightest at −6°, all by −17°', () => {
    const shares = (alt: number) => STAR_CLASSES.map((c) => starShare(alt, c))
    expect(shares(-4)).toEqual([0, 0, 0])
    const civil = shares(-6)
    expect(civil[0]).toBeGreaterThan(0)
    expect(civil[1]).toBe(0)
    expect(civil[2]).toBe(0)
    expect(shares(-12)[1]).toBe(1)
    expect(shares(-17)).toEqual([1, 1, 1])
  })
})
