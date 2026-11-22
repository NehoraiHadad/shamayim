import { describe, expect, it } from 'vitest'
import { snowFall } from './snowLine'

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

  it('keeps a cover after the fall while snow lies on the ground, deeper reaching lower', () => {
    const thin = snowFall({ ...dry, temperature: 4, snowDepth: .05 }, 1100)!
    const deep = snowFall({ ...dry, temperature: 4, snowDepth: .5 }, 1100)!
    expect(thin.falling).toBe(false)
    expect(thin.lineM).toBeLessThanOrEqual(1100)
    expect(deep.lineM).toBeLessThan(thin.lineM)
    expect(deep.amount).toBeGreaterThan(thin.amount)
  })

  it('takes no cap from patches under a centimetre, and is falling while it snows', () => {
    expect(snowFall({ ...dry, snowDepth: .005 }, 1100)).toBeNull()
    expect(snowFall({ ...dry, weatherCode: 73, snowDepth: .2 }, 1100)!.falling).toBe(true)
  })
})

it('puts the falling line a melt depth under the forecast freezing level when it has one', () => {
  const air = { weatherCode: 73, snowfall: 0, temperature: 3 }
  const lapse = snowFall(air, 1200)!.lineM
  const given = snowFall({ ...air, freezingLevel: 1400 }, 1200)!.lineM
  expect(given).not.toBe(lapse)
  expect(given).toBeLessThan(1400 - 250)
  expect(snowFall({ ...air, freezingLevel: 3000 }, 950)!.lineM).toBeLessThanOrEqual(950)
  expect(snowFall({ ...air, freezingLevel: null }, 1200)!.lineM).toBe(lapse)
})
