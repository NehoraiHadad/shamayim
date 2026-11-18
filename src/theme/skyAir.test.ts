import { describe, expect, it } from 'vitest'
import { hexToOklab } from './oklab'
import { skyAir } from './skyAir'

const sky = { mid: '#3172B0', horizon: '#BBD5EC' }
const dusk = { mid: '#565A8E', horizon: '#F29B5E' }

describe('the hour air on the sky', () => {
  it('leaves a clean day sky nearly as it is and whitens a hazy horizon', () => {
    expect(skyAir(sky, 30, { visibilityKm: 40 }).horizon).toBe(sky.horizon)
    const hazy = hexToOklab(skyAir(sky, 30, { visibilityKm: 5 }).horizon)
    expect(Math.hypot(hazy.a, hazy.b)).toBeLessThan(Math.hypot(hexToOklab(sky.horizon).a, hexToOklab(sky.horizon).b))
  })

  it('reddens a hazy sunset horizon', () => {
    const clean = hexToOklab(skyAir(dusk, 1, { visibilityKm: 40 }).horizon)
    const hazy = hexToOklab(skyAir(dusk, 1, { visibilityKm: 6 }).horizon)
    expect(hazy.a).toBeGreaterThan(clean.a)
  })
})
