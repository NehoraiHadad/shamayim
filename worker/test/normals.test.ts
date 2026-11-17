import { describe, expect, it } from 'vitest'
import { normalsQuery, reduceNormals } from '../src/normals'

function archive() {
  const time = Array.from({ length: 366 }, (_, i) => new Date(Date.UTC(2000, 0, i + 1)).toISOString().slice(0, 10))
  return { elevation: -249, daily: {
    time, temperature_2m_max: time.map((): number | null => 0),
    temperature_2m_min: time.map((): number | null => 10), wind_gusts_10m_max: time.map(() => 40),
  } }
}

describe('climate reduction', () => {
  it('uses fixed archive dates and preserves precise client coordinates', () => {
    const q = new URLSearchParams(normalsQuery('latitude=31.1234&longitude=35.5678'))
    expect(Object.fromEntries(q)).toEqual({ latitude: '31.1234', longitude: '35.5678',
      start_date: '1991-01-01', end_date: '2020-12-31', timezone: 'auto', wind_speed_unit: 'kmh',
      daily: 'temperature_2m_max,temperature_2m_min,wind_gusts_10m_max' })
  })

  it('keeps 366 leap-calendar slots, including February 29', () => {
    const raw = archive()
    raw.daily.temperature_2m_max[59] = 15
    const table = JSON.parse(reduceNormals(JSON.stringify(raw)))
    expect(table.period).toEqual([1991, 2020])
    expect(table.windowDays).toBe(15)
    expect(table.elevation).toBe(-249)
    for (const key of ['tempMax', 'tempMaxSd', 'tempMin', 'gustMax', 'gustMaxSd']) expect(table[key]).toHaveLength(366)
    expect(table.tempMax[59]).toBe(1)
    expect(table.tempMax[66]).toBe(1)
    expect(table.tempMax[67]).toBe(0)
  })

  it('wraps January 1 through December 25, calculates population sd and skips nulls per column', () => {
    const raw = archive()
    raw.daily.temperature_2m_max[359] = 30
    raw.daily.temperature_2m_max[1] = null
    raw.daily.temperature_2m_min[1] = null
    const table = JSON.parse(reduceNormals(JSON.stringify(raw)))
    expect(table.tempMax[0]).toBe(2.1)
    expect(table.tempMaxSd[0]).toBe(7.7)
    expect(table.tempMin[0]).toBe(10)
    expect(table.gustMax[0]).toBe(40)
    expect(table.gustMaxSd[0]).toBe(0)
  })

  it('maps March 1 of non-leap years to slot 60 and weights every sample', () => {
    const raw = archive()
    raw.daily.time.push('2001-03-01')
    raw.daily.temperature_2m_max.push(32)
    raw.daily.temperature_2m_min.push(10)
    raw.daily.wind_gusts_10m_max.push(40)
    const table = JSON.parse(reduceNormals(JSON.stringify(raw)))
    expect(table.tempMax[67]).toBe(2)
    expect(table.tempMax[68]).toBe(0)
  })

  it('refuses malformed or empty climate data', () => {
    expect(() => reduceNormals('{}')).toThrow()
    const raw = archive()
    raw.daily.temperature_2m_max.fill(null)
    expect(() => reduceNormals(JSON.stringify(raw))).toThrow()
  })
})
