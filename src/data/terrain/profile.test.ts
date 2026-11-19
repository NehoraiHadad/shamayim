import { describe, expect, it } from 'vitest'
import { gentleHillsPath, profilePoints, profileToPath, ridgePoints } from './profile'
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

  it('stands in with the drawn Shadmot valley or gentle hills until a panorama is known', () => {
    // The village sits just west of the valley's middle: on the right, west being on the right.
    expect(terrainForPlace('shadmot-mehola', null).centerLeft).toBe('52.5%')
    expect(terrainForPlace('shadmot-mehola', null).drawn).toBe(true)
    expect(terrainForPlace('shadmot-mehola', null).horizonY).toBeUndefined()
    expect(terrainForPlace('elsewhere', null)).toBe(GENERIC_TERRAIN)
  })
})

describe('ridgePoints', () => {
  it('follows the drawn ridge west to east, without the sides down to the bottom edge', () => {
    const pts = ridgePoints(gentleHillsPath())
    expect(pts[0]).toEqual([0, 72])
    expect(pts[pts.length - 1]).toEqual([375, 66])
    expect(pts.every(([x], i) => i === 0 || x > pts[i - 1][0])).toBe(true)
    expect(pts.every(([, y]) => y < 128)).toBe(true)
  })

  it('lands on every corner and between them traces the curve, not a straight chord', () => {
    const pts = ridgePoints('M0 128V50C30 44 60 48 90 62S134 90 150 96L200 97Q212 103 222 98L236 96V128Z')
    const at = (x: number) => pts.find(([px]) => px === x)?.[1]
    expect(at(90)).toBe(62)
    expect(at(150)).toBe(96)
    expect(at(222)).toBe(98)
    // The quadratic dips below both of its ends; a chord from 200 to 222 would not.
    expect(Math.max(...pts.filter(([x]) => x > 200 && x < 222).map(([, y]) => y))).toBeGreaterThan(99.5)
    // Halfway along the first curve (x 45) the line is near y 48.5; the old chord from (0,50) to (150,96) said 63.8.
    expect(at(45)).toBeCloseTo(48.5, 1)
  })
})
