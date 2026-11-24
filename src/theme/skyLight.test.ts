import { describe, expect, it, vi } from 'vitest'
import { ratio } from './contrast'
import * as oklab from './oklab'
import { skyLight } from './skyLight'
import { SKY_THEMES } from './skyThemes'

const fields = ['top', 'mid', 'horizon'] as const
const light = (altitude: number, rising = true, cloudCover = 0, wet = 0, pm10: number | null = null) =>
  skyLight({ altitude, rising, cloudCover, wet, pm10 })

describe('continuous sky light', () => {
  it('matches the clear day and night anchors', () => {
    for (const field of Object.keys(light(30)) as (keyof ReturnType<typeof light>)[])
      expect(oklab.deltaE(light(30)[field], SKY_THEMES.clearDay[field])).toBeLessThan(0.01)
    for (const field of Object.keys(light(-20)) as (keyof ReturnType<typeof light>)[])
      expect(oklab.deltaE(light(-20)[field], SKY_THEMES.night[field])).toBeLessThan(0.01)
  })

  it.each([0, 3])('preserves the heavy-dust palette tint at %s°', (altitude) => {
    const clear = light(altitude)
    const mix = vi.spyOn(oklab, 'mixOklab')
    try {
      const dusty = light(altitude, true, 0, 0, 300)
      // Compare the unguarded fields to the actual dust mixes at the reviewed 0° and 3° checkpoints.
      const targets = altitude === 0 ? { ridgeFar: 0.54, horizon: 0.702 } : { ridgeFar: 0.81, horizon: 0.9 }
      for (const field of ['ridgeFar', 'horizon'] as const) {
        const i = mix.mock.calls.findIndex(([from, to]) => from === clear[field] && to === SKY_THEMES.dust[field])
        expect(i).toBeGreaterThanOrEqual(0)
        expect(mix.mock.calls[i][2]).toBeCloseTo(targets[field])
        expect(dusty[field]).toBe(mix.mock.results[i].value)
      }
    } finally {
      mix.mockRestore()
    }
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
          for (const field of fields) expect(oklab.deltaE(a[field], b[field]),
            `${field} at ${altitude}, rising=${rising}`).toBeLessThan(0.03)
      }
  })
})
