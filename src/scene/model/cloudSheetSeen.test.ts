import { expect, it } from 'vitest'
import { box } from '../../test/cloudSheetFrame'
import { SCENE_CAMERA } from '../../domain/camera'
import { RANGES } from '../../world/field/cells'
import { layerSnapshot } from '../../world/field/density'
import { genusOf } from '../../world/field/genus'
import { maxRadius } from '../../world/field/lattice'
import { occupancyOf } from '../../world/field/occupancy'
import { altitudeOf, groundRangeAt } from '../../world/field/project'
import type { CloudField, FieldLayer } from '../../world/field/types'
import { terrainY } from '../../world/terrain'
import type { WorldState } from '../../world/types'
import { sheetOpacity, sheetPathFactor } from './cloudSheetMath'
import { seenDepth } from './cloudSheetSeen'
import { DOME_ALT } from './dome'
import { skyGeom } from './sky'

const RAD = Math.PI / 180, ROWS = 48, AZIMUTHS = 72, FIELDS = 160, MINUTES = [960, 967, 974]
/** The altitude of a cell's middle from which it is redrawn (`SHAPED_ALT`): with a cell's radius, all that changes. */
const SHAPED_ALT = DOME_ALT / 1.5
const world = { camera: SCENE_CAMERA, relief: { y: (altitude: number) => terrainY(128, altitude) } } as WorldState
const geom = skyGeom(world, box)

/** A layer of the field at a minute, carried by its wind, with the depth reader the sheet itself uses. */
function layerAt(placeId: string, lattice: 'mid' | 'low', cover: number, minute: number) {
  const vel: [number, number] = [0.31, -0.17], since = minute - MINUTES[0]
  const layer: FieldLayer = {
    lattice, baseKm: lattice === 'mid' ? 3.7 : 1.1, meanVKm: 0.6, cover, kappa: 5, ...occupancyOf(lattice, cover),
    form: { conv: 0, strat: 0, sheet: 0, veil: 0 }, d: [4.2 + vel[0] * since, -7.9 + vel[1] * since], vel,
  }
  const field: CloudField = { placeId, t: minute, layers: [layer] }
  const snapshot = layerSnapshot(field, lattice, 0, 0, Math.min(40, RANGES[lattice][1]))
  const genus = genusOf(lattice, layer.form, 0.5), cellular = genus === 'sc' || genus === 'ac'
  return { layer, snapshot, depthAt: cellular ? snapshot.densityGrid.resolvedTauAt : snapshot.densityGrid.tauAt }
}

it.each((['mid', 'low'] as const).flatMap((lattice) => [0.1, 0.3, 0.5, 0.8].map((cover) => [lattice, cover] as const)),
)('keeps the ground, the depth and the mean opacity of a drifting %s field at %s cover', (lattice, cover) => {
  const sums = { cover: [0, 0], sky: [0, 0], tau: [0, 0] }
  let count = 0
  for (let i = 0; i < FIELDS; i++) for (const minute of MINUTES) {
    const { layer, snapshot, depthAt } = layerAt(`cover-${i}`, lattice, cover, minute), { heightKm } = snapshot
    const seen = seenDepth(`cover-${i}`, minute, snapshot, geom, depthAt)
    const edge = groundRangeAt(heightKm, SHAPED_ALT) + maxRadius(lattice) * layer.g
    const top = geom.dome(90), join = geom.dome(DOME_ALT)
    for (let j = 0; j < ROWS; j++) {
      // Equal ground areas, out past the last cell that is redrawn, for the cover; equal rows of the screen for the opacity.
      const ground = edge * Math.sqrt((j + 0.5) / ROWS), up = geom.domeAltitudeAt(top + (join - top) * (j + 0.5) / ROWS)
      for (const [range, altitude, drawn] of [[ground, altitudeOf(heightKm, ground), false], [groundRangeAt(heightKm, up), up, true]] as const) {
        const shaped = seen(range, altitude), slant = sheetPathFactor(layer.baseKm, layer.meanVKm, altitude, Infinity)
        for (let k = 0; k < AZIMUTHS; k++) {
          const azimuth = (k + (j % 2) / 2) * 360 / AZIMUTHS * RAD, x = range * Math.sin(azimuth), y = range * Math.cos(azimuth)
          for (const [which, tau] of [depthAt(x, y), shaped(x, y)].entries()) {
            if (drawn) sums.sky[which] += sheetOpacity(tau, slant)
            else {
              sums.cover[which] += Number(tau > 0.05)
              sums.tau[which] += tau
            }
          }
        }
      }
    }
    count += ROWS * AZIMUTHS
  }
  const change = {
    native: sums.cover[0] / count, cover: (sums.cover[1] - sums.cover[0]) / count,
    sky: (sums.sky[1] - sums.sky[0]) / count, tau: sums.tau[1] / sums.tau[0] - 1,
  }
  console.info('COVER', lattice, cover, JSON.stringify(change))
  expect.soft(Math.abs(change.cover)).toBeLessThanOrEqual(0.01)
  expect.soft(Math.abs(change.tau)).toBeLessThanOrEqual(0.01)
  expect.soft(Math.abs(change.sky)).toBeLessThanOrEqual(0.02)
}, 120_000)
