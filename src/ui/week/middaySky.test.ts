import { describe, expect, it } from 'vitest'
import type { HourPoint } from '../../domain/types'
import { ratio } from '../../theme/contrast'
import { SKY_THEMES } from '../../theme/skyThemes'
import { makeForecast } from '../../test/makeForecast'
import { middaySky } from './middaySky'

const sky = (hour: Partial<HourPoint>, opts: { max?: number; code?: number; pm10?: number } = {}) => {
  const f = makeForecast(
    [{ max: 20, min: 10 }, { max: opts.max ?? 26, min: 15, code: opts.code, hour: () => hour }],
    opts.pm10 === undefined ? undefined : () => opts.pm10!,
  )
  return middaySky(f.days[1], f)
}

describe('middaySky', () => {
  it('clear midday is the clear sky', () => {
    expect(sky({ cloudCover: 0 }).low).toBe(SKY_THEMES.clearDay.mid)
  })

  it('full cloud is the overcast sky, half cloud sits between', () => {
    expect(sky({ cloudCover: 100 }).low).toBe(SKY_THEMES.cloudy.mid)
    const half = sky({ cloudCover: 50 }).low
    expect(half).not.toBe(SKY_THEMES.clearDay.mid)
    expect(half).not.toBe(SKY_THEMES.cloudy.mid)
  })

  it('rain at midday is the rain sky', () => {
    expect(sky({ cloudCover: 100, precipitation: 1.2 }).low).toBe(SKY_THEMES.rain.mid)
    expect(sky({ cloudCover: 80, weatherCode: 61 }).low).toBe(SKY_THEMES.rain.mid)
  })

  it('dust pulls toward the dust sky; heavy dust nearly all the way', () => {
    const light = sky({ cloudCover: 0 }, { pm10: 120 }).low
    const heavy = sky({ cloudCover: 0 }, { pm10: 400 }).low
    expect(light).not.toBe(SKY_THEMES.clearDay.mid)
    expect(heavy).not.toBe(light)
    expect(sky({ cloudCover: 0 }, { pm10: 120 }).hazy).toBe(true)
    expect(sky({ cloudCover: 0 }).hazy).toBe(false)
  })

  it('heat and dust skies stay apart', () => {
    const heat = sky({ cloudCover: 0 }, { max: 40 })
    const dust = sky({ cloudCover: 0 }, { pm10: 400 })
    // Warmth = red minus blue: heat is clearly warmer than the greyed dust sky.
    const warmth = (hex: string) => parseInt(hex.slice(1, 3), 16) - parseInt(hex.slice(5, 7), 16)
    expect(warmth(heat.low) - warmth(dust.low)).toBeGreaterThan(60)
  })

  it('a hot clear day leans to the heat sky', () => {
    expect(sky({ cloudCover: 0 }, { max: 40 }).low).not.toBe(SKY_THEMES.clearDay.mid)
  })

  it('fog is a pale sky with dark ink', () => {
    const fog = sky({ cloudCover: 100, weatherCode: 45 })
    expect(fog.ink).not.toBe('#FFFFFF')
  })

  it('dry days draw the midday cloud; wet days keep their own kind', () => {
    expect(sky({ cloudCover: 10 }, { code: 3 }).kind).toBe('clear')
    expect(sky({ cloudCover: 50 }, { code: 3 }).kind).toBe('partly')
    expect(sky({ cloudCover: 90 }, { code: 0 }).kind).toBe('cloudy')
    expect(sky({ cloudCover: 10 }, { code: 61 }).kind).toBe('rain')
  })

  it('falls back to the daily code without hours', () => {
    const f = makeForecast([{ max: 20, min: 10 }, { max: 20, min: 10, code: 3 }])
    expect(middaySky(f.days[1], { hours: [], air: null }).low).toBe(SKY_THEMES.cloudy.mid)
  })

  // The icon drawn on the swatch is a graphic: WCAG 1.4.11 asks ≥ 3:1 against its sky.
  it('icon ink stays ≥ 3:1 on every sky', () => {
    for (const cloudCover of [0, 25, 50, 75, 100]) {
      for (const pm10 of [0, 150, 400]) {
        for (const extra of [{}, { precipitation: 2 }, { weatherCode: 45 }, { weatherCode: 71 }]) {
          for (const max of [26, 40]) {
            const s = sky({ cloudCover, ...extra }, { max, pm10 })
            expect(ratio(s.ink, s.low), JSON.stringify({ cloudCover, pm10, extra, max })).toBeGreaterThanOrEqual(3)
            expect(ratio(s.ink, s.top)).toBeGreaterThanOrEqual(3)
          }
        }
      }
    }
  })
})
