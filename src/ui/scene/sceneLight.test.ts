import { describe, expect, it } from 'vitest'
import { airMass, inShadow, shadowReach, sunFlattening, sunLight, worldLight } from './sceneLight'

type Point = [number, number]

describe('scene light', () => {
  it('crosses about one air mass at the zenith and ~38 at the horizon', () => {
    expect(airMass(90)).toBeCloseTo(1, 2)
    expect(airMass(0)).toBeGreaterThan(36)
    expect(airMass(0)).toBeLessThan(40)
  })

  it('reddens and dims a low sun; blue goes first', () => {
    const noon = sunLight(60)
    const low = sunLight(3)
    expect(noon.rgb[2]).toBeGreaterThan(.75)
    expect(low.rgb[2]).toBeLessThan(.1)
    expect(low.rgb[1]).toBeLessThan(noon.rgb[1])
    expect(low.strength).toBeLessThan(noon.strength)
    expect(noon.rgb[0]).toBe(1)
  })

  it('squashes the disc only near the horizon', () => {
    expect(sunFlattening(0)).toBeCloseTo(.8, 5)
    expect(sunFlattening(10)).toBeGreaterThan(.99)
  })

  it('puts a valley floor in the shadow of the ridge toward a low sun, not a high one', () => {
    const valley: Point[] = [[0, 20], [100, 100], [200, 20]]
    expect(inShadow(valley, [1, .3], 100)).toBe(true)
    expect(inShadow(valley, [1, 3], 100)).toBe(false)
    expect(inShadow(valley, [1, .3], 199)).toBe(false)
  })

  it('casts longer shadows at a low sun and gives nothing without a sun', () => {
    expect(shadowReach([1, .2])).toBeGreaterThan(shadowReach([1, 2]))
    expect(worldLight(null, [], 375, 375)).toBeNull()
    expect(worldLight({ ray: null, altitude: 10 }, [], 375, 375)).toBeNull()
  })
})
