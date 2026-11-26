import { describe, expect, it } from 'vitest'
import { airInput } from '../../atmo/airInput'
import { SHADMOT_MEHOLA } from '../../config/place'
import live from '../../test/fixtures/forecast-multi-2026-11-17.json'
import { DataError } from './guards'
import { mapForecast } from './mapForecast'
import { cloudAdjustment } from '../../domain/correction/cloud'

function lowCloudDisagreement(time: string, ifs = 0) {
  const series = (value: number) => live.hourly.time.map(() => value)
  return {
    ...live,
    utc_offset_seconds: 7200,
    current: { ...live.current, time, weather_code: 2, cloud_cover: 53,
      cloud_cover_low: 53, cloud_cover_mid: 0, cloud_cover_high: 0 },
    hourly: { ...live.hourly,
      cloud_cover_icon_seamless: series(53), cloud_cover_ecmwf_ifs025: series(ifs),
      cloud_cover_low_icon_seamless: series(53), cloud_cover_low_ecmwf_ifs025: series(ifs),
      cloud_cover_mid_icon_seamless: series(0), cloud_cover_mid_ecmwf_ifs025: series(0),
      cloud_cover_high_icon_seamless: series(0), cloud_cover_high_ecmwf_ifs025: series(0),
      precipitation_icon_seamless: series(0), precipitation_ecmwf_ifs025: series(0),
      weather_code_icon_seamless: series(2), weather_code_ecmwf_ifs025: series(0),
    },
  }
}

