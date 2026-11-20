import { describe, expect, it } from 'vitest'
import { SCENE_CAMERA } from '../domain/camera'
import { AIRPORTS, pathPoint, runwayInUse } from './airports'
import { contrailAir, cruiseClimate, thresholds } from './contrails'
import { birdScores, dayOfYear, flyingWeather, lowPlanesOf, meteorsOf, season, type LifeInput } from './life'
import { birdsOf } from './lifeSchedule'
import { milkyWayStrength, planetsOf, skyLimit, type NightSkyInput } from './nightSky'
import { BOW, haloOf, onCircle, rainbowOf, separation, sunDogOffset, type OpticsInput } from './optics'
import type { PlaceEnv } from './placeEnv'

const ENV: PlaceEnv = { seaKm: null, lakeKm: null, built: 0.2, open: 0.6, glow: 0.3, sources: { land: 'cover', glow: 'far' } }

/** A fine, calm hour at a hill village in the Jordan valley's flyway, adjustable. */
function life(over: Partial<LifeInput> = {}): LifeInput {
  return {
    placeId: 'test', lat: 32.35, lon: 35.5, at: '2026-04-10T11:00', timezone: 'Asia/Jerusalem', camera: SCENE_CAMERA, groundM: 0,
    env: ENV, sun: { altitude: 55, azimuth: 160 }, direct: 0.9, dark: 0, temperature: 24, covers: { low: 0, mid: 0, high: 0 }, rainMmH: 0,
    thunder: false, wind: { fromDeg: 270, towardDeg: 90, ms: 3, gustMs: 5 }, starsThrough: 1,
    moon: { altitude: -20, illumination: 0 }, visibilityKm: 30, ...over,
  }
}

describe('birds by season, hour, region, weather and land (C10)', () => {
  it('reads season windows across the year (and across its turn)', () => {
    expect(dayOfYear('2026-01-01T00:00')).toBe(1)
    expect(season(dayOfYear('2026-04-01T00:00'), '03-05', '03-22', '04-15', '05-05')).toBe(1)
    expect(season(dayOfYear('2026-01-15T00:00'), '03-05', '03-22', '04-15', '05-05')).toBe(0)
    expect(season(dayOfYear('2026-01-10T00:00'), '11-01', '11-20', '02-15', '03-05')).toBe(1)
  })

  it('has storks on their spring and autumn passage, soaring at a sunny midday; none in winter or at dawn', () => {
    expect(birdScores(life()).stork).toBeGreaterThan(0.6)
    expect(birdScores(life({ at: '2026-09-05T11:00' })).stork).toBeGreaterThan(0.6)
    expect(birdScores(life({ at: '2026-01-10T11:00' })).stork).toBe(0)
    expect(birdScores(life({ sun: { altitude: 8, azimuth: 100 } })).stork).toBe(0)
  })

  it('has swifts from February to July only', () => {
    expect(birdScores(life({ at: '2026-05-20T18:00', sun: { altitude: 15, azimuth: 280 } })).swift).toBeGreaterThan(0.4)
    expect(birdScores(life({ at: '2026-11-20T16:00', sun: { altitude: 10, azimuth: 240 } })).swift).toBe(0)
  })

  it('has gulls only near the sea or a lake', () => {
    expect(birdScores(life()).gull).toBe(0)
    expect(birdScores(life({ env: { ...ENV, seaKm: 1 } })).gull).toBeGreaterThan(0.4)
    expect(birdScores(life({ env: { ...ENV, lakeKm: 1 } })).gull).toBeGreaterThan(0.3)
  })

  it('has raptors in thermals at a sunny midday over open land, not under a deck nor over a city', () => {
    expect(birdScores(life()).raptor).toBeGreaterThan(0.4)
    expect(birdScores(life({ direct: 0.1, covers: { low: 0.8, mid: 0, high: 0 } })).raptor).toBe(0)
    expect(birdScores(life({ env: { ...ENV, open: 0.02 } })).raptor).toBe(0)
  })

  it('has pigeons in built-up streets, not in open country', () => {
    expect(birdScores(life({ env: { ...ENV, built: 0.7 } })).pigeon).toBeGreaterThan(0.5)
    expect(birdScores(life({ env: { ...ENV, built: 0.02 } })).pigeon).toBe(0)
  })

  it('has bats only at dusk and dawn on a warm, dry, calm evening', () => {
    expect(birdScores(life({ at: '2026-06-20T20:10', sun: { altitude: -5, azimuth: 300 } })).bat).toBeGreaterThan(0.4)
    expect(birdScores(life({ at: '2026-06-20T12:00' })).bat).toBe(0)
    expect(birdScores(life({ at: '2026-06-20T23:30', sun: { altitude: -25, azimuth: 340 } })).bat).toBe(0)
  })

  it('has no birds in heavy rain, a storm or a gale', () => {
    expect(flyingWeather({ rainMmH: 4, thunder: false, wind: { fromDeg: 0, towardDeg: 180, ms: 3, gustMs: 5 } })).toBe(0)
    expect(birdsOf(life({ rainMmH: 4 }))).toEqual([])
    expect(birdsOf(life({ thunder: true }))).toEqual([])
    expect(birdsOf(life({ wind: { fromDeg: 270, towardDeg: 90, ms: 14, gustMs: 22 } }))).toEqual([])
  })

  it('sends migrants north in spring and south in autumn', () => {
    const north = birdsOf(life()).find((f) => f.kind === 'stork')
    if (north) expect(Math.cos((north.headingDeg * Math.PI) / 180)).toBeGreaterThan(0.8)
    const south = birdsOf(life({ at: '2026-09-05T11:00' })).find((f) => f.kind === 'stork')
    if (south) expect(Math.cos((south.headingDeg * Math.PI) / 180)).toBeLessThan(-0.8)
  })
})

