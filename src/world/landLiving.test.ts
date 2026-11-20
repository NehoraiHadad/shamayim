import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LandData } from '../data/land/types'
import { RAY_DISTANCES } from '../data/terrain/panorama'
import { unknownLand } from '../data/terrain/terrain'
import { SCENE_CAMERA } from '../domain/camera'
import {
  ALIAS, fullLandData, makeFar, makeNear, makeWorldInput as makeInput, SHADMOT, SHADMOT_TERRAIN as terrain, WEATHER,
} from '../test/livingLandFixtures'
import { LIVING_LAND_DISTANCES_M, LIVING_LAND_RAYS, livingLandOf, type LivingLandSample } from './landLiving'
import { buildWorld, makeWorldBuilder } from './world'

const at = (data: LandData | null, shownDate = '2026-11-15', t = terrain) =>
  livingLandOf({ lat: SHADMOT.lat, lon: SHADMOT.lon, elevationM: -175, shownDate, camera: SCENE_CAMERA, terrain: t, data })
const allSamples = (land: ReturnType<typeof at>): LivingLandSample[] =>
  [...land.local.map((p) => p.sample), ...land.rays.flatMap((r) => r.bands.map((b) => b.sample))]

afterEach(() => { vi.useRealTimers() })

describe('livingLandOf and WorldState.land integration', () => {
  it('samples panorama rays at RAY_DISTANCES (metres) and local ground, carrying source, date & de-lighting status', () => {
    const res = at(fullLandData())
    expect(res.rays).toHaveLength(LIVING_LAND_RAYS)
    expect(res.local).toHaveLength(9)
    for (const dM of res.distancesM) expect(RAY_DISTANCES.some((km) => Math.abs(km * 1000 - dM) < 1e-6)).toBe(true)
    expect(res.distancesM).toEqual([...LIVING_LAND_DISTANCES_M])
    // Near S2 cell on same day (0 d): de-lit via Lambertian terrain normal, weather dryness, S2 snow
    expect(res.own).toMatchObject({
      cover: 4, albedoSource: 's2:2026-11-15', albedoDate: '2026-11-15', delit: 'lambert',
      ndviSource: 's2:2026-11-15', drynessSource: 'open-meteo:2026-11-15', snowSource: 's2:2026-11-15',
    })
    // Far band (20 km) uses GIBS RGB + NDVI with delit: 'none' and elevation-aware climatology snow
    const farBand = res.rays[20].bands.find((b) => b.distanceM === 20_000)!
    expect(farBand.sample).toMatchObject({ albedoSource: 'gibs:2026-11-15', ndviSource: 'gibs:2026-11-15', delit: 'none', snowSource: 'climatology' })
  })

  it('falls back to climatology everywhere, flagged and undated, when no land data has arrived', () => {
    const res = at(null)
    for (const s of allSamples(res)) {
      expect(s).toMatchObject({
        cover: null, albedoSource: 'climatology', albedoDate: null, delit: 'none',
        ndviSource: 'climatology', ndviDate: null, drynessSource: 'climatology', drynessDate: null,
        snowSource: 'climatology', snowDate: null,
      })
      for (const c of s.albedo) { expect(c).toBeGreaterThanOrEqual(0); expect(c).toBeLessThanOrEqual(1) }
      expect(s.dryness).toBeGreaterThanOrEqual(0); expect(s.dryness).toBeLessThanOrEqual(1)
      expect(s.snow).toBeGreaterThanOrEqual(0); expect(s.snow).toBeLessThanOrEqual(1)
    }
  })

  it('skips de-lighting and marks the source when sun geometry or terrain normal is missing', () => {
    const noSun: LandData = { cover: { coverAt: () => 3 }, near: makeNear({ sunEl: undefined, sunAz: undefined }), far: null, weather: null }
    const rNoSun = at(noSun)
    expect(rNoSun.own.delit).toBe('skipped-no-sun')
    expect(rNoSun.own.albedoSource).toBe('s2:2026-11-15:no-delight')

    const withSun: LandData = { cover: { coverAt: () => 3 }, near: makeNear({ sunEl: 38, sunAz: 165 }), far: null, weather: null }
    const rNoNormal = at(withSun, '2026-11-15', unknownLand('loading'))
    expect(rNoNormal.own.delit).toBe('skipped-no-normal')
    expect(rNoNormal.own.albedoSource).toBe('s2:2026-11-15:no-delight')
  })

  it('age-blends observations across 0 d, 10 d, 45 d, 120 d and takes season strictly from shownDate (not clock)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-15T12:00:00Z')) // opposite season on system clock
    const data: LandData = { cover: { coverAt: () => 4 }, near: makeNear({ date: '2026-11-15', sunEl: 38, sunAz: 165, snow: 0.8 }), far: null, weather: WEATHER }
    const d0 = at(data, '2026-11-15'), d10 = at(data, '2026-11-25'), d45 = at(data, '2026-12-30'), d120 = at(data, '2027-03-15')
    expect(d0.month).toBe(11); expect(d120.month).toBe(3)
    expect(d0.own.snow).toBeCloseTo(0.8, 3); expect(d0.own.snowSource).toBe('s2:2026-11-15')
    expect(d10.own.albedoSource).toBe('s2:2026-11-15+climatology')
    expect(d10.own.snow).toBeLessThan(0.25); expect(d10.own.snowSource).toBe('s2:2026-11-15+climatology')
    expect(d45.own.ndviSource).toBe('s2:2026-11-15+climatology'); expect(d45.own.snowSource).toBe('climatology'); expect(d45.own.drynessSource).toBe('climatology')
    expect(d120.own).toMatchObject({ albedoSource: 'climatology', ndviSource: 'climatology', drynessSource: 'climatology', snowSource: 'climatology', delit: 'none' })
    // A shown date before the observation uses |age|: 10 d earlier blends exactly like 10 d later.
    expect(at(data, '2026-11-05').own).toEqual(d10.own)
  })

  it('derives land strictly from data (never place name/id) and is structured-cloneable', () => {
    const data = fullLandData()
    const wA = buildWorld(makeInput(SHADMOT, '2026-11-17T12:00', data))
    const wB = buildWorld(makeInput(ALIAS, '2026-11-17T12:00', data))
    expect(wB.land).toEqual(wA.land)
    expect(wB.keys.land).toBe(wA.keys.land)
    // Structured-cloneable (no LandCover.coverAt closure leaks into WorldState.land)
    expect(structuredClone(wA.land)).toEqual(wA.land)
    // Changing the data changes the land and its key.
    const wC = buildWorld(makeInput(SHADMOT, '2026-11-17T12:00', { ...data, far: makeFar('2026-09-01') }))
    expect(wC.keys.land).not.toBe(wA.keys.land)
  })

  it('never rebuilds the land on an hour scrub or a clock tick; rebuilds when the shown date or data changes', () => {
    const data = fullLandData()
    const build = makeWorldBuilder()
    const base = makeInput(SHADMOT, '2026-11-17T06:00', data)
    const h06 = build(base)
    const h12 = build({ ...base, selected: '2026-11-17T12:00' })
    const h22 = build({ ...base, selected: '2026-11-17T22:00' })
    const tick = build({ ...makeInput(SHADMOT, '2026-11-17T07:00', data), selected: '2026-11-17T22:00' })
    expect(h12.land).toBe(h06.land)
    expect(h22.land).toBe(h06.land)
    expect(tick.land).toBe(h06.land)
    expect(h22.keys.land).toBe(h06.keys.land)
    // Crossing midnight to a new date rebuilds `world.land` for the new date
    const nextDay = build({ ...base, selected: '2026-11-18T02:00' })
    expect(nextDay.land).not.toBe(h06.land)
    expect(nextDay.land.date).toBe('2026-11-18')
    // New data (e.g. a refined far grid arriving) rebuilds on the same date
    const refined = build({ ...base, land: { ...data, far: makeFar('2026-11-16') } })
    expect(refined.land).not.toBe(nextDay.land)
    expect(refined.land.date).toBe('2026-11-17')
  })
})
