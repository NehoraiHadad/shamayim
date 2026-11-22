import { expect, it } from 'vitest'
import { FAR_COLS, FAR_ROWS, FAR_SOUTH, FAR_WEST, FAR_LAT_STEP, FAR_LON_STEP } from './farGrid'
import { townFootprints, farCellId } from './townFootprints'
import { cityRaster } from './cityRaster'
import { cellKey, COLS, ROWS } from './grid'
import { localTownAt } from '../../world/markContext'
import type { CityResult } from './types'
import type { Landmark } from '../landmarks/types'

it('keeps distinct connected source footprints and does not wrap the grid edge', () => {
  const grid = new Uint8Array(FAR_COLS * FAR_ROWS)
  for (const i of [0, FAR_COLS + 1, FAR_COLS - 1, FAR_COLS * 3 + 5]) grid[i] = 0xf1
  const data = { grid, towers: [] }, footprints = townFootprints(data)
  expect(footprints.get(0)?.townId).toBe(footprints.get(FAR_COLS + 1)?.townId)
  expect(footprints.get(FAR_COLS - 1)?.townId).not.toBe(footprints.get(0)?.townId)
  expect(footprints.get(FAR_COLS * 3 + 5)?.townId).not.toBe(footprints.get(0)?.townId)
  expect(footprints.get(0)?.built).toBe(1)
  expect(townFootprints(data)).toBe(footprints)
  expect(farCellId({ lat: FAR_SOUTH + FAR_LAT_STEP / 2, lon: FAR_WEST + FAR_LON_STEP / 2 })).toBe(0)
  expect(farCellId({ lat: FAR_SOUTH - 1, lon: FAR_WEST })).toBeUndefined()
})

it('distinguishes known empty town raster from unavailable source cells', () => {
  const lat = 31.6, lon = 35.1, source = { lat, lon } as Landmark
  const raster = cityRaster(new Map([[cellKey(lat, lon), new Uint8Array(COLS * ROWS * 2)]]))
  const city = { raster } as CityResult
  expect(localTownAt(city, source)).toBe(false)
  expect(localTownAt(city, { lat: lat + 1, lon } as Landmark)).toBeUndefined()
})