describe('contrails by the Schmidt–Appleman criterion (C10)', () => {
  it('puts the threshold for saturated air at 250 hPa near −41 °C and for dry air near −51 °C (Schumann 1996)', () => {
    const wet = thresholds(25_000, 1).forHumidity - 273.15
    const dry = thresholds(25_000, 0).forHumidity - 273.15
    expect(wet).toBeGreaterThan(-43.5)
    expect(wet).toBeLessThan(-39.5)
    expect(dry).toBeGreaterThan(-54)
    expect(dry).toBeLessThan(-48)
    expect(dry).toBeLessThan(wet)
  })

  it('forms in cold air, not in warm; moister air forms at a higher temperature', () => {
    expect(contrailAir(-55, 30).forms).toBe(true)
    expect(contrailAir(-35, 90).forms).toBe(false)
    expect(contrailAir(-46, 90).forms).toBe(true)
    expect(contrailAir(-46, 10).forms).toBe(false)
  })

  it('persists only in air supersaturated over ice', () => {
    expect(contrailAir(-55, 80).persists).toBe(true)
    expect(contrailAir(-55, 30).persists).toBe(false)
  })

  it('guesses colder air aloft in winter than in summer', () => {
    expect(cruiseClimate(15, 0).temperature).toBeLessThan(cruiseClimate(196, 0).temperature - 10)
    expect(cruiseClimate(15, 0.8).humidity).toBeGreaterThan(cruiseClimate(15, 0).humidity)
  })
})

