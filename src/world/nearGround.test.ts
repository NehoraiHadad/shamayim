import { describe, expect, it } from 'vitest'
import { LAND_STEP } from '../data/land/grid'
import type { LandCover } from '../data/land/landData'
import { azimuthAt, SCENE_CAMERA } from '../domain/camera'
import { SHADMOT, SHADMOT_TERRAIN, typedCover } from '../test/livingLandFixtures'
import { LIVING_LAND_RAYS, livingLandOf, nearGroundAt } from './landLiving'
import { M_PER_DEG } from './landRays'
import type { LivingLandSample } from './landSample'
import { FIRST_RING_M, nearGroundOf, type NearGround } from './nearGround'

const RAD = Math.PI / 180
const CELL_M = LAND_STEP * M_PER_DEG
/** Equator, mid-latitude, and where the grid's columns are narrower than half a cell. */
const LATS = [0, 32.35, 62]
const ground = (lat: number, read: (eastM: number, northM: number) => number) =>
  nearGroundOf(lat, 35.0123, Math.cos(lat * RAD), (e, n) => ({ cover: read(e, n) }) as unknown as LivingLandSample)
const areaOf = (lat: number, near: NearGround, azimuth: number) => {
  const cosLat = Math.cos(lat * RAD)
  return near(azimuth).reduce((sum, { weight }) => sum + weight, 0) * CELL_M * CELL_M * cosLat * Math.max(1, Math.round(1 / cosLat))
}
/** The share of the footprint whose cells read 1. */
const shareOf = (near: NearGround, azimuth: number) => {
  const shares = near(azimuth), total = shares.reduce((sum, { weight }) => sum + weight, 0)
  return shares.reduce((sum, { sample, weight }) => sum + Number(sample.cover) * weight, 0) / total
}

describe('nearGroundOf', () => {
  it.each(LATS)('weighs the area of the circle from the eye to the first DEM ring at latitude %d', (lat) => {
    const near = ground(lat, () => 1), circle = Math.PI * (FIRST_RING_M / 2) ** 2
    for (let azimuth = 0; azimuth < 360; azimuth += 15) expect(areaOf(lat, near, azimuth) / circle).toBeCloseTo(1, 1)
  })

  it('reads each cell once, and none before a bearing asks', () => {
    const read: string[] = []
    const near = ground(32.35, (e, n) => read.push(`${e.toFixed(1)}:${n.toFixed(1)}`))
    expect(read).toHaveLength(0)
    const rays = Array.from({ length: LIVING_LAND_RAYS }, (_, i) => azimuthAt(i / (LIVING_LAND_RAYS - 1)))
    for (let pass = 0; pass < 2; pass++) rays.forEach((azimuth) => near(azimuth))
    expect(new Set(read).size).toBe(read.length)
  })

  it('turns no sharper between bearings than two circles that share the eye', () => {
    // Circles of radius R about centres 2R sin(d/2) apart differ by at most that shift over their width, 4 sin(d/2) / pi of
    // the area; one cell column of the rim is the grid's own error. The sharpest cover: town and wood either side of a line.
    for (const edge of [0, 45, 90, 130]) {
      const near = ground(32.35, (e, n) => e * Math.cos(edge * RAD) - n * Math.sin(edge * RAD) > 0 ? 1 : 0)
      const gridError = CELL_M * CELL_M / (Math.PI * (FIRST_RING_M / 2) ** 2)
      for (let azimuth = 0; azimuth < 360; azimuth += 2) {
        const step = Math.abs(shareOf(near, azimuth + 2) - shareOf(near, azimuth))
        expect(step).toBeLessThan((4 * Math.sin(RAD)) / Math.PI + gridError)
      }
    }
  })
})

describe('the land\'s near ground', () => {
  const at = (data: Parameters<typeof livingLandOf>[0]['data']) => livingLandOf({ lat: SHADMOT.lat, lon: SHADMOT.lon,
    elevationM: -175, shownDate: '2026-11-15', shownUtcDate: '2026-11-15', camera: SCENE_CAMERA, terrain: SHADMOT_TERRAIN, data })

  it('costs the place load no cover reads, and one per cell when first asked', () => {
    let reads = 0
    const town = typedCover(5, 'worldcover-2021:local-50m')
    const cover: LandCover = { ...town, coverWithSourceAt: (lat, lon) => { reads++; return town.coverWithSourceAt!(lat, lon) } }
    const land = at({ cover, near: null, far: null, weather: null })
    const loaded = reads
    expect(loaded).toBeLessThanOrEqual(1 + land.local.length + land.rays.length * land.distancesM.length)
    const shares = nearGroundAt(land, land.rays[0].azimuth)
    expect(reads).toBe(loaded + shares.length)
    nearGroundAt(land, land.rays[0].azimuth)
    expect(reads).toBe(loaded + shares.length)
  })

  it('is the place\'s own sample where no cover is loaded', () => {
    const land = at(null)
    expect(nearGroundAt(land, 0)).toEqual([{ sample: land.own, weight: 1 }])
  })
})
