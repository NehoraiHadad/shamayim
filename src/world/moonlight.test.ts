import { describe, expect, it } from 'vitest'
import { moonAir, moonlightStrength } from './moonlight'

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

describe('the air in front of the moon', () => {
  const clear = { visibilityKm: 40, dustWeight: 0 }
  const bluish = (altitude: number, air = clear, daylight = 0) => { const { tint } = moonAir(altitude, air, daylight); return tint[2] / tint[0] }

  it('leaves a high moon alone and turns a low one to copper, by steps', () => {
    expect(bluish(90)).toBeCloseTo(1, 6)
    expect(bluish(45)).toBeGreaterThan(.97)
    expect(moonAir(45, clear).dim).toBeGreaterThan(.95)
    const seen = [60, 30, 15, 8, 4, 2, 0].map((a) => bluish(a))
    seen.slice(1).forEach((v, i) => expect(v).toBeLessThan(seen[i]))
    expect(seen.at(-1)).toBeLessThan(.4)
    expect(seen.at(-1)).toBeGreaterThan(.2)
    const copper = moonAir(1, clear).tint
    expect(copper[0]).toBe(1)
    expect(copper[1]).toBeGreaterThan(.5)
  })

  it('dims as it sinks but never goes out, and fine haze reddens it more', () => {
    const dims = [40, 20, 10, 5, 2, 0].map((a) => moonAir(a, clear).dim)
    dims.slice(1).forEach((v, i) => expect(v).toBeLessThan(dims[i]))
    expect(dims.at(-1)).toBeGreaterThan(.15)
    const haze = { visibilityKm: 10, dustWeight: 0 }, dust = { visibilityKm: 10, dustWeight: 1 }
    expect(bluish(10, haze)).toBeLessThan(bluish(10))
    expect(bluish(10, dust)).toBeGreaterThan(bluish(10, haze))
    expect(bluish(90, haze)).toBeCloseTo(1, 6)
  })

  it('shows less by day', () => expect(bluish(5, clear, 1)).toBeGreaterThan(bluish(5)))
})
