import { expect, it } from 'vitest'
import { placeMarks } from '../landmarks/placeMarks'
import { projectSight } from '../landmarks/project'
import { anglePx } from './angleScale'
import { apparentAngle, computePanorama, destination, packPanorama, unpackPanorama } from './panorama'
import { terrainFromPanorama } from './panoramaTerrain'

const from = { lat: 32, lon: 35 }
const target = destination(from.lat, from.lon, 31, 270)
const flat = (d: number) => d < 3 ? 700 : 100
const withRise = (height: number) => (d: number) => Math.abs(d - 10) < .1 ? height : flat(d)

it('projects a visible plain with the same angle scale as the horizon', () => {
  const terrain = terrainFromPanorama(computePanorama(flat, 950))
  const point = projectSight(from, target, terrain.sightAt!)
  const angle = apparentAngle(100, 31, 952)
  expect(angle).toBeCloseTo(-1.698, 2)
  expect(point).toMatchObject({ layer: 'plain', x: expect.closeTo(322.5, 8), angle: expect.closeTo(angle, 8),
    groundAngle: expect.closeTo(angle, 8), y: expect.closeTo(terrain.horizonY! - anglePx(angle), 8) })
  expect(terrain.seenAt!(322.5, 31.7)?.angle).toBeCloseTo(apparentAngle(100, 31.7, 952), 8)
  expect(terrain.seenAt!(322.5, 60.01)).toBeNull()
})

it('keeps terrain in shadow and lets a tall tower clear a lower foreground rise', () => {
  const blocked = terrainFromPanorama(computePanorama(withRise(1000), 950))
  expect(projectSight(from, target, blocked.sightAt!)).toBeNull()
  const lower = terrainFromPanorama(computePanorama(withRise(677), 950))
  expect(projectSight(from, target, lower.sightAt!)).toBeNull()
  expect(projectSight(from, { ...target, heightM: 150 }, lower.sightAt!)).toMatchObject({
    layer: 'plain', angle: expect.closeTo(apparentAngle(250, 31, 952), 8),
  })
})

it('keeps a shortlisted landmark at its geographic x and ground y', () => {
  const terrain = terrainFromPanorama(computePanorama(flat, 950))
  const place = { ...from, id: 'test', nameHe: '', regionHe: '', timezone: 'Asia/Jerusalem' }
  const marks = placeMarks(place, terrain, [{ ...target, id: 'tower', kind: 'mast', source: 'osm', heightM: 150 }], 375)
  expect(marks).toHaveLength(1)
  expect(marks[0]).toMatchObject({ layer: 'plain', xPct: expect.closeTo(86, 8),
    baseY: expect.closeTo(terrain.seenAt!(322.5, 31)!.y, 8) })
  expect(marks[0].hPx).toBeGreaterThanOrEqual(3)
})

it('interpolates adjacent bearings before comparing the target to the foreground', () => {
  const p = computePanorama((km, az) => flat(km) + (km >= 3 && az < 180 ? 60 : 0), 950, 2)
  const terrain = terrainFromPanorama(p)
  expect(terrain.seenAt!(187.5, 31)?.angle).toBeCloseTo((apparentAngle(100, 31, 952)
    + apparentAngle(160, 31, 952)) / 2, 8)
})

it('packs the full profile and rejects v2', () => {
  const panorama = computePanorama(withRise(677), 950)
  const packed = packPanorama(panorama)
  const stored = JSON.stringify(packed)
  expect(stored.length).toBeLessThan(60_000)
  const restored = unpackPanorama(JSON.parse(stored))!
  expect(unpackPanorama({ ...packed, v: 2 })).toBeNull()
  for (const [i, { angle, seen }] of panorama.rays[0].profile.entries()) {
    const sample = restored.rays[0].profile[i]
    expect(sample.seen).toBe(seen)
    expect(Math.abs(sample.angle - angle)).toBeLessThan(Math.abs(angle) <= 18 ? .01001 : .334)
  }
})
