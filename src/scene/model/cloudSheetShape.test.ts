import { expect, it, vi } from 'vitest'
import { cellAt, CELLS, ELEVATIONS, geom, loneCell, RAD, silhouette } from '../../test/loneCell'
import type * as Edges from '../../world/field/edges'
import { groundRangeAt } from '../../world/field/project'
import { pxPerRadAt } from './advect'
import { seenDepth } from './cloudSheetSeen'
import { DOME_ALT } from './dome'

/** The air's lobes, taken away where a cell's own shape is judged. */
const air = vi.hoisted(() => ({ still: false }))
vi.mock('../../world/field/edges', async (load) => {
  const real = await load<typeof Edges>()
  return { ...real, edgeNoise: (...args: Parameters<typeof real.edgeNoise>) =>
    air.still ? { ...real.edgeNoise(...args), at: () => 0 } : real.edgeNoise(...args) }
})

const PX = Math.abs(pxPerRadAt(geom.azimuthAt, geom.width / 2)) * RAD

/** A lone cell as it is shaped, at half its opacity, whatever the rows it is painted on: half a pixel a row. */
function shaped(genus: 'ac' | 'cu', heightKm: number, r: number, vKm: number, elevation: number) {
  const snapshot = cellAt(genus, heightKm, r, vKm, elevation, 180)
  const seen = seenDepth('a', 960, snapshot, geom, snapshot.densityGrid.tauAt)
  const rows = []
  for (let y = geom.dome(90); y < geom.dome(DOME_ALT / 2); y += 0.5) {
    const altitude = geom.domeAltitudeAt(y), range = groundRangeAt(heightKm, altitude), depthAt = seen(range, altitude)
    let count = 0
    for (let azimuth = 90; azimuth < 270; azimuth += 0.25) {
      count += Number(depthAt(range * Math.sin(azimuth * RAD), range * Math.cos(azimuth * RAD)) >= Math.LN2)
    }
    if (count) rows.push(count / 4 * PX)
  }
  return silhouette(rows, 0.5)
}

it.each(CELLS)('shapes each lone %s cell on its own broad foot, none a cone or a vase', (genus, heightKm, r, vKm) => {
  air.still = true
  for (const elevation of ELEVATIONS) for (const size of [0.6, 1, 1.4]) {
    const shape = shaped(genus, heightKm, size * r, vKm, elevation)
    console.info('STILL', genus, elevation, size, JSON.stringify(shape))
    expect.soft(shape.aspect, `${genus} ${elevation} ${size}`).toBeLessThanOrEqual(1.1)
    expect.soft(shape.foot, `${genus} ${elevation} ${size}`).toBeGreaterThanOrEqual(0.6)
    expect.soft(shape.flare, `${genus} ${elevation} ${size}`).toBeLessThanOrEqual(0.1)
  }
  air.still = false
}, 60_000)

it('draws no level rim: an overhead cell ends at an altitude that follows the air, not the projection', () => {
  const heightKm = 5, snapshot = loneCell('ac', 0, 0, groundRangeAt(heightKm, 40), 0.4, heightKm)
  const seen = seenDepth('shape', 960, snapshot, geom, snapshot.densityGrid.tauAt)
  const rim = Array.from({ length: 125 }, (_, i) => {
    const azimuth = geom.azimuthAt(3 * i) * RAD
    let altitude = DOME_ALT
    for (let clear = true; clear && altitude < 90; altitude += 0.1) {
      const range = groundRangeAt(heightKm, altitude)
      clear = !seen(range, altitude)(range * Math.sin(azimuth), range * Math.cos(azimuth))
    }
    return altitude
  })
  console.info({ low: Math.min(...rim), high: Math.max(...rim) })
  // No part of it, a fifth of the width long, keeps to one altitude: the screen draws each as a level line.
  for (let i = 0; i + 25 < rim.length; i++) {
    const run = rim.slice(i, i + 25)
    expect.soft(Math.max(...run) - Math.min(...run)).toBeGreaterThan(0.25)
  }
})
