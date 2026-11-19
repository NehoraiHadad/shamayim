import { expect, it } from 'vitest'
import { distanceOf } from '../landmarks/project'
import { anglePx } from '../terrain/angleScale'
import { apparentAngle, computePanorama, destination } from '../terrain/panorama'
import { terrainFromPanorama } from '../terrain/panoramaTerrain'
import { skylineData } from './skylineData'
import { splitSkylineTowers } from './skylineTowers'
import type { CityTower } from './types'

const place = { lat: 32, lon: 35 }
const flat = terrainFromPanorama(computePanorama(() => 0, 0))
const square = { built: 1, levels: 0, p90: 0 }
const uniform = { at: () => square }
const empty = { at: () => ({ ...square, built: 0 }) }

const towerAt = (km: number, azimuth: number, heightM = 150): CityTower => ({
  ...destination(place.lat, place.lon, km, azimuth), dx: 0, dy: 0, wClass: 1, heightM,
})

it('keeps uniform flat roofs visible with a 1.5 px floor, and returns no mass for zero cover', () => {
  const result = skylineData(place, 375, uniform, flat)!
  expect(result.eyeLiftM).toBe(10)
  expect(result.columns).toHaveLength(188)
  for (const { faces } of result.columns) {
    expect(faces[0]!.foot - faces[0]!.top).toBeCloseTo(1.5, 10)
  }
  expect(skylineData(place, 375, empty, flat)?.columns.every(({ faces }) => faces.every(face => face === null))).toBe(true)
})

it('samples the re-angled foreground ridge before testing roofs behind it', () => {
  const ridge = terrainFromPanorama(computePanorama(km => Math.abs(km - .9) < .01 ? 150 : 0, 0))
  const distant = { at: (lat: number, lon: number) =>
    distanceOf(place, { lat, lon }) >= 1.5 ? square : { ...square, built: 0 } }
  const result = skylineData(place, 20, distant, ridge, [towerAt(2, 180)])!
  expect(result.columns.every(({ faces }) => faces.every(face => face === null))).toBe(true)
  expect(result.towers).toEqual([])
})

it('projects a 150 m tower at its true bearing, and derives both its top and height from the terrain scale', () => {
  const geometry = skylineData(place, 375, uniform, flat, [towerAt(2, 140), towerAt(7, 140), towerAt(2, 0)])!
  expect(geometry.towers).toHaveLength(1)
  const [tower] = geometry.towers
  const topAngle = apparentAngle(-2 + 150 - geometry.eyeLiftM, 2, 0)
  const footAngle = apparentAngle(-2, 2, 0)
  expect(tower.h).toBeCloseTo(anglePx(topAngle) - anglePx(footAngle), 9)
  expect(tower.baseY - tower.h).toBeCloseTo(flat.horizonY! - anglePx(topAngle), 9)
  // From the left edge (55°, east-north-east) clockwise.
  expect(tower.x).toBeCloseTo((140 - 55) / 250 * 375, 8)
  expect(tower.w).toBeCloseTo(5 * 1.5 / 2, 9)
})

it('includes both ends of the skyline range after geodesic projection', () => {
  const towers = [towerAt(.399, 140), towerAt(.4, 140), towerAt(6, 140), towerAt(6.001, 140)]
  const projected = skylineData(place, 20, empty, flat, towers)!.towers
  expect(projected.map(tower => tower.km)).toEqual([expect.closeTo(.4, 9), expect.closeTo(6, 9)])
})

it('occludes towers behind nearer mass and preserves a deterministic cover and roof pattern', () => {
  const sparse = { at: () => ({ built: .004, levels: 6, p90: 48 }) }
  const a = skylineData(place, 375, sparse, flat)!
  expect(a.columns.some(({ faces }) => faces.some(Boolean))).toBe(true)
  expect(a.columns.some(({ faces }) => faces.every(face => face === null))).toBe(true)
  expect(skylineData(place, 375, sparse, flat)).toEqual(a)

  const nearby = { at: (lat: number, lon: number) => {
    const km = distanceOf(place, { lat, lon })
    return { built: km >= .4 && km <= .8 ? 1 : 0, levels: 15, p90: 60 }
  } }
  const tower = towerAt(2, 180, 70)
  expect(skylineData(place, 2, empty, flat, [tower])?.towers).toHaveLength(1)
  expect(skylineData(place, 2, nearby, flat, [tower])?.towers).toEqual([])
})

it('deduplicates curated towers, caps the glyph count and retains the rest as slabs', () => {
  const towers = Array.from({ length: 17 }, (_, i) => towerAt(2, 70 + i * 13))
  const projected = skylineData(place, 10, empty, flat, towers)!.towers
  const { glyphs, slabs } = splitSkylineTowers(projected, [towers[0]])
  expect(glyphs).toHaveLength(14)
  expect(slabs).toHaveLength(2)
  expect([...glyphs, ...slabs].some(tower => tower.location === towers[0])).toBe(false)
})
