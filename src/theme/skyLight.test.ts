import { describe, expect, it } from 'vitest'
import { ratio } from './contrast'
import { deltaE, mixOklab } from './oklab'
import { skyLight } from './skyLight'
import { SKY_THEMES } from './skyThemes'

const fields = ['top', 'mid', 'horizon'] as const
const light = (altitude: number, rising = true, cloudCover = 0, wet = 0, pm10: number | null = null) =>
  skyLight({ altitude, rising, cloudCover, wet, pm10 })

describe('continuous sky light', () => {
  it('matches the clear day and night anchors', () => {
    for (const field of Object.keys(light(30)) as (keyof ReturnType<typeof light>)[])
      expect(deltaE(light(30)[field], SKY_THEMES.clearDay[field])).toBeLessThan(0.01)
    for (const field of Object.keys(light(-20)) as (keyof ReturnType<typeof light>)[])
      expect(deltaE(light(-20)[field], SKY_THEMES.night[field])).toBeLessThan(0.01)
  })

  it.each([0, 3])('preserves the heavy-dust palette tint at %s°', (altitude) => {
    const clear = light(altitude)
    const dusty = light(altitude, true, 0, 0, 300)
    const weight = 0.9 * Math.min(1, Math.max(0, (altitude + 6) / 10))
    // These fields bypass the text contrast guard.
    expect(dusty.ridgeFar).toBe(mixOklab(clear.ridgeFar, SKY_THEMES.dust.ridgeFar, weight))
    expect(dusty.horizon).toBe(mixOklab(clear.horizon, SKY_THEMES.dust.horizon, Math.min(0.9, weight * 1.3)))
  })

  it('keeps text contrast throughout weather and altitude combinations', () => {
    for (let altitude = -20; altitude <= 70; altitude += 0.5)
      for (const rising of [true, false]) for (const cloudCover of [0, 50, 100])
        for (const wet of [0, 0.5, 1]) for (const pm10 of [null, 80, 300]) {
          const value = light(altitude, rising, cloudCover, wet, pm10)
          expect(ratio(value.ink, value.top)).toBeGreaterThanOrEqual(4.5)
          expect(ratio(value.ink, value.mid)).toBeGreaterThanOrEqual(4.5)
          expect(ratio('#E8F9FF', value.mid)).toBeGreaterThanOrEqual(4.5)
        }
  })

  it('changes continuously between half-degree samples', () => {
    for (const rising of [true, false])
      for (let altitude = -20; altitude < 70; altitude += 0.5) {
          const a = light(altitude, rising)
          const b = light(altitude + 0.5, rising)
          for (const field of fields) expect(deltaE(a[field], b[field]),
            `${field} at ${altitude}, rising=${rising}`).toBeLessThan(0.03)
      }
  })
})
