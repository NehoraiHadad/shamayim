import { describe, expect, it } from 'vitest'
import { heightY, snowFall } from './snowLine'

const dry = { weatherCode: 3, snowfall: 0, temperature: 1 }

describe('snowFall', () => {
  it('is null on any day without falling snow, however cold', () => {
    expect(snowFall(dry, 950)).toBeNull()
    expect(snowFall({ ...dry, weatherCode: 63, temperature: -2 }, 950)).toBeNull()
  })

  it('caps on a snow code or on snowfall, heavier with more snow', () => {
    const light = snowFall({ ...dry, weatherCode: 71 }, 950)!
    const heavy = snowFall({ ...dry, weatherCode: 75 }, 950)!
    expect(heavy.amount).toBeGreaterThan(light.amount)
    expect(snowFall({ ...dry, snowfall: .4 }, 950)).not.toBeNull()
  })

  it('takes the line from the place: at or below it while snowing there, lower when colder', () => {
    const hill = snowFall({ weatherCode: 73, snowfall: 0, temperature: 3 }, 950)!
    expect(hill.lineM).toBeLessThanOrEqual(950)
    const cold = snowFall({ weatherCode: 73, snowfall: 0, temperature: -2 }, 950)!
    expect(cold.lineM).toBeLessThan(hill.lineM - 400)
    const valley = snowFall({ weatherCode: 73, snowfall: 0, temperature: 1 }, -175)!
    expect(valley.lineM).toBeLessThan(-175)
  })
})

describe('heightY', () => {
  const ridge = [200, 600, 1000, 600, 200]
  it('maps metres on the ridge profile (higher = smaller y)', () => {
    expect(heightY(900, ridge, null)!).toBeLessThan(heightY(400, ridge, null)!)
  })
  it('scales the hand-drawn valley from the sea line and the floor, and knows nothing elsewhere', () => {
    expect(heightY(0, undefined, -175)).toBe(72)
    expect(heightY(-175, undefined, -175)).toBeCloseTo(96)
    expect(heightY(500, undefined, null)).toBeNull()
  })
})
