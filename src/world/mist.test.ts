import { describe, expect, it } from 'vitest'
import { blockingCloudCover, mistOf, nightMinimum, NO_MIST, type MistInput } from './mist'

const BASE: MistInput = {
  humidity: 55,
  humidityWeight: 1,
  visibilityKm: 30,
  visibilityWeight: 1,
  fogCodeWeight: 0,
  dustWeight: 0,
  rainRateMmH: 0,
  lowCloudPct: 0,
  blockingCloudPct: 0,
  windMs: 1,
  sunAltitude: 45,
  sunRising: true,
  temperature: 24,
  nightMinTemp: 16,
}

function mist({ midCloudPct = 0, ...over }: Partial<MistInput> & { midCloudPct?: number }) {
  const shown = { ...BASE, ...over }
  return mistOf({ ...shown, humidityWeight: Number(shown.humidity != null),
    blockingCloudPct: blockingCloudCover(shown.lowCloudPct, midCloudPct, 0) })
}

describe('mistOf: radiation fog, burn-off and diurnal asymmetry', () => {
  it('forms on a calm clear damp night and burns off as morning sun climbs and air warms', () => {
    const damp: Partial<MistInput> = { humidity: 95, windMs: 1, sunRising: true }
    const night = mist({ ...damp, sunAltitude: -12, temperature: 14, nightMinTemp: 14 })
    const morning = mist({ ...damp, sunAltitude: 8, temperature: 15.5, nightMinTemp: 14 })
    const midday = mist({ ...damp, sunAltitude: 25, temperature: 19, nightMinTemp: 14 })
    expect(night.radiation).toBeGreaterThan(0.6)
    expect(night.persistent).toBe(0)
    expect(midday.radiation).toBeLessThan(0.05)
    expect(morning.radiation).toBeGreaterThan(midday.radiation + 0.1)
    expect(morning.radiation).toBeLessThan(night.radiation - 0.1)
  })

  it('varies with morning sun and warming independently', () => {
    const base: Partial<MistInput> = { humidity: 96, windMs: 1, sunRising: true }
    // Sun varies at zero warming.
    const lowSun = mist({ ...base, sunAltitude: 0, temperature: 14, nightMinTemp: 14 }).radiation
    const midSun = mist({ ...base, sunAltitude: 14, temperature: 14, nightMinTemp: 14 }).radiation
    const highSun = mist({ ...base, sunAltitude: 28, temperature: 14, nightMinTemp: 14 }).radiation
    expect(lowSun).toBeGreaterThan(0.7)
    expect(midSun).toBeGreaterThan(0.1)
    expect(midSun).toBeLessThan(lowSun - 0.2)
    expect(highSun).toBe(0)
    // Warming varies at pre-sunrise sun.
    const cool = mist({ ...base, sunAltitude: -2, temperature: 14, nightMinTemp: 14 }).radiation
    const warming = mist({ ...base, sunAltitude: -2, temperature: 16.5, nightMinTemp: 14 }).radiation
    const warm = mist({ ...base, sunAltitude: -2, temperature: 19, nightMinTemp: 14 }).radiation
    expect(cool).toBeGreaterThan(0.7)
    expect(warming).toBeGreaterThan(0.1)
    expect(warming).toBeLessThan(cool - 0.2)
    expect(warm).toBe(0)
  })

  it('stays zero in the afternoon with the sun up and ramps in through civil twilight (0° to −6°)', () => {
    const damp: Partial<MistInput> = { humidity: 96, windMs: 1, sunRising: false, temperature: 14, nightMinTemp: 14 }
    expect(mist({ ...damp, sunAltitude: 15 }).radiation).toBe(0)
    expect(mist({ ...damp, sunAltitude: 1 }).radiation).toBe(0)
    expect(mist({ ...damp, sunAltitude: 0 }).radiation).toBe(0)
    const twilight = mist({ ...damp, sunAltitude: -3 }).radiation
    const dark = mist({ ...damp, sunAltitude: -6 }).radiation
    expect(twilight).toBeGreaterThan(0.25)
    expect(twilight).toBeLessThan(dark - 0.2)
    expect(dark).toBeGreaterThan(0.7)
  })

  it('disperses in wind and is suppressed by overcast low or mid cloud', () => {
    const calmNight: Partial<MistInput> = { humidity: 96, windMs: 1, sunAltitude: -12, sunRising: true, temperature: 13, nightMinTemp: 13 }
    expect(mist({ ...calmNight, windMs: 8 }).radiation).toBeLessThan(0.01)
    const clear = mist(calmNight).radiation
    const lowOvercast = mist({ ...calmNight, lowCloudPct: 95 }).radiation
    const midOvercast = mist({ ...calmNight, midCloudPct: 95 }).radiation
    expect(lowOvercast).toBeCloseTo(clear * 0.1, 4)
    expect(midOvercast).toBeCloseTo(clear * 0.1, 4)
    // Combined low+mid cover 1 - (1-0.65)(1-0.65) = 87.75 % suppresses like 88 %, much stronger than 65 %.
    const combined = mist({ ...calmNight, lowCloudPct: 65, midCloudPct: 65 }).radiation
    const single88 = mist({ ...calmNight, lowCloudPct: 88, midCloudPct: 0 }).radiation
    const single65 = mist({ ...calmNight, lowCloudPct: 65, midCloudPct: 0 }).radiation
    expect(combined).toBeCloseTo(single88, 2)
    expect(combined).toBeLessThan(single65 * 0.3)
    // ...but never more than the whole sky's cover: 65 % low + 65 % mid under a 65 % sky is a 65 % sky.
    expect(mist({ ...calmNight, lowCloudPct: 65, midCloudPct: 65, totalCloudPct: 65 }).radiation).toBeCloseTo(single65, 6)
    // Pure high cloud does not block radiation (low=0, mid=0).
    expect(mist({ ...calmNight, lowCloudPct: 0, midCloudPct: 0 }).radiation).toBe(clear)
  })
})

