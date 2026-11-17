import { describe, expect, it } from 'vitest'
import { THRESHOLDS as T } from '../config/thresholds'
import { thresholdsFor } from './placeThresholds'

const normal = { tempMax: 27, tempMaxSd: 2, tempMin: 15, gustMax: 60, gustMaxSd: 10 }
describe('thresholdsFor', () => {
  it('preserves fixed defaults without normals', () => {
    expect(thresholdsFor()).toEqual({ wind: T.wind, veryHot: T.dayTemp.veryHot, heatHours: T.heatHours })
  })
  it('scales every wind threshold together in windy places', () => {
    const { wind } = thresholdsFor(normal)
    expect(wind.gusts).toBe(70)
    expect(wind.brisk).toBeCloseTo(20 * 70 / 45)
    expect(wind.strong).toBeCloseTo(35 * 70 / 45)
  })
  it('never lowers wind thresholds for calm places', () => {
    expect(thresholdsFor({ ...normal, gustMax: 10, gustMaxSd: 2 }).wind).toEqual(T.wind)
  })
  it('clamps extreme heat to 35–41 and puts the heat span three degrees below it', () => {
    expect(thresholdsFor(normal)).toMatchObject({ veryHot: 35, heatHours: 32 })
    expect(thresholdsFor({ ...normal, tempMax: 30 })).toMatchObject({ veryHot: 38, heatHours: 35 })
    expect(thresholdsFor({ ...normal, tempMax: 40 })).toMatchObject({ veryHot: 41, heatHours: 38 })
  })
})
