import { describe, expect, it } from 'vitest'
import { moonCloud, moonLook } from '../../world/moonShape'
import { mapCurrent } from './mapCurrent'
import { thickCloud } from './mapHelpers'
import { forecastUrl } from './request'
import { SHADMOT_MEHOLA } from '../../config/place'

const current = (extra: Record<string, number> = {}) => ({
  current_units: { temperature_2m: '°C' },
  current: { time: '2026-11-18T20:00', temperature_2m: 18, apparent_temperature: 17, is_day: 0, weather_code: 2,
    cloud_cover: 80, wind_speed_10m: 5, wind_gusts_10m: 9, ...extra },
})

describe('cloud by layer', () => {
  it('asks Open-Meteo for the three layers, hourly and now', () => {
    const url = new URL(forecastUrl(SHADMOT_MEHOLA))
    for (const block of ['hourly', 'current']) {
      expect(url.searchParams.get(block)!.split(',')).toEqual(expect.arrayContaining(['cloud_cover_low', 'cloud_cover_mid', 'cloud_cover_high']))
    }
  })

  it('joins low and mid cloud as independent layers, and is unknown without both', () => {
    expect(thickCloud(50, 50)).toBe(75)
    expect(thickCloud(0, 0)).toBe(0)
    expect(thickCloud(100, 10)).toBe(100)
    expect(thickCloud(null, 40)).toBeNull()
  })

  it('reads the layers of "now" when they are there, and does without them (an older cached answer)', () => {
    expect(mapCurrent(current({ cloud_cover_low: 10, cloud_cover_mid: 20, cloud_cover_high: 70 }))).toMatchObject({ thickCloud: 28, cloudHigh: 70 })
    expect(mapCurrent(current())).toMatchObject({ thickCloud: null, cloudHigh: null })
  })

  it('lets the moon shine through thin high cloud, but not through low and mid cloud', () => {
    const night = { altitude: 40, fraction: 0.7, sunAltitude: -30, farFade: 0 }
    // 80 % cover, nearly all of it thin high cloud: the moon stays almost whole.
    const thin = moonLook({ ...night, cloudCover: moonCloud(80, 5) })!.opacity
    // The same 80 % as low cloud: mostly hidden.
    const thick = moonLook({ ...night, cloudCover: moonCloud(80, 80) })?.opacity ?? 0
    expect(thin).toBeGreaterThan(0.9)
    expect(thick).toBeLessThan(0.4)
    // Without the layers it goes by the whole cover, as before.
    expect(moonCloud(80)).toBe(80)
    expect(moonCloud(60, 90)).toBe(60)
  })
})