describe('mistOf: persistent fog, droplets, rain, marine and exclusions', () => {
  it('persists on damp low visibility, fog codes 45/48 without visibility, damp rain, or raw low marine stratus', () => {
    expect(mist({ visibilityKm: 2, humidity: 90 }).persistent).toBeGreaterThan(0.6)
    expect(mist({ visibilityKm: 2, humidity: null }).persistent).toBeGreaterThan(0.6)
    // Dry reported low visibility lacks water droplets.
    expect(mist({ visibilityKm: 1.5, humidity: 50 })).toEqual(NO_MIST)
    // Fog weather codes 45/48 count as data fog (~0.8) when visibility is absent.
    expect(mist({ fogCodeWeight: 1, visibilityWeight: 0, humidity: 92 }).persistent).toBeCloseTo(0.8, 4)
    expect(mist({ fogCodeWeight: 1, visibilityWeight: 0, humidity: null }).persistent).toBeCloseTo(0.8, 4)
    expect(mist({ fogCodeWeight: 1, visibilityWeight: 0, humidity: 50 }).persistent).toBe(0)
    // Rain needs damp surface air (no 0.45 floor in dry air).
    expect(mist({ rainRateMmH: 3, humidity: 90 }).persistent).toBeGreaterThan(0.8)
    expect(mist({ rainRateMmH: 3, humidity: 65 }).persistent).toBe(0)
    // Marine stratus uses raw low cloud.
    expect(mist({ lowCloudPct: 90, humidity: 95 }).persistent).toBeGreaterThan(0.5)
    expect(mist({ lowCloudPct: 1, midCloudPct: 95, humidity: 95 }).persistent).toBe(0)
  })

  it('gives zero mist on dry noon, in dust, or from humidity visibility alone', () => {
    expect(mist({ humidity: 55, visibilityKm: 30 })).toEqual(NO_MIST)
    expect(mist({ dustWeight: 1, visibilityKm: 1.5, humidity: 99, rainRateMmH: 4, lowCloudPct: 100, sunAltitude: -10 }))
      .toEqual(NO_MIST)
    expect(mist({ visibilityKm: 2, visibilityWeight: 0, humidity: 95 }).persistent).toBe(0)
  })
})

describe('nightMinimum continuity', () => {
  it('picks the 12 h minimum across midnight and stays continuous across the hh:00 -> hh:01 window edge for any temperature swing', () => {
    const hours = [
      { time: '2026-11-16T15:00', temperature: 8 },
      { time: '2026-11-16T18:00', temperature: 19 },
      { time: '2026-11-16T22:00', temperature: 16 },
      { time: '2026-11-17T03:00', temperature: 12.5 },
      { time: '2026-11-17T06:00', temperature: 13 },
      { time: '2026-11-17T07:00', temperature: 9 },
    ]
    expect(nightMinimum(hours, '2026-11-17T06:00')).toBe(12.5)
    expect(nightMinimum([], '2026-11-17T06:00')).toBeNull()
    expect(nightMinimum([{ time: '2026-11-16T12:00', temperature: 10 }], '2026-11-17T06:00')).toBeNull()
    // Extreme cold sample (-3 °C at 18:00, 16 °C every later hour) leaving the 12 h window at 06:00 -> 06:01 produces no step.
    const coldEdge = [
      { time: '2026-11-16T18:00', temperature: -3 },
      ...Array.from({ length: 12 }, (_, k) => {
        const h = (19 + k) % 24
        const day = 19 + k < 24 ? '2026-11-16' : '2026-11-17'
        return { time: `${day}T${String(h).padStart(2, '0')}:00`, temperature: 16 }
      }),
    ]
    const at00 = mist({ humidity: 96, sunAltitude: -5, temperature: 16, nightMinTemp: nightMinimum(coldEdge, '2026-11-17T06:00') })
    const at01 = mist({ humidity: 96, sunAltitude: -5, temperature: 16, nightMinTemp: nightMinimum(coldEdge, '2026-11-17T06:01') })
    expect(Math.abs(at00.radiation - at01.radiation)).toBeLessThan(0.05)
    // And no sudden rise while that (unphysically 19 °C) cold sample ages out (9–12 h): the minimum glides over 3 h, so even this
    // extreme case moves the mist < 0.07 a minute (bounded by the smoothstep slopes: 1.5/180 min x 19 °C x 1.5/4 °C).
    // Before, the whole swing came in one minute.
    let last: number | null = null
    for (let m = 2 * 60 + 30; m <= 6 * 60 + 30; m++) {
      const at = `2026-11-17T${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
      const r = mist({ humidity: 96, sunAltitude: -5, temperature: 16, nightMinTemp: nightMinimum(coldEdge, at) }).radiation
      if (last != null) expect(Math.abs(r - last)).toBeLessThan(0.07)
      last = r
    }
  })
})
