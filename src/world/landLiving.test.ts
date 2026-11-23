import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LandData } from '../data/land/types'
import { RAY_DISTANCES } from '../data/terrain/panorama'
import { SCENE_CAMERA } from '../domain/camera'
import {
  ALIAS, fullLandData, makeFar, makeNear, makeWorldInput as makeInput, SHADMOT, SHADMOT_TERRAIN as terrain, typedCover, WEATHER,
} from '../test/livingLandFixtures'
import { LIVING_LAND_DISTANCES_M, LIVING_LAND_RAYS, livingLandOf, type LivingLandSample } from './landLiving'
import { buildWorld, makeWorldBuilder } from './world'

const at = (data: LandData | null, shownDate = '2026-11-15', shownUtcDate = shownDate) =>
  livingLandOf({ lat: SHADMOT.lat, lon: SHADMOT.lon, elevationM: -175, shownDate, shownUtcDate, camera: SCENE_CAMERA, terrain, data })
const allSamples = (land: ReturnType<typeof at>): LivingLandSample[] =>
  [...land.local.map((p) => p.sample), ...land.rays.flatMap((r) => r.bands.map((b) => b.sample))]

afterEach(() => { vi.useRealTimers() })

describe('livingLandOf and WorldState.land integration', () => {
  it('samples panorama rays at RAY_DISTANCES (metres) and local ground with cover & composite provenance', () => {
    const res = at(fullLandData())
    expect(res.rays).toHaveLength(LIVING_LAND_RAYS)
    expect(res.local).toHaveLength(9)
    for (const dM of res.distancesM) expect(RAY_DISTANCES.some((km) => Math.abs(km * 1000 - dM) < 1e-6)).toBe(true)
    expect(res.distancesM).toEqual([...LIVING_LAND_DISTANCES_M])
    expect(res.own).toMatchObject({
      cover: 4, coverSource: 'worldcover-2021:local-50m',
      albedoSource: 's2:2026-11-15', albedoDate: '2026-11-15',
      ndviSource: 's2:2026-11-15', drynessSource: 'open-meteo:2026-11-15', snowSource: 's2:2026-11-15',
    })
    // Far band (20 km) uses MOD09A1 RGB [2026-11-01/2026-11-08] + rolling 8-day NDVI [2026-11-08/2026-11-15]
    const farBand = res.rays[20].bands.find((b) => b.distanceM === 20_000)!
    expect(farBand.sample).toMatchObject({
      albedoSource: 'gibs:2026-11-01+climatology', albedoDate: '2026-11-01/2026-11-08',
      ndviSource: 'gibs:2026-11-15+climatology', ndviDate: '2026-11-08/2026-11-15',
      snowSource: 'climatology',
    })
  })

  it('prefers recent far GIBS over stale or expired near S2 per channel', () => {
    // Stale Sep 9 near S2 vs fresh Nov GIBS viewed on Nov 20 -> both RGB & NDVI choose GIBS over stale near
    const staleNear = makeNear({ date: '2026-09-09', rgb: [40, 40, 40], ndvi: 0.12 })
    const freshFar = makeFar({ date: '2026-11-16', rgbDate: '2026-11-09', rgb: [160, 140, 100], ndvi: 0.48 })
    const nov20 = at({ cover: typedCover(4, 'worldcover-2021:regional-1km'), near: staleNear, far: freshFar, weather: null }, '2026-11-20')
    expect(nov20.own.coverSource).toBe('worldcover-2021:regional-1km')
    expect(nov20.own.albedoSource).toBe('gibs:2026-11-09+climatology')
    expect(nov20.own.albedoDate).toBe('2026-11-09/2026-11-16')
    expect(nov20.own.ndviSource).toBe('gibs:2026-11-16+climatology')
    expect(nov20.own.ndviDate).toBe('2026-11-09/2026-11-16')
    expect(nov20.own.ndvi).toBeGreaterThan(0.35)

    // Per-channel split: near RGB weight = 0 (120 d old) while near NDVI is fresh (5 d old) -> RGB picks GIBS, NDVI keeps S2
    const mixedNear = makeNear({ date: '2026-11-15', rgbDate: '2026-07-01', ndviDate: '2026-11-15', ndvi: 0.65 })
    const split = at({ cover: typedCover(4, 'worldcover-2021:local-50m'), near: mixedNear, far: freshFar, weather: null }, '2026-11-20')
    expect(split.own.albedoSource).toBe('gibs:2026-11-09+climatology')
    expect(split.own.ndviSource).toBe('s2:2026-11-15+climatology')
    expect(split.own.ndviDate).toBe('2026-11-15')
  })

  it('enforces local vs UTC date boundary and rejects future satellite observations', () => {
    // At 2026-11-17T00:30 Asia/Jerusalem (UTC+2), UTC date is 2026-11-16 -> an S2 pass on 2026-11-17 UTC is in the future!
    const data: LandData = {
      cover: typedCover(4, 'worldcover-2021:local-50m'),
      near: makeNear({ date: '2026-11-17' }), far: null,
      weather: { ...WEATHER, date: '2026-11-16', source: 'open-meteo:2026-11-16' },
    }
    const earlyLocal = buildWorld(makeInput(SHADMOT, '2026-11-17T00:30', data))
    expect(earlyLocal.land.date).toBe('2026-11-17')
    expect(earlyLocal.land.utcDate).toBe('2026-11-16')
    expect(earlyLocal.land.own.albedoSource).toBe('climatology')
    expect(earlyLocal.land.own.ndviSource).toBe('climatology')
    expect(earlyLocal.land.own.drynessSource).toBe('open-meteo:2026-11-16+climatology') // local weather eligible

    // Same local day at 06:00 local (04:00 UTC) -> utcDate is 2026-11-17 -> S2 pass is now eligible
    const morning = buildWorld(makeInput(SHADMOT, '2026-11-17T06:00', data))
    expect(morning.land.utcDate).toBe('2026-11-17')
    expect(morning.land.own.albedoSource).toBe('s2:2026-11-17')
  })

  it('falls back to climatology everywhere, flagged and undated, when no land data has arrived', () => {
    const res = at(null)
    for (const s of allSamples(res)) {
      expect(s).toMatchObject({
        cover: null, coverSource: 'unknown', albedoSource: 'climatology', albedoDate: null,
        ndviSource: 'climatology', ndviDate: null, drynessSource: 'climatology', drynessDate: null,
        snowSource: 'climatology', snowDate: null,
      })
      for (const c of s.albedo) { expect(c).toBeGreaterThanOrEqual(0); expect(c).toBeLessThanOrEqual(1) }
    }
  })

  it('age-blends across 0 d, 10 d, 45 d, 120 d and takes season strictly from shownDate (not clock)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-15T12:00:00Z'))
    const data: LandData = { cover: typedCover(4, 'worldcover-2021:local-50m'), near: makeNear({ date: '2026-11-15', snow: 0.8 }), far: null, weather: WEATHER }
    const d0 = at(data, '2026-11-15'), d10 = at(data, '2026-11-25'), d45 = at(data, '2026-12-30'), d120 = at(data, '2027-03-15')
    expect(d0.month).toBe(11); expect(d120.month).toBe(3)
    expect(d0.own.snow).toBeCloseTo(0.8, 3); expect(d0.own.snowSource).toBe('s2:2026-11-15')
    expect(d10.own.albedoSource).toBe('s2:2026-11-15+climatology')
    expect(d10.own.snow).toBeLessThan(0.25); expect(d10.own.snowSource).toBe('s2:2026-11-15+climatology')
    expect(d45.own.ndviSource).toBe('s2:2026-11-15+climatology'); expect(d45.own.snowSource).toBe('climatology')
    expect(d120.own).toMatchObject({ albedoSource: 'climatology', ndviSource: 'climatology', drynessSource: 'climatology', snowSource: 'climatology' })
    // Shown date BEFORE observation is strictly rejected as future (falls back to climatology)
    expect(at(data, '2026-11-05').own).toMatchObject({ albedoSource: 'climatology', ndviSource: 'climatology', snowSource: 'climatology' })
  })

  it('derives land strictly from data (never place name/id), is structured-cloneable and reuses on same-UTC-day scrub', () => {
    const data = fullLandData()
    const wA = buildWorld(makeInput(SHADMOT, '2026-11-17T12:00', data))
    const wB = buildWorld(makeInput(ALIAS, '2026-11-17T12:00', data))
    expect(wB.land).toEqual(wA.land); expect(wB.keys.land).toBe(wA.keys.land)
    expect(structuredClone(wA.land)).toEqual(wA.land)

    const build = makeWorldBuilder()
    const base = makeInput(SHADMOT, '2026-11-17T06:00', data)
    const h06 = build(base)
    const h12 = build({ ...base, selected: '2026-11-17T12:00' })
    const h22 = build({ ...base, selected: '2026-11-17T22:00' })
    expect(h12.land).toBe(h06.land); expect(h22.land).toBe(h06.land); expect(h22.keys.land).toBe(h06.keys.land)
    const nextDay = build({ ...base, selected: '2026-11-18T06:00' })
    expect(nextDay.land).not.toBe(h06.land); expect(nextDay.land.date).toBe('2026-11-18')
    const refined = build({ ...base, land: { ...data, far: makeFar({ date: '2026-11-16', rgbDate: '2026-11-09' }) } })
    expect(refined.land).not.toBe(nextDay.land); expect(refined.keys.land).not.toBe(h06.keys.land)
  })
})
