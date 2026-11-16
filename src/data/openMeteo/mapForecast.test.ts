import { describe, expect, it } from 'vitest'
import live from '../../test/fixtures/forecast-2026-11-16.json'
import { DataError } from './guards'
import { mapForecast } from './mapForecast'

describe('mapForecast', () => {
  it('maps a recorded live ICON response', () => {
    const f = mapForecast(live)
    expect(f.elevation).toBe(-175)
    expect(f.current.time).toBe('2026-11-16T23:45')
    expect(f.days).toHaveLength(8) // yesterday + 7
    expect(f.days[1].date).toBe('2026-11-16')
    expect(f.days.filter((d) => d.lowConfidence).map((d) => d.date)).toEqual(['2026-11-21', '2026-11-22'])
    expect(f.hours.length).toBeGreaterThan(150)
  })

  it('rejects mismatched column lengths', () => {
    const broken = structuredClone(live) as { daily: { temperature_2m_max: number[] } }
    broken.daily.temperature_2m_max.pop()
    expect(() => mapForecast(broken)).toThrow(DataError)
  })

  it('rejects unexpected units', () => {
    const broken = structuredClone(live) as { current_units: Record<string, string> }
    broken.current_units.temperature_2m = '°F'
    expect(() => mapForecast(broken)).toThrow(/unit/)
  })
})
