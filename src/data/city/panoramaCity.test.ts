import { describe, expect, it } from 'vitest'
import { panoramaFarColumns } from './farData'
import { FAR_COLS, FAR_LAT_STEP, FAR_LON_STEP, FAR_ROWS, FAR_SOUTH, FAR_WEST } from './farGrid'
import { projectSight } from '../landmarks/project'
import { azimuthAt, destination } from '../terrain/panorama'
import type { CityTower } from './types'

const place = { lat: 32, lon: 35 }
const width = 375
const sight = () => ({ nearKm: 3, farKm: 12, farShows: true })
const towerAt = (km: number, azimuth: number): CityTower => ({
  ...destination(place.lat, place.lon, km, azimuth),
  // Deliberately use the same strip offsets. They cannot distinguish the bearings.
  dx: 0, dy: -1, heightM: 100, wClass: 0,
})

describe('city geometry on the true horizon', () => {
  it('samples far fabric on the visible crest and projects the far tower like a landmark', () => {
    const grid = new Uint8Array(FAR_ROWS * FAR_COLS)
    const target = destination(place.lat, place.lon, 12, azimuthAt(0.5))
    const row = Math.floor((target.lat - FAR_SOUTH) / FAR_LAT_STEP)
    const col = Math.floor((target.lon - FAR_WEST) / FAR_LON_STEP)
    grid[row * FAR_COLS + col] = 0xf3
    const far = towerAt(12, 180)
    const result = panoramaFarColumns(place, width, { grid, towers: [[far.lat, far.lon, far.heightM]] }, sight)
    expect(result.columns.find(({ left, right }) => left <= 187.5 && right > 187.5))
      .toMatchObject({ built: 1, heightClass: 3 })
    expect(result.towers).toEqual([{ x: projectSight(place, far, sight)?.x, heightM: 100 }])
    expect(panoramaFarColumns(place, width, { grid, towers: [[far.lat, far.lon, far.heightM]] },
      () => ({ ...sight(), farShows: false }))).toEqual({ columns: [], towers: [] })
  })

  it('leaves only towers beyond the skyline handoff in the far city', () => {
    const grid = new Uint8Array(FAR_ROWS * FAR_COLS)
    const data = { grid, towers: [towerAt(6, 180), towerAt(7, 180)].map(({ lat, lon, heightM }) =>
      [lat, lon, heightM] as [number, number, number]) }
    const crest = () => ({ nearKm: 3, farKm: 7, farShows: true })
    expect(panoramaFarColumns(place, width, data, crest).towers).toHaveLength(2)
    expect(panoramaFarColumns(place, width, data, crest, undefined, 6).towers).toHaveLength(1)
  })
})
