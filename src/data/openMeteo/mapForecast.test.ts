import { describe, expect, it } from 'vitest'
import live from '../../test/fixtures/forecast-multi-2026-11-17.json'
import { DataError } from './guards'
import { mapForecast } from './mapForecast'
describe('mapForecast', () => {
  it('maps and blends a recorded multi-model response', () => {
    const f = mapForecast(live)
    expect(f.elevation).toBe(-175)
    expect(f.current.time).toBe('2026-11-17T04:30')
    expect(f.days).toHaveLength(8)
    expect(f.days[0]).toMatchObject({ date: '2026-11-16', confidence: 'medium',
      spread: { tempMax: 1.1, tempMin: 1.8, precipProb: 25 } })
    expect(f.days[1].tempMax).toBe(25.8)
    expect(f.days[1].sunrise).toBe('2026-11-17T06:08')
    expect(f.hours).toHaveLength(192)
  })
  it('rejects mismatched columns', () => {
    const broken = structuredClone(live) as { daily: { temperature_2m_max_icon_seamless: number[] } }
    broken.daily.temperature_2m_max_icon_seamless.pop()
    expect(() => mapForecast(broken)).toThrow(DataError)
  })

  it('does not label a near day as trend when model disagreement lowers confidence', () => {
    const disagreement = structuredClone(live)
    disagreement.daily.precipitation_probability_max_icon_seamless[1] = 80
    disagreement.daily.precipitation_probability_max_ecmwf_ifs025[1] = 40

    expect(mapForecast(disagreement).days[1]).toMatchObject({
      confidence: 'low',
      lowConfidence: false,
      spread: { precipProb: 40 },
    })
  })
})
