import { expect, it } from 'vitest'
import { panoramaFarColumns } from './farData'
import { FAR_COLS, FAR_LAT_STEP, FAR_LON_STEP, FAR_ROWS, FAR_SOUTH, FAR_WEST } from './farGrid'
import { plainLights } from './plainLights'
import { plainPatches } from './plainData'
import { groundFn } from '../landmarks/seat'
import { azimuthAt, computePanorama, destination } from '../terrain/panorama'
import { terrainFromPanorama } from '../terrain/panoramaTerrain'

it('retains the plain patch geometry for a synthetic one-cell ray', () => {
  const place = { lat: 32, lon: 35 }
  const grid = new Uint8Array(FAR_ROWS * FAR_COLS)
  const target = destination(place.lat, place.lon, 6, 180)
  const row = Math.floor((target.lat - FAR_SOUTH) / FAR_LAT_STEP)
  const col = Math.floor((target.lon - FAR_WEST) / FAR_LON_STEP)
  grid[row * FAR_COLS + col] = 0x83
  const terrain = {
    nearPoints: [[0, 105], [375, 105]], farPoints: [[0, 70], [375, 70]],
    seenAt: () => ({ angle: 0, groundAngle: 0, y: 95, groundY: 95 }),
  } satisfies Parameters<typeof plainPatches>[3]
  expect(plainPatches(place, 2, grid, terrain)).toMatchObject([{
    // The mirror across the 2 px width of the old [.964440729, 1.006355258] (east now on the left).
    left: expect.closeTo(.993644742, 8), right: expect.closeTo(1.035559271, 8),
    top: 94.5, bottom: 95.5, km: expect.closeTo(5.925335114, 8),
    built: 8 / 15, area: expect.closeTo(.497595947, 8),
  }])
  const clipped = plainPatches(place, 2, grid, terrain, 6)
  expect(clipped).toHaveLength(1)
  expect(clipped[0].km).toBeGreaterThan(6)
  expect(clipped[0].area).toBeLessThan(.497595947)
  expect(plainPatches(place, 2, grid, terrain, 7)).toEqual([])
})

it('projects built cells onto seen ground and confines deterministic lights to those patches', () => {
  const place = { lat: 32, lon: 35 }
  const width = 375
  const x = 187
  const target = destination(place.lat, place.lon, 30, azimuthAt(x / width))
  const row = Math.floor((target.lat - FAR_SOUTH) / FAR_LAT_STEP)
  const col = Math.floor((target.lon - FAR_WEST) / FAR_LON_STEP)
  const grid = new Uint8Array(FAR_ROWS * FAR_COLS)
  grid[row * FAR_COLS + col] = 0xf3
  const terrain = terrainFromPanorama(computePanorama(d => d < 3 ? 700 : 100, 950))
  const { patches } = panoramaFarColumns(place, width, { grid, towers: [] }, terrain.sightAt!, terrain)
  const expectedY = terrain.seenAt!(x, 30)!.y
  const patch = patches!.find(p => p.left <= x && p.right >= x)!
  expect(patch).toMatchObject({
    top: expect.closeTo(expectedY - .5, 0), bottom: expect.closeTo(expectedY + .5, 0),
  })
  expect(patch.right - patch.left).toBeLessThan(1.6)
  const dots = plainLights(patches!, 17)
  const near = groundFn(terrain.nearPoints, width), far = groundFn(terrain.farPoints, width)
  for (const { left, right, top, bottom } of patches!) {
    expect(top).toBeGreaterThanOrEqual(Math.max(far(left), far(right)))
    expect(bottom).toBeLessThanOrEqual(Math.min(near(left), near(right)))
    expect(bottom - top).toBeLessThanOrEqual(3)
  }
  expect(dots.length).toBeGreaterThan(0)
  expect(dots).toEqual(plainLights(patches!, 17))
  for (const { x, y } of dots) {
    expect(patches!.some(p => x >= p.left && x <= p.right && y >= p.top && y <= p.bottom)).toBe(true)
  }
  const hidden = terrainFromPanorama(computePanorama(d => d < 3 ? 700 : Math.abs(d - 10) < .1 ? 1000 : 100, 950))
  const blocked = panoramaFarColumns(place, width, { grid, towers: [] }, hidden.sightAt!, hidden)
  expect(blocked.patches).toEqual([])
  expect(plainLights(blocked.patches!, 17)).toEqual([])
})
