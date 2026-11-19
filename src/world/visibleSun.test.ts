import { describe, expect, it } from 'vitest'
import { anglePx } from '../../data/terrain/angleScale'
import { GENERIC_TERRAIN, type SceneTerrain } from '../../data/terrain/terrain'
import { addMinutes } from '../../domain/time'
import type { DayPoint, Forecast } from '../../domain/types'
import { nextSunEvent, twilight } from './sceneModel'
import { withVisibleSun } from './visibleSun'

const site = { lat: 32.348, lon: 35.535, timezone: 'Asia/Jerusalem' }
const day = { date: '2026-11-18', sunrise: '2026-11-18T06:12', sunset: '2026-11-18T16:35' } as DayPoint
const forecast = { days: [day] } as Forecast
// Eye level at y 96; a 4° wall in the east (the Gilead) and a 3° hill in the west.
const walls = (east: number, west: number): SceneTerrain => {
  const y = (deg: number) => 96 - anglePx(deg)
  const points: [number, number][] = [[0, y(west)], [120, y(west)], [150, 96], [230, 96], [260, y(east)], [375, y(east)]]
  return { ...GENERIC_TERRAIN, nearPoints: points, farPoints: points, horizonY: 96 }
}

describe('visible sunrise and sunset', () => {
  it('moves a local time by minutes on the same day', () => {
    expect(addMinutes('2026-11-18T06:12', 17.4)).toBe('2026-11-18T06:29')
    expect(addMinutes('2026-11-18T23:50', 30)).toBe('2026-11-18T23:59')
  })

  it('is later than the flat sunrise behind a mountain and earlier at sunset behind a hill', () => {
    const shown = withVisibleSun(forecast, walls(4, 3), site).days[0]
    expect(shown.visibleSunrise! > '2026-11-18T06:24').toBe(true)
    expect(shown.visibleSunrise! < '2026-11-18T06:40').toBe(true)
    expect(shown.visibleSunset! < '2026-11-18T16:30').toBe(true)
    // The flat times the sun's path is measured from stay as they were.
    expect(shown.sunrise).toBe(day.sunrise)
  })

  it('stays the flat time over a flat horizon, and is unknown before a panorama is', () => {
    const flat = withVisibleSun(forecast, walls(0, 0), site).days[0]
    expect(Math.abs(Number(flat.visibleSunrise!.slice(-2)) - 12)).toBeLessThanOrEqual(4)
    expect(withVisibleSun(forecast, GENERIC_TERRAIN, site)).toBe(forecast)
  })

  it('is what the twilight glow goes by, while the label keeps the calendar times', () => {
    const shown = withVisibleSun(forecast, walls(4, 3), site).days
    // Between the flat sunrise and the sun clearing the Gilead the coming event is the sunset, at its calendar time.
    expect(nextSunEvent(shown, '2026-11-18T06:20')).toEqual({ rise: false, time: day.sunset })
    expect(nextSunEvent(shown, '2026-11-18T05:00')).toEqual({ rise: true, time: day.sunrise })
    expect(nextSunEvent(shown, '2026-11-18T16:31')).toEqual({ rise: false, time: day.sunset })
    // The glow peaks as the sun really meets the ridge.
    expect(twilight(shown[0], shown[0].visibleSunrise!)!.opacity).toBeCloseTo(0.5)
  })
})