describe('airport traffic (C10)', () => {
  const lod = AIRPORTS.find((a) => a.icao === 'LLBG')!
  it('lands and takes off into the wind', () => {
    // A westerly: the runway heading most nearly west (26 or 30).
    const h = runwayInUse(lod, 270, 6)
    expect(Math.abs(((h - 270) % 360 + 540) % 360 - 180)).toBeLessThan(40)
    const e = runwayInUse(lod, 90, 6)
    expect(Math.abs(((e - 90) % 360 + 540) % 360 - 180)).toBeLessThan(40)
  })

  it('brings arrivals down a 3° glide path from the reciprocal side', () => {
    const p = pathPoint('arrive', 270, 10, false)
    expect(p.e).toBeGreaterThan(9)
    expect(p.up).toBeCloseTo(15 + 10_000 * Math.tan((3 * Math.PI) / 180), 0)
  })

  it('has traffic near Ben Gurion, none far from every airport, none at Haifa by night', () => {
    expect(lowPlanesOf(life({ lat: 32.07, lon: 34.79 })).some((p) => p.airport === 'LLBG')).toBe(true)
    expect(lowPlanesOf(life({ lat: 30.6, lon: 34.8 }))).toEqual([])
    expect(lowPlanesOf(life({ lat: 32.79, lon: 34.99, dark: 1 })).some((p) => p.airport === 'LLHA')).toBe(false)
  })
})

describe('meteors only on shower nights (C10)', () => {
  const night = (over: Partial<LifeInput>) => life({ sun: { altitude: -40, azimuth: 0 }, dark: 1, direct: 0, ...over })
  it('shows the Perseids after midnight and none on an ordinary night', () => {
    expect(meteorsOf(night({ at: '2026-08-13T02:00' }))?.shower).toBe('Perseids')
    expect(meteorsOf(night({ at: '2026-06-20T02:00' }))).toBeNull()
  })

  it('cuts the rate under a bright moon, in city glow and under cloud', () => {
    const dark = meteorsOf(night({ at: '2026-12-14T02:00' }))!.perHour
    expect(meteorsOf(night({ at: '2026-12-14T02:00', moon: { altitude: 50, illumination: 1 } }))!.perHour).toBeLessThan(dark * 0.5)
    expect(meteorsOf(night({ at: '2026-12-14T02:00', env: { ...ENV, glow: 8 } }))!.perHour).toBeLessThan(dark * 0.5)
    expect(meteorsOf(night({ at: '2026-12-14T02:00', starsThrough: 0 }))).toBeNull()
  })

  it('shows none by day or in twilight', () => {
    expect(meteorsOf(life({ at: '2026-08-12T12:00' }))).toBeNull()
  })
})

const sky = (over: Partial<NightSkyInput>): NightSkyInput => ({ at: '2026-12-14T02:00', timezone: 'Asia/Jerusalem', lat: 32.98, lon: 35.57,
  placeId: 'test', sun: { altitude: -40 }, moon: { altitude: -30, illumination: 0 }, starsThrough: 1, visibilityKm: 35, glow: 0.1, ...over })

describe('planets by their own brightness against the sky (C10)', () => {
  it('lets Venus show first in the dusk, then Jupiter, then Saturn and a far Mars', () => {
    const limit = (alt: number) => skyLimit(alt, { altitude: -10, illumination: 0 })
    expect(limit(-1)).toBeGreaterThan(-4.4)
    expect(limit(-1)).toBeLessThan(-2.7)
    expect(limit(-5)).toBeGreaterThan(-2.7)
    expect(limit(-5)).toBeLessThan(0.6)
    expect(limit(-9)).toBeGreaterThan(1.2)
    for (let a = 2; a > -18; a--) expect(limit(a - 1)).toBeGreaterThan(limit(a))
  })

  it('shows Jupiter and Mars at their true places on a dark December morning, not by day', () => {
    const names = planetsOf(sky({})).map((p) => p.name)
    expect(names).toContain('jupiter')
    expect(names).toContain('mars')
    expect(planetsOf(sky({ sun: { altitude: 30 } }))).toEqual([])
  })

  it('does not let city glow hide them, only cloud', () => {
    expect(planetsOf(sky({ glow: 20 })).length).toBe(planetsOf(sky({})).length)
    expect(planetsOf(sky({ starsThrough: 0 }))).toEqual([])
  })
})

