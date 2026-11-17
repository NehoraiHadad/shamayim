import { describe, expect, it } from 'vitest'
import { profilePoints, profileToPath } from './profile'
import { GENERIC_TERRAIN, terrainForPlace } from './terrain'

const samples = (...elevations: number[]) => elevations.map((elevation) => ({ elevation }))

describe('profileToPath', () => {
  it('places profile points from west to east with monotone x coordinates', () => {
    const xs = profilePoints(samples(10, 40, 5, 80), 300, 100).map(([x]) => x)
    expect(xs).toEqual([0, 100, 200, 300])
  })

  it('keeps every terrain point inside the viewport', () => {
    const ys = profilePoints(samples(-500, 0, 2_000), 375, 128).map(([, y]) => y)
    expect(ys.every((y) => y >= 0 && y <= 128)).toBe(true)
  })

  it('draws flat terrain as a readable land band', () => {
    const ys = profilePoints(samples(20, 20, 20)).map(([, y]) => y)
    expect(new Set(ys).size).toBe(1)
    expect(Number(ys[0])).toBeGreaterThan(20)
    expect(Number(ys[0])).toBeLessThan(104)
  })

  it('draws a closed path of smooth curves', () => {
    const path = profileToPath(samples(10, 40, 5, 80))
    expect(path.startsWith('M0 128L')).toBe(true)
    expect(path.match(/C/g)).toHaveLength(3)
    expect(path.endsWith('L375 128Z')).toBe(true)
  })

  it('keeps the tuned Shadmot terrain and otherwise falls back gently', () => {
    expect(terrainForPlace('shadmot-mehola', null).centerLeft).toBe('47.5%')
    expect(terrainForPlace('elsewhere', null)).toBe(GENERIC_TERRAIN)
  })
})
