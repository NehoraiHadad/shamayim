import { describe, expect, it } from 'vitest'
import { moonlightStrength } from './moonlight'

const full = { altitude: 40, azimuth: 180, fraction: 1 }

describe('moonlight', () => {
  it('lights the land only in a dark sky, and a full moon far more than a half one', () => {
    expect(moonlightStrength(full, -3, 0, 0)).toBe(0)
    expect(moonlightStrength(full, -20, 0, 0)).toBeCloseTo(1, 5)
    expect(moonlightStrength({ ...full, fraction: .5 }, -20, 0, 0)).toBeLessThan(.2)
  })

  it('is lost under cloud and dimmed near the horizon', () => {
    expect(moonlightStrength(full, -20, 95, 0)).toBe(0)
    expect(moonlightStrength({ ...full, altitude: 4 }, -20, 0, 0)).toBeLessThan(.2)
  })
})
