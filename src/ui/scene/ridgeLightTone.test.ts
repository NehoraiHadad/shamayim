import { describe, expect, it } from 'vitest'
import { hexToOklab, mixOklab, oklabToHex } from '../../theme/oklab'
import { skyLight } from '../../theme/skyLight'
import { SKY_THEMES } from '../../theme/skyThemes'
import { ridgeLightTone } from './ridgeLightTone'

const clear = { altitude: 3, azimuth: 114, day: 1, noonWeight: 0, glow: 0, cover: 0, wet: false,
  farFade: 0, nearFade: 0, layer: 'near' as const, palette: SKY_THEMES.dawn }
const lightness = (hex: string) => hexToOklab(hex).l

function composite(base: string, tint: string, alpha: number) {
  const channels = [1, 3, 5].map((offset) => {
    const a = parseInt(base.slice(offset, offset + 2), 16)
    const b = parseInt(tint.slice(offset, offset + 2), 16)
    return Math.round(a + (b - a) * alpha).toString(16).padStart(2, '0')
  })
  return '#' + channels.join('')
}

describe('ridge tones', () => {
  it('keeps full strength through 50% cover and fades to a null at 90%', () => {
    const lit = ridgeLightTone(clear)!
    expect(ridgeLightTone({ ...clear, cover: 50 })).toEqual(lit)
    expect(lightness(ridgeLightTone({ ...clear, cover: 75 })!.fill!)).toBeLessThan(lightness(lit.fill!))
    for (const cover of [90, 95, 100]) expect(ridgeLightTone({ ...clear, cover })).toBeNull()
  })

  it('attenuates wet and hazy daylight and fades heavy haze smoothly', () => {
    const delta = (wet: boolean, nearFade: number) => {
      const base = mixOklab(clear.palette.ridgeNear, mixOklab(clear.palette.mid, clear.palette.horizon, .45), nearFade * .9)
      return lightness(ridgeLightTone({ ...clear, wet, nearFade, farFade: nearFade * 1.4 })!.fill!) - lightness(base)
    }
    expect(delta(true, 0)).toBeLessThan(delta(false, 0))
    expect(delta(true, .35)).toBeLessThan(delta(true, 0))
    // Heavy haze fades the light with the direct sun that gets through (`day`), never by a switch at one fade.
    const far = (farFade: number, day = 1) => ridgeLightTone({ ...clear, layer: 'far', farFade, day })?.fill
    expect(far(.51)).toBeTruthy()
    expect(lightness(far(.51)!)).toBeCloseTo(lightness(far(.49)!), 2)
    expect(ridgeLightTone({ ...clear, layer: 'far', farFade: .8, day: 0 })).toBeNull()
  })

  it('allows a weather-attenuated twilight rim and suppresses it at night or midday', () => {
    const twilight = { ...clear, day: 0, altitude: -3, glow: .4 }
    const result = ridgeLightTone(twilight)!
    expect(result.fill).toBeNull()
    expect(result.rimAlpha).toBeCloseTo(.18)
    expect(ridgeLightTone({ ...twilight, wet: true })!.rimAlpha).toBeLessThan(result.rimAlpha)
    expect(ridgeLightTone({ ...twilight, glow: 0 })).toBeNull()
    const noon = ridgeLightTone({ ...clear, altitude: 38, azimuth: 180, noonWeight: 1 })!
    expect(noon.rimAlpha).toBe(0)
    expect(lightness(noon.fill!) - lightness(clear.palette.ridgeNear)).toBeLessThan(.03)
  })

  it('uses the available low-sun budget in clear dawn and dusk palettes', () => {
    for (const rising of [true, false]) {
      const palette = skyLight({ altitude: 3, rising, cloudCover: 0, wet: 0, pm10: 0 })
      for (const layer of ['near', 'far'] as const) {
        const base = layer === 'near' ? palette.ridgeNear : palette.ridgeFar
        const tone = ridgeLightTone({ ...clear, palette, layer })!
        expect(lightness(tone.fill!) - lightness(base)).toBeGreaterThan(layer === 'near' ? .07 : .085)
      }
    }
  })

  it('respects the painted caps across palettes and preserves near/far order', () => {
    for (const palette of Object.values(SKY_THEMES)) {
      for (const fade of [0, .15, .45]) {
        const mid = hexToOklab(palette.mid)
        const horizon = hexToOklab(palette.horizon)
        const haze = { l: mid.l + (horizon.l - mid.l) * .45,
          a: mid.a + (horizon.a - mid.a) * .45, b: mid.b + (horizon.b - mid.b) * .45 }
        for (const layer of ['near', 'far'] as const) {
          const far = layer === 'far'
          const ridge = hexToOklab(far ? palette.ridgeFar : palette.ridgeNear)
          const t = Number((far ? fade : fade / 2).toFixed(2)) * .9
          const baseLab = { l: ridge.l + (haze.l - ridge.l) * t,
            a: ridge.a + (haze.a - ridge.a) * t, b: ridge.b + (haze.b - ridge.b) * t }
          const base = oklabToHex(baseLab)
          const farL = lightness(palette.ridgeFar)
          const farBaseL = farL + (haze.l - farL) * fade * .9
          const tone = ridgeLightTone({ ...clear, palette, layer, farFade: fade, nearFade: fade / 2 })
          if (!tone) continue
          const fill = tone.fill ?? base
          expect(tone.rimAlpha).toBeLessThanOrEqual(.45)
          for (const painted of [fill, composite(base, tone.rim, tone.rimAlpha), composite(fill, tone.rim, tone.rimAlpha)]) {
            expect(lightness(painted) - lightness(base)).toBeLessThanOrEqual(far ? .10 : .08)
            if (painted !== base) expect(lightness(painted)).toBeLessThanOrEqual(far
              ? horizon.l - .06 : farBaseL)
          }
        }
      }
    }
  })
})
