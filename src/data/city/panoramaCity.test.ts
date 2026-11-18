import { describe, expect, it } from 'vitest'
import { placeCityTowers } from './cityTowers'
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
  it('seats a near tower at the landmark bearing and skips hidden and behind-viewer towers', () => {
    const near = towerAt(2, 140)
    const hidden = towerAt(7, 140)
    const behind = towerAt(2, 0)
    const towers = placeCityTowers({
      width, floor: 124, centerX: 187.5, centerY: 92, ground: () => 92, curated: [],
      towers: [near, hidden, behind], panorama: { place, sightAt: sight },
    })
    expect(towers).toHaveLength(1)
    expect(towers[0]).toMatchObject({ x: projectSight(place, near, sight)?.x, baseY: 93, row: 1 })
  })

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
})
