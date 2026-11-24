import { expect, it } from 'vitest'
import { SCENE_CAMERA } from '../../domain/camera'
import { cellsAround } from '../../world/field/cells'
import { layerSnapshot } from '../../world/field/density'
import { altitudeOf, groundRangeAt } from '../../world/field/project'
import { kernel } from '../../world/field/rasterNodes'
import type { CloudField } from '../../world/field/types'
import { terrainY } from '../../world/terrain'
import type { WorldState } from '../../world/types'
import { sheetOpacity, sheetPathFactor } from './cloudSheetMath'
import { seenDepth } from './cloudSheetSeen'
import { DOME_ALT } from './dome'
import { skyGeom } from './sky'

const RAD = Math.PI / 180, ROWS = 24, FIELDS = 120
const world = { camera: SCENE_CAMERA, relief: { y: (altitude: number) => terrainY(128, altitude) } } as WorldState
const geom = skyGeom(world, { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 1 })

it.each([
  ['mid', 0.28], ['mid', 0.46], ['mid', 0.75], ['low', 0.28], ['low', 0.46], ['low', 0.75],
] as const)('keeps the cover and the mean opacity of many %s fields at %s cover', (lattice, cover) => {
  const baseKm = lattice === 'mid' ? 3.7 : 1.1, height = baseKm + 0.3, edge = groundRangeAt(height, DOME_ALT)
  const sums = { cover: [0, 0], sky: [0, 0], tau: [0, 0] }
  let count = 0
  for (let i = 0; i < FIELDS; i++) {
    const field: CloudField = { placeId: `cover-${i}`, t: 960, layers: [{
      lattice, baseKm, meanVKm: 0.6, cover, Q: 0.95, g: 1, floorTau: 0, kappa: 5,
      form: { conv: 0, strat: 0, sheet: 0, veil: 0 }, d: [0, 0], vel: [0, 0],
    }] }
    const cells = cellsAround(field, lattice, 0, 0, 18)
    const snapshot = { ...layerSnapshot(field, lattice, 0, 0, 1), cells, heightKm: height }
    const depthAt = (x: number, y: number) => cells.reduce((sum, cell) => sum + kernel(cell.tau0,
      ((x - cell.x) ** 2 + (y - cell.y) ** 2) / cell.r ** 2, cell.genus === 'cu'), 0)
    const seen = seenDepth(field.placeId, 960, snapshot, geom, depthAt)
    for (let j = 0; j < ROWS; j++) {
      // Equal ground areas for the cover; equal rows of the screen for the opacity.
      const ground = edge * Math.sqrt((j + 0.5) / ROWS)
      const up = geom.domeAltitudeAt(geom.dome(90) + (geom.dome(DOME_ALT) - geom.dome(90)) * (j + 0.5) / ROWS)
      const rays = [[ground, altitudeOf(height, ground), false], [groundRangeAt(height, up), up, true]] as const
      for (const [range, altitude, drawn] of rays) {
        const shaped = seen(range, altitude), slant = sheetPathFactor(baseKm, 0.6, altitude, Infinity)
        for (let k = -12; k <= 12; k++) {
          const x = range * Math.sin(k * 10 * RAD), y = range * Math.cos(k * 10 * RAD)
          for (const [which, tau] of [depthAt(x, y), shaped(x, y)].entries()) {
            if (drawn) sums.sky[which] += sheetOpacity(tau, slant)
            else {
              sums.cover[which] += Number(tau > 0.05)
              sums.tau[which] += tau
            }
          }
        }
      }
      count += 25
    }
  }
  const change = {
    cover: (sums.cover[1] - sums.cover[0]) / count, sky: (sums.sky[1] - sums.sky[0]) / count, tau: sums.tau[1] / sums.tau[0] - 1,
  }
  console.info(lattice, cover, change)
  for (const [key, value] of Object.entries(change)) expect.soft(Math.abs(value), key).toBeLessThanOrEqual(0.02)
})