describe('the Milky Way only in a truly dark sky (C10)', () => {
  it('shows at a dark site on a moonless clear night', () => {
    expect(milkyWayStrength(sky({}))).toBeGreaterThan(0.8)
  })

  it('hides in a city, under a moon, under cloud and in twilight', () => {
    expect(milkyWayStrength(sky({ glow: 3 }))).toBe(0)
    expect(milkyWayStrength(sky({ moon: { altitude: 30, illumination: 0.8 } }))).toBe(0)
    expect(milkyWayStrength(sky({ starsThrough: 0.5 }))).toBe(0)
    expect(milkyWayStrength(sky({ sun: { altitude: -10 } }))).toBe(0)
  })
})

const optics = (over: Partial<OpticsInput>): OpticsInput => ({ sun: { azimuth: 260, altitude: 20 }, direct: 0.8, sunLights: true,
  covers: { low: 0.3, mid: 0.1, high: 0 }, rain: { rateMmH: 1, cells: [{ fromAzimuth: 60, toAzimuth: 100, bank: 'b' }] }, coin: 0, ...over })

describe('rainbow geometry (C10)', () => {
  it('traces circles at their true angular radius round any centre', () => {
    for (const centre of [{ azimuth: 80, altitude: -20 }, { azimuth: 200, altitude: -5 }, { azimuth: 10, altitude: 30 }]) {
      for (const t of [-2.5, -1, 0, 0.7, 2]) expect(separation(onCircle(centre, 42, t), centre)).toBeCloseTo(42, 6)
    }
  })

  it('stands round the antisolar point: as far below the horizon as the sun is above it, opposite in azimuth', () => {
    const bow = rainbowOf(optics({}))!
    expect(bow.antisolar.azimuth).toBeCloseTo(80, 6)
    expect(bow.antisolar.altitude).toBeCloseTo(-20, 6)
    // Its top: 42° − the sun's altitude over the horizon.
    expect(onCircle(bow.antisolar, BOW.primary[1], 0).altitude).toBeCloseTo(BOW.primary[1] - 20, 6)
  })

  it('needs rain, a sun lower than 42° and the sun shining on it unblocked; the secondary fainter at 51°', () => {
    expect(rainbowOf(optics({ rain: null }))).toBeNull()
    expect(rainbowOf(optics({ sun: { azimuth: 200, altitude: 45 } }))).toBeNull()
    expect(rainbowOf(optics({ direct: 0.1 }))).toBeNull()
    expect(rainbowOf(optics({ sunLights: false }))).toBeNull()
    expect(rainbowOf(optics({ sun: { azimuth: 260, altitude: -2 } }))).toBeNull()
    const bow = rainbowOf(optics({ rain: { rateMmH: 3, cells: [{ fromAzimuth: 60, toAzimuth: 100, bank: 'b' }] } }))!
    expect(bow.secondary).toBeLessThan(bow.strength * 0.5)
    expect((BOW.secondary[0] + BOW.secondary[1]) / 2).toBeCloseTo(51.9, 0)
  })
})

describe('22° halo and sun dogs (C10)', () => {
  it('shows under thin high cloud over the sun, not under a thick deck nor in a clear sky', () => {
    expect(haloOf(optics({ covers: { low: 0, mid: 0, high: 0.7 }, rain: null }))?.strength).toBeGreaterThan(0.6)
    expect(haloOf(optics({ covers: { low: 0.8, mid: 0.2, high: 0.7 }, rain: null }))).toBeNull()
    expect(haloOf(optics({ covers: { low: 0, mid: 0, high: 0 }, rain: null }))).toBeNull()
  })

  it('places the sun dogs at 21.8° at the horizon, farther as the sun climbs, none above ~60°', () => {
    expect(sunDogOffset(0)).toBeCloseTo(21.8, 1)
    expect(sunDogOffset(30)!).toBeGreaterThan(27)
    expect(sunDogOffset(65)).toBeNull()
    expect(haloOf(optics({ sun: { azimuth: 180, altitude: 62 }, covers: { low: 0, mid: 0, high: 0.7 }, rain: null }))!.dogs).toBe(0)
  })
})
