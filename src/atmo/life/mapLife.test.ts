import { describe, expect, it } from 'vitest'
import type { AirInput, AirState } from '../airTypes'
import { mapAir } from '../mapAir'
import { flockOffsets, planEvent } from './planEvent'
import { mapLife } from './mapLife'

const base: AirInput = {
  date: '2026-10-25', localHour: 12, humidity: 40,
  temperature: 22, feelsLike: 22, cloudCover: 0,
  windSpeed: 6, windGusts: 6, windDirection: 270,
  precipitation: 0, snowfall: 0, visibilityKm: 30,
  pm10: 20, dust: null, weatherCode: 0, sunElevation: 45, preview: false,
}
const state = (over: Partial<AirInput> = {}, change?: (air: AirState) => AirState) => {
  const input = { ...base, ...over }
  const air = mapAir(input)
  return mapLife(input, change ? change(air) : air)
}

describe('calm life mapping', () => {
  it('cycles cranes and uses the short first delay', () => {
    const life = state()
    expect(life.eligible).toEqual(['cranes'])
    expect(planEvent(life, life.seed, 0)!.delayMs).toBeGreaterThanOrEqual(5000)
    expect(planEvent(life, life.seed, 0)!.delayMs).toBeLessThanOrEqual(9000)
    expect(planEvent(life, life.seed, 1)!.delayMs).toBeGreaterThanOrEqual(60000)
    expect(planEvent(life, life.seed, 1)!.delayMs).toBeLessThanOrEqual(110000)
  })

  it('cycles multiple eligible kinds in table order', () => {
    const life = state({ date: '2026-09-05', temperature: 30, feelsLike: 30 })
    expect(life.eligible).toEqual(['storks', 'raptor'])
    expect([0, 1, 2].map((n) => planEvent(life, life.seed, n)!.kind)).toEqual(['storks', 'raptor', 'storks'])
  })

  it('uses corrected spring migration and swift dates', () => {
    expect(state({ date: '2026-03-15', sunElevation: 30 }).eligible).toEqual(['storks', 'cranes'])
    expect(state({ date: '2026-03-15', sunElevation: 12 }).eligible).toEqual(['cranes', 'swifts'])
    expect(state({ date: '2026-05-10', sunElevation: 10, localHour: 18.5 }).eligible).toEqual(['swifts'])
    expect(state({ date: '2026-05-10', sunElevation: 10, localHour: 18.5, windSpeed: 16 }).eligible).toEqual([])
  })

  it('allows one heat system, but not heat and rays together', () => {
    const hot = { date: '2026-07-20', temperature: 38, feelsLike: 38 }
    expect(state(hot).eligible).toEqual(['raptor'])
    expect(state(hot, (air) => ({ ...air, rays: { alpha: .1 } })).eligible).toEqual([])
  })

  it('suppresses ordinary winter days and all non-quiet states', () => {
    expect(state({ date: '2026-01-15' }).eligible).toEqual([])
    expect(state({ precipitation: 1, weatherCode: 61 }).eligible).toEqual([])
    expect(state({ dust: 200 }).eligible).toEqual([])
    expect(state({ windSpeed: 30 }).eligible).toEqual([])
    expect(state({ preview: true }).eligible).toEqual([])
  })

  it('shows meteors only on shower peaks in clear dark sky', () => {
    const night = { date: '2026-11-17', sunElevation: -18, cloudCover: 5 }
    expect(state(night).eligible).toEqual(['meteor'])
    expect(state({ ...night, cloudCover: 30 }).eligible).toEqual([])
    expect(state({ ...night, date: '2026-11-19' }).eligible).toEqual([])
  })

  it('follows the verified screen-direction convention, with a stable seeded fallback', () => {
    expect(state({ windSpeed: 10, windDirection: 270 }).dir).toBe(1)
    expect(state({ windSpeed: 10, windDirection: 90 }).dir).toBe(-1)
    const along = state({ windSpeed: 10, windDirection: 0 })
    expect(state({ windSpeed: 10, windDirection: 0 }).dir).toBe(along.dir)
  })

  it('maps static morning mist', () => {
    const damp = { humidity: 95, windSpeed: 3, windGusts: 3, sunElevation: 7, localHour: 6.5 }
    expect(state(damp).mist).toBeCloseTo(.875)
    expect(state({ ...damp, windSpeed: 10 }).mist).toBe(0)
    expect(state({ ...damp, sunElevation: 14 }).mist).toBe(0)
    expect(state({ ...damp, localHour: 17.5 }).mist).toBe(0)
    expect(state({ ...damp, humidity: null }).mist).toBe(0)
    expect(state({ ...damp, humidity: 86 }).mist).toBeCloseTo(.1, 1)
  })

  it('maps finite star scintillation from wind and cloud', () => {
    expect(state({ sunElevation: -18, windSpeed: 0, windGusts: 0 }).twinkle).toEqual({ amp: .25, period: 5.2 })
    const windy = state({ sunElevation: -18, windSpeed: 20, windGusts: 20 }).twinkle!
    expect(windy.amp).toBeCloseTo(.55)
    expect(windy.period).toBeCloseTo(2.8)
    expect(state({ sunElevation: -18, cloudCover: 80 }).twinkle).toBeNull()
  })

  it('builds a five/three crane V and separated loose storks', () => {
    const cranes = flockOffsets('cranes', 9, 12)
    expect(cranes.filter((p) => p.y > 0)).toHaveLength(5)
    expect(cranes.filter((p) => p.y < 0)).toHaveLength(3)
    const storks = flockOffsets('storks', 10, 12)
    expect(storks).toHaveLength(10)
    for (let i = 0; i < storks.length; i++) for (let j = i + 1; j < storks.length; j++) expect(Math.hypot(storks[i].x - storks[j].x, storks[i].y - storks[j].y)).toBeGreaterThanOrEqual(10)
  })

  it('plans deterministically and keeps counts in range', () => {
    const life = state({ date: '2026-09-05', temperature: 30 })
    expect(planEvent(life, life.seed, 2)).toEqual(planEvent(life, life.seed, 2))
    for (let n = 0; n < 8; n++) {
      const plan = planEvent(life, life.seed, n)!
      expect(plan.count).toBeGreaterThanOrEqual(plan.kind === 'storks' ? 6 : 1)
      expect(plan.count).toBeLessThanOrEqual(plan.kind === 'storks' ? 10 : 1)
    }
  })
})
