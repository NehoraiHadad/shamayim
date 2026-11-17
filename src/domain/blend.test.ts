import { describe, expect, it } from 'vitest'
import { blendNumber, blendWeatherCode, iconWeight } from './blend'
import { confidenceFor } from './confidence'
describe('multi-model blending', () => {
  it('uses ICON short-range and ECMWF later/yesterday weights', () => {
    expect(iconWeight(-1)).toBe(0.4); expect(iconWeight(0)).toBe(0.6)
    expect(iconWeight(4)).toBe(0.6); expect(iconWeight(5)).toBe(0.4)
  })
  it('falls back when either model is missing', () => {
    expect(blendNumber({ icon: null, ecmwf: 12 }, 0.6)).toBe(12)
    expect(blendNumber({ icon: 8, ecmwf: null }, 0.4)).toBe(8)
  })
  it('lets a sufficiently probable wet code win', () => {
    expect(blendWeatherCode({ icon: 2, ecmwf: 61 }, { icon: 10, ecmwf: 40 }, 0.6)).toBe(61)
    expect(blendWeatherCode({ icon: 2, ecmwf: 61 }, { icon: 10, ecmwf: 39 }, 0.6)).toBe(2)
  })
  it('assigns all confidence levels', () => {
    expect(confidenceFor({ tempMax: 2, precipProb: 19 }, 0)).toBe('high')
    expect(confidenceFor({ tempMax: 2.1, precipProb: 19 }, 0)).toBe('medium')
    expect(confidenceFor({ tempMax: 0, precipProb: 40 }, 0)).toBe('low')
    expect(confidenceFor({ tempMax: 0, precipProb: 0 }, 5)).toBe('low')
  })
})
