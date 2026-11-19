import { xOf, type Camera } from '../../domain/camera'
import type { CityRaster } from '../city/cityRaster'
import { LAT_STEP, LON_STEP } from '../city/grid'
import { roofHeight } from '../city/skylineHeight'
import { hashId, seeded } from '../landmarks/hash'
import type { Coordinate } from '../landmarks/project'
import type { House } from '../landmarks/settlement'
import { SKY_PX } from '../terrain/angleScale'
import { POLE } from './stage'

export interface StageHouses { houses: House[]; blocks: boolean }

/** Metres a degree of latitude, and of longitude at a latitude. */
const NORTH_M = 111_320
const eastM = (lat: number) => NORTH_M * Math.cos((lat * Math.PI) / 180)
/** Footprint a drawn house stands for (m²): a village lot; a denser square gets more houses, up to `MAX_PER_SQUARE`. */
const LOT_M2 = 700
const MAX_PER_SQUARE = 9
/** Houses nearer the pole than this (m) would fill the screen; the stage starts here. */
const NEAREST_M = 60

/**
 * The place's own buildings as the pole camera sees them: every built square of the city raster within the stage's
 * reach (~118 × 232 m squares from OpenStreetMap footprints), filled with houses as dense and as tall as the square
 * says, each placed at a seeded spot in it and projected from the pole: across by its direction from the pole, down
 * by its distance (true scale), as big as it really looks from there. Turning the view moves the pole round the place,
 * so the village is seen from the other side, with its real gaps, fields and edges.
 *
 * Empty when nothing is built there (a field, the desert): the stage then shows only the ground and the dot.
 */
export function stageHouses(place: Coordinate, raster: CityRaster, camera: Camera, horizonY: number): StageHouses {
  const east = eastM(place.lat)
  const heading = (camera.heading * Math.PI) / 180
  // The pole: `backM` behind the place, against the view.
  const pole = { e: -POLE.backM * Math.sin(heading), n: -POLE.backM * Math.cos(heading) }
  const reach = POLE.reachM
  const rows = Math.ceil(reach / (LAT_STEP * NORTH_M)) + 1
  const cols = Math.ceil(reach / (LON_STEP * east)) + 1
  const row0 = Math.floor(place.lat / LAT_STEP), col0 = Math.floor(place.lon / LON_STEP)
  const houses: (House & { d: number })[] = []
  let builtM2 = 0, tallM2 = 0
  for (let row = row0 - rows; row <= row0 + rows; row++) {
    for (let col = col0 - cols; col <= col0 + cols; col++) {
      const lat = (row + .5) * LAT_STEP, lon = (col + .5) * LON_STEP
      const { built, levels, p90 } = raster.at(lat, lon)
      if (built <= 0) continue
      const area = LAT_STEP * NORTH_M * LON_STEP * east
      builtM2 += built * area
      if (roofHeight(levels, p90, .5) > 10) tallM2 += built * area
      const count = Math.min(MAX_PER_SQUARE, Math.max(1, Math.round((built * area) / LOT_M2)))
      // Each drawn house carries its share of the square's footprint.
      const side = Math.min(40, Math.max(9, Math.sqrt((built * area) / count) * .8))
      const random = seeded(hashId(`stage:${row}:${col}`))
      for (let i = 0; i < count; i++) {
        const e = (col + random()) * LON_STEP * east - place.lon * east
        const n = (row + random()) * LAT_STEP * NORTH_M - place.lat * NORTH_M
        const heightM = Math.min(30, roofHeight(levels, p90, random()))
        const seed = Math.floor(random() * 2 ** 30)
        if (Math.hypot(e, n) > reach) continue
        const de = e - pole.e, dn = n - pole.n
        const ahead = de * Math.sin(heading) + dn * Math.cos(heading)
        const d = Math.hypot(de, dn)
        if (ahead < NEAREST_M) continue
        const azimuth = (Math.atan2(de, dn) * 180) / Math.PI
        const x = xOf(azimuth, camera)
        if (x < -20 || x > camera.width + 20) continue
        const below = (m: number) => SKY_PX * Math.sin(Math.atan2(POLE.upM - m, d))
        houses.push({ x, baseY: horizonY + below(0), w: Math.max(1.2, (side / d) * SKY_PX), h: Math.max(1, below(0) - below(heightM)),
          row: 0, lit: seed % 3 !== 0, seed, storeys: heightM > 7 ? 2 : undefined, d })
      }
    }
  }
  // Far first, so nearer houses stand in front. Mostly apartment buildings: drawn as blocks, else as houses.
  return { houses: houses.sort((a, b) => b.d - a.d).map(({ d: _d, ...house }) => house), blocks: tallM2 > builtM2 / 2 }
}
