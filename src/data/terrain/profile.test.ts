import { describe, expect, it } from 'vitest'
import { profileToPath } from './profile'
import { GENERIC_TERRAIN, terrainForPlace } from './terrain'

const samples = (...elevations: number[]) => elevations.map((elevation) => ({ elevation }))

describe('profileToPath', () => {
  it('places profile points from west to east with monotone x coordinates', () => {
    const path = profileToPath(samples(10, 40, 5, 80), 300, 100)
    const xs = [...path.matchAll(/L([\d.]+) [\d.]+/g)].slice(0, 4).map((match) => Number(match[1]))
    expect(xs).toEqual([0, 100, 200, 300])
  })

  it('keeps every terrain point inside the viewport', () => {
    const path = profileToPath(samples(-500, 0, 2_000), 375, 128)
    const ys = [...path.matchAll(/L[\d.]+ ([\d.]+)/g)].map((match) => Number(match[1]))
    expect(ys.every((y) => y >= 0 && y <= 128)).toBe(true)
  })

  it('draws flat terrain as a readable land band', () => {
    const path = profileToPath(samples(20, 20, 20))
    const ys = [...path.matchAll(/L[\d.]+ ([\d.]+)/g)].slice(0, 3).map((match) => match[1])
    expect(new Set(ys).size).toBe(1)
    expect(Number(ys[0])).toBeGreaterThan(20)
    expect(Number(ys[0])).toBeLessThan(104)
  })

  it('keeps the tuned Shadmot terrain and otherwise falls back gently', () => {
    expect(terrainForPlace('shadmot-mehola', null).centerLeft).toBe('47.5%')
    expect(terrainForPlace('elsewhere', null)).toBe(GENERIC_TERRAIN)
  })
})
