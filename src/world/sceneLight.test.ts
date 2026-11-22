import { describe, expect, it } from 'vitest'
import { aerosolDepth, airMass, inShadow, shadowReach, sunFlattening, sunLight } from './sceneLight'

type Point = [number, number]

describe('scene light', () => {
  it('crosses about one air mass at the zenith and ~38 at the horizon', () => {
    expect(airMass(90)).toBeCloseTo(1, 2)
    expect(airMass(0)).toBeGreaterThan(36)
    expect(airMass(0)).toBeLessThan(40)
  })

  it('reddens and dims a low sun; blue goes first', () => {
    const noon = sunLight(60)
    const low = sunLight(1)
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
    expect(shadowReach(null)).toBe(.4)
  })
})

describe('sun colour through the day', () => {
  it('changes in small steps, with no jump from yellow to red', () => {
    const green = (altitude: number) => sunLight(altitude).rgb[1]
    // Near the horizon in the Jordan Valley the sun climbs ~0.2° a minute: one shown minute is one step.
    for (let a = 0.2; a < 30; a += 0.2) {
      expect(green(a + 0.2)).toBeGreaterThanOrEqual(green(a))
      expect(green(a + 0.2) - green(a)).toBeLessThan(.06)
    }
  })
})

describe('the hour air in the sun colour', () => {
  it('reddens a hazy sun more than a clean one at the same height, and dims it', () => {
    const clean = sunLight(4, { visibilityKm: 40 })
    const hazy = sunLight(4, { visibilityKm: 8 })
    expect(hazy.rgb[1]).toBeLessThan(clean.rgb[1] - .2)
    expect(hazy.strength).toBeLessThan(clean.strength)
  })

  it('keeps coarse dust greyer than fine haze of the same visibility', () => {
    expect(sunLight(4, { visibilityKm: 6, dustWeight: 1 }).rgb[1]).toBeGreaterThan(sunLight(4, { visibilityKm: 6 }).rgb[1])
  })

  it('deepens the aerosol as the air grows hazier', () => {
    expect(aerosolDepth({ visibilityKm: 8 })[1]).toBeGreaterThan(aerosolDepth({ visibilityKm: 40 })[1])
  })
})
