import { expect, it } from 'vitest'
import { panoramaFarColumns } from './farData'
import { FAR_COLS, FAR_LAT_STEP, FAR_LON_STEP, FAR_ROWS, FAR_SOUTH, FAR_WEST } from './farGrid'
import { plainLights } from './plainLights'
import { groundFn } from '../landmarks/seat'
import { azimuthAt, computePanorama, destination } from '../terrain/panorama'
import { terrainFromPanorama } from '../terrain/panoramaTerrain'

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