describe('mapForecast', () => {
  it('maps and blends a recorded multi-model response', () => {
    const f = mapForecast(live)
    expect(f.elevation).toBe(-175)
    expect(f.current.time).toBe('2026-11-17T04:30')
    expect(f.days).toHaveLength(8)
    expect(f.days[0]).toMatchObject({ date: '2026-11-16', confidence: 'medium',
      spread: { tempMax: 1.1, tempMin: 1.8, precipProb: 25 } })
    // Today: ICON 25.5, ECMWF 26.3 blended 0.8/0.2 (temperature weights) = 25.66, plus the national daily-max
    // correction for today (+0.65) = 26.3 (domain/correction/temperature).
    expect(f.days[1].tempMax).toBe(26.3)
    expect(f.days[1].sunrise).toBe('2026-11-17T06:08')
    expect(f.hours).toHaveLength(192)
  })
  it('rejects mismatched columns', () => {
    const broken = structuredClone(live) as { daily: { temperature_2m_max_icon_seamless: number[] } }
    broken.daily.temperature_2m_max_icon_seamless.pop()
    expect(() => mapForecast(broken)).toThrow(DataError)
  })

  it('blends the current ICON cloud reading with the hourly IFS values at the same time', () => {
    const raw = structuredClone(live)
    const hour = raw.hourly.time.indexOf('2026-11-17T04:00')
    raw.current.cloud_cover = 55
    raw.current.weather_code = 2
    raw.hourly.cloud_cover_ecmwf_ifs025[hour] = 0
    raw.hourly.cloud_cover_ecmwf_ifs025[hour + 1] = 20
    raw.hourly.cloud_cover_icon_seamless[hour + 1] = 46
    raw.hourly.weather_code_icon_seamless[hour + 1] = 2
    const forecast = mapForecast(raw)
    expect(forecast.current).toMatchObject({ cloudCover: 28, weatherCode: 1 })
    const next = forecast.hours.find((point) => point.time === '2026-11-17T05:00')
    expect(next).toMatchObject({ weatherCode: 2 })
    expect(next?.cloudCover).toBeCloseTo(30.4)
  })

  it('keeps fog and rain codes and falls back to ICON when IFS has no cloud reading', () => {
    const raw = {
      ...structuredClone(live),
      current: { ...live.current, cloud_cover: 53, weather_code: 45 },
    }
    const hour = raw.hourly.time.indexOf('2026-11-17T05:00')
    raw.hourly.cloud_cover_icon_seamless[hour] = 10
    raw.hourly.weather_code_icon_seamless[hour] = 61
    const forecast = mapForecast({ ...raw, hourly: {
      ...raw.hourly, cloud_cover_ecmwf_ifs025: raw.hourly.time.map(() => null),
    } })
    expect(forecast.current).toMatchObject({ cloudCover: 53, weatherCode: 45 })
    expect(forecast.hours.find((point) => point.time === '2026-11-17T05:00'))
      .toMatchObject({ cloudCover: 10, weatherCode: 61 })
  })

  it('takes ICON\'s isolated low cloud over a clear IFS sky out at every lead (Shadmot Mehola, 24 Nov)', () => {
    const today = '2026-11-17'
    const forecast = mapForecast(lowCloudDisagreement(`${today}T17:00`))
    expect(forecast.current.cloudCover).toBe(0)
    for (const time of [`${today}T18:00`, `${today}T21:00`, '2026-11-18T00:00', '2026-11-18T17:00', '2026-11-19T00:00']) {
      const row = forecast.hours.find((r) => r.time === time)!
      expect(row.cloudCover).toBe(0)
      expect(row.cloudLow).toBe(0)
      expect(row.weatherCode).toBe(0)
    }
    // Outside the calibration region the ordinary blend stands.
    const uncalibrated = mapForecast(lowCloudDisagreement(`${today}T17:00`), { calibrateClouds: false })
    expect(uncalibrated.current.cloudCover).toBe(53)
    expect(uncalibrated.hours.find((row) => row.time === `${today}T17:00`)?.cloudCover).toBeCloseTo(31.8)
  })

  it('matches the exported Python fit (19.7643 % at half strength for the 53 % / clear case at 15:00 UTC)', () => {
    const p = (icon: number, ecmwf: number) => ({ icon, ecmwf })
    const adjustment = cloudAdjustment({ cover: p(53, 0), low: p(53, 0), mid: p(0, 0), high: p(0, 0), rain: p(0, 0) }, 17, 7200, 0.5)!
    expect(21.2 + adjustment.cover).toBeCloseTo(19.7643, 4)
  })

  it('uses the ground-trained cover and low layer for current and near hours, then fades into the base blend', () => {
    const today = '2026-11-17'
    // IFS cloudy too: not isolated low cloud, so only the ground-trained fit moves the blend (0.4 × 53 + 0.6 × 20).
    const base = 33.2
    const forecast = mapForecast(lowCloudDisagreement(`${today}T17:00`, 20))
    const at = (time: string) => forecast.hours.find((row) => row.time === time)!
    const near = at(`${today}T18:00`)
    const taper = at(`${today}T21:00`)
    expect(Math.abs(near.cloudCover - base)).toBeGreaterThan(1)
    expect(near.cloudLow).toBeLessThanOrEqual(near.cloudCover)
    expect(near.thickCloud).toBe(Math.round(near.cloudLow!))
    expect(Math.abs(taper.cloudCover - base)).toBeLessThan(Math.abs(near.cloudCover - base))
    for (const time of [`${today}T23:00`, '2026-11-18T00:00', '2026-11-19T00:00']) {
      expect(at(time).cloudCover).toBeCloseTo(base)
      expect(at(time).cloudLow).toBeCloseTo(base)
    }
  })

  it('uses the ordinary blend with incomplete layers and outside the calibration region', () => {
    const time = '2026-11-17T17:00'
    const raw = lowCloudDisagreement(time, 20)
    const incomplete = mapForecast({ ...raw, hourly: {
      ...raw.hourly, cloud_cover_mid_ecmwf_ifs025: raw.hourly.time.map(() => null),
    } })
    expect(incomplete.current.cloudCover).toBeCloseTo(33.2)
    expect(incomplete.hours.find((row) => row.time === time)?.cloudCover).toBeCloseTo(33.2)
    const uncalibrated = mapForecast(raw, { calibrateClouds: false })
    expect(uncalibrated.current.cloudCover).toBe(53)
    expect(uncalibrated.hours.find((row) => row.time === time)?.cloudCover).toBeCloseTo(0.6 * 53 + 0.4 * 20)
  })

  it('keeps the next local date on the base blend even close to midnight', () => {
    const forecast = mapForecast(lowCloudDisagreement('2026-11-17T23:30', 20))
    const before = forecast.hours.find((row) => row.time === '2026-11-17T23:00')!
    const after = forecast.hours.find((row) => row.time === '2026-11-18T00:00')!
    expect(Math.abs(before.cloudCover - 33.2)).toBeGreaterThan(0.5)
    expect(after.cloudCover).toBeCloseTo(33.2)
    expect(forecast.current.cloudCover).toBeCloseTo((before.cloudCover + after.cloudCover) / 2)
  })

  it('draws recent clear satellite conditions during a short scrub and hands back to the calibrated forecast', () => {
    const now = '2026-11-17T17:00'
    const data = mapForecast(lowCloudDisagreement(now))
    const forecast = { ...data, placeId: SHADMOT_MEHOLA.id, air: null, normals: null,
      source: 'test', models: ['icon_seamless', 'ecmwf_ifs025'], fetchedAt: Date.parse('2026-11-17T15:00:00Z') }
    const observedCloud = { at: '2026-11-17T16:30', cover: 0, before: [0, 0], daylight: 1, calibratedPersistence: true }
    const draw = (at: string) => airInput(forecast, now, SHADMOT_MEHOLA, at, null, { observedCloud })
    for (const time of ['17:00', '17:15', '17:30']) {
      const sky = draw(`2026-11-17T${time}`)
      expect(sky.cloudCover).toBeLessThan(3)
      expect(sky.covers.low).toBeLessThan(0.03)
    }
    const later = '2026-11-17T19:00'
    expect(draw(later).cloudCover).toBeCloseTo(data.hours.find((row) => row.time === later)!.cloudCover)
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
