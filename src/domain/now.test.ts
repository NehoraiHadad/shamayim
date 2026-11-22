import { describe, expect, it } from 'vitest'
import { rollForward } from './now'
import type { Forecast, HourPoint } from './types'

const hour = (time: string, over: Partial<HourPoint> = {}): HourPoint => ({
  time, temperature: 24, precipProb: 0, precipitation: 0, weatherCode: 0, cloudCover: 10,
  thickCloud: 5, cloudLow: 0, cloudMid: 5, cloudHigh: 5, windSpeed: 12, windGusts: 20,
  windDirection: 290, humidity: 42, visibility: 30000, snowDepth: 0, ...over,
})

const makeForecast = (hours: HourPoint[]): Forecast => ({
  placeId: 'shadmot-mehola',
  elevation: -175,
  current: {
    time: '2026-11-17T05:15', temperature: 14, feelsLike: 14, isDay: false, weatherCode: 45,
    cloudCover: 90, thickCloud: 90, cloudLow: 85, cloudMid: 20, windSpeed: 3, windGusts: 6,
    windDirection: 110, precipitation: 0, snowfall: 0, visibility: 1200, humidity: 98,
  },
  hours,
  days: [{
    date: '2026-11-17', weatherCode: 0, tempMax: 26, tempMin: 14, precipProbMax: 0, precipSum: 0,
    windGustsMax: 20, sunrise: '2026-11-17T06:08', sunset: '2026-11-17T16:36',
    lowConfidence: false, confidence: 'high', spread: { tempMax: 0, tempMin: 0, precipProb: 0 },
  }],
  air: null, nowcast: null, normals: null, fetchedAt: 0, source: 'test', models: [],
})

describe('rollForward', () => {
  it('replaces stale dawn humidity, visibility, windDirection and cloud layers from the present hour', () => {
    const base = makeForecast([hour('2026-11-17T12:00')])
    const rolled = rollForward(base, '2026-11-17T12:25')
    expect(rolled.current).toMatchObject({
      time: '2026-11-17T12:25', isDay: true, temperature: 24, weatherCode: 0,
      humidity: 42, visibility: 30000, windDirection: 290, cloudLow: 0, cloudMid: 5, thickCloud: 5,
    })
  })

  it('keeps snapshot humidity, visibility and windDirection when the hourly row lacks them', () => {
    const base = makeForecast([hour('2026-11-17T12:00', { humidity: null, visibility: null, windDirection: null, cloudLow: null, cloudMid: null, thickCloud: null })])
    const rolled = rollForward(base, '2026-11-17T12:25')
    expect(rolled.current.humidity).toBe(98)
    expect(rolled.current.visibility).toBe(1200)
    expect(rolled.current.windDirection).toBe(110)
    expect(rolled.current.cloudLow).toBe(85)
    expect(rolled.current.cloudMid).toBe(20)
  })

  it('returns the forecast unchanged when current is already in the present hour', () => {
    const base = makeForecast([hour('2026-11-17T05:00')])
    expect(rollForward(base, '2026-11-17T05:40')).toBe(base)
  })
})
