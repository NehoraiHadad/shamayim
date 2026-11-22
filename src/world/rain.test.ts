import { expect, it } from 'vitest'
import { cloudFieldAt } from './cloudField'
import { isHere } from './field/hereCell'
import { rainAreaShare, rainFrom } from './rain'
import type { Wind } from './types'
import type { AirInput } from '../atmo/airTypes'
import { fieldWeather } from '../atmo/fieldWeather'

it('ranks seeded shafts by cumulative cloud area and checks the eye against actual footprints', () => {
  const shown = { temperature: 17, humidity: 85, weatherCode: 95 } as AirInput
  const wind = { towardDeg: 90, ms: 0, across: 0 } as Wind
  const rate = 4
  const cloud = cloudFieldAt([], 'rain-test', 0)('2026-11-17T12:00', { low: 0.6, mid: 0, high: 0 }, shown, 30,
    { speedKmh: 0, fromDeg: 0 }, { level: 'low', rate })
  const physics = fieldWeather(shown.weatherCode, rate, shown.humidity)
  const rain = rainFrom(cloud, rate, wind, physics, 1, -0.002)!
  const candidates = cloud.snapshot.filter(s => s.layer?.lattice === 'tower' || s.layer?.lattice === 'low').flatMap(s => s.cells).filter(cell => cell.rainWeight > 0)
  const cellById = new Map(candidates.map(cell => [String(cell.id), cell]))
  let activeArea = 0
  const score = (cell: typeof candidates[number]) => cell.rainWeight * cell.tau0 * cell.r ** 2
  // The forecast's own shower at the place rains first; the lattice cells after it rank by area.
  const ranked = rain.cells.map(shaft => cellById.get(shaft.bank)!)
  expect(isHere(ranked[0])).toBe(true)
  for (let i = 2; i < ranked.length; i++) {
    if (ranked[i - 1].lattice === ranked[i].lattice) expect(score(ranked[i])).toBeLessThanOrEqual(score(ranked[i - 1]))
  }
  for (const shaft of rain.cells) {
    const cloud = cellById.get(shaft.bank)!
    expect(cloud.rainWeight).toBeGreaterThan(0)
    expect(shaft.share).toBeGreaterThan(0)
    expect(shaft.x).toBe(cloud.x)
    expect(shaft.y).toBe(cloud.y)
    expect(shaft.radiusKm).toBeCloseTo(0.6 * cloud.r)
    activeArea += cloud.r ** 2 * shaft.share
  }
  const totalArea = candidates.reduce((sum, cell) => sum + cell.r ** 2, 0)
  expect(activeArea / totalArea).toBeCloseTo(rainAreaShare(physics.steadyRain, rate), 6)
  expect(rain.near).toBe(false)
  expect(rain.cells.every(shaft => !shaft.atEye)).toBe(true)
})
