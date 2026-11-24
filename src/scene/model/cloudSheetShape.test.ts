import { expect, it, vi } from 'vitest'
import { SCENE_CAMERA } from '../../domain/camera'
import { loneCell } from '../../test/loneCell'
import type * as Edges from '../../world/field/edges'
import { groundRangeAt } from '../../world/field/project'
import { terrainY } from '../../world/terrain'
import type { WorldState } from '../../world/types'
import { pxPerRadAt } from './advect'
import { cloudSheetOf } from './cloudSheet'
import { sheetAlphaAt } from './cloudSheetGrid'
import { seenDepth } from './cloudSheetSeen'
import { DOME_ALT } from './dome'
import { skyGeom } from './sky'
import type { LayerOf, SceneBox } from './types'

/** The air's lobes, taken away where a cell's own shape is judged. */
const air = vi.hoisted(() => ({ still: false }))
vi.mock('../../world/field/edges', async (load) => {
  const real = await load<typeof Edges>()
  return { ...real, edgeNoise: (...args: Parameters<typeof real.edgeNoise>) =>
    air.still ? { ...real.edgeNoise(...args), at: () => 0 } : real.edgeNoise(...args) }
})

const RAD = Math.PI / 180
const box: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const neutral = { body: [1, 1, 1], shade: [0.5, 0.5, 0.5], lit: [1, 1, 1], light: 0 } as const
const worldOf = (id: string) => ({
  place: { id }, camera: SCENE_CAMERA, bodies: { sun: { azimuth: 0 } },
  relief: { y: (altitude: number) => terrainY(box.landHeight, altitude) },
}) as WorldState
const geom = skyGeom(worldOf('shape'), box)
const PX = Math.abs(pxPerRadAt(geom.azimuthAt, geom.width / 2)) * RAD

/** The altitude drawn at `y`: the dome falls with it all the way. */
function altitudeAt(y: number) {
  let low = 0, high = 90
  for (let i = 0; i < 30; i++) {
    const middle = (low + high) / 2
    if (geom.dome(middle) > y) low = middle
    else high = middle
  }
  return low
}

/** The painted widths (px) of a lone cloud at half its opacity, half a pixel a row, top to bottom. */
function widths(sheet: LayerOf<'cloudSheet'>) {
  const rows = []
  for (let y = 0; y < sheet.bounds.h; y += 0.5) {
    let count = 0
    for (let x = 0.25; x < sheet.bounds.w; x += 0.5) count += Number(sheetAlphaAt(sheet, x, y) >= 0.5)
    if (count) rows.push(count / 2)
  }
  return rows
}

/** A shape's height over its widest row, its width near its foot, and how far it widens again under a waist (a vase). */
function shapeOf(rows: readonly number[], rowPx: number) {
  const widest = Math.max(...rows), low = rows.slice(rows.indexOf(widest))
  return {
    aspect: rows.length * rowPx / widest, foot: rows[Math.floor(0.85 * rows.length)] / widest,
    flare: Math.max(0, ...low.map((wide, i) => Math.max(...low.slice(i)) - wide)) / widest,
  }
}

const place = (genus: 'ac' | 'cu', heightKm: number, r: number, vKm: number, elevation: number, azimuth: number) => {
  const range = groundRangeAt(heightKm, elevation)
  return loneCell(genus, range * Math.sin(azimuth * RAD), range * Math.cos(azimuth * RAD), r, vKm, heightKm)
}

/** A lone cell as it is painted. Less than a quarter as wide as its widest, a row is a lobe's tip (an oval loses a thirtieth). */
function painted(id: string, genus: 'ac' | 'cu', heightKm: number, r: number, vKm: number, elevation: number, azimuth: number) {
  const rows = widths(cloudSheetOf(worldOf(id), geom, place(genus, heightKm, r, vKm, elevation, azimuth), neutral)!)
  const widest = Math.max(...rows)
  return { ...shapeOf(rows, 0.5), aspect: shapeOf(rows.filter((wide) => wide >= widest / 4), 0.5).aspect }
}

/** A lone cell as it is shaped, at half its opacity, whatever the rows it is painted on: half a pixel a row. */
function shaped(genus: 'ac' | 'cu', heightKm: number, r: number, vKm: number, elevation: number) {
  const snapshot = place(genus, heightKm, r, vKm, elevation, 180)
  const seen = seenDepth('a', 960, snapshot, geom, snapshot.densityGrid.tauAt)
  const rows = []
  for (let y = geom.dome(90); y < geom.dome(DOME_ALT / 2); y += 0.5) {
    const altitude = altitudeAt(y), range = groundRangeAt(heightKm, altitude), depthAt = seen(range, altitude)
    let count = 0
    for (let azimuth = 90; azimuth < 270; azimuth += 0.25) {
      count += Number(depthAt(range * Math.sin(azimuth * RAD), range * Math.cos(azimuth * RAD)) >= Math.LN2)
    }
    if (count) rows.push(count / 4 * PX)
  }
  return shapeOf(rows, 0.5)
}

const cases = [['ac', 5, 1.5, 0.4], ['cu', 1.4, 0.35, 0.36]] as const
const ELEVATIONS = [35, 40, 45, 50, 55, 60], STEPS = [-2, -1, 0, 1, 2]

it.each(cases)('draws a lone %s cell as wide as it is tall, on a broad foot', (genus, heightKm, r, vKm) => {
  for (const elevation of ELEVATIONS) {
    // Round the sky of several places, as each has its own lobes, and over a row's span (5°), as a rim is drawn on the rows.
    const shapes = ['a', 'b', 'c'].flatMap((id) => [150, 180, 210].flatMap((azimuth) => STEPS.map((step) =>
      painted(id, genus, heightKm, r, vKm, elevation + step, azimuth))))
    const mean = (of: (shape: (typeof shapes)[number]) => number) => shapes.reduce((sum, shape) => sum + of(shape), 0) / shapes.length
    const aspect = mean((shape) => shape.aspect), foot = mean((shape) => shape.foot)
    const flare = Math.max(...shapes.map((shape) => shape.flare))
    console.info('PAINTED', genus, elevation, { aspect, foot, flare })
    // Not one of them a vase.
    expect.soft(flare, `${genus} ${elevation}`).toBeLessThanOrEqual(0.1)
    expect.soft(aspect, `${genus} ${elevation}`).toBeLessThanOrEqual(1.1)
    // An oval is .71 of its width there: no cone, no drop hanging from its tip.
    expect.soft(foot, `${genus} ${elevation}`).toBeGreaterThanOrEqual(0.6)
  }
}, 60_000)

it.each(cases)('shapes each lone %s cell on its own broad foot, none a cone or a vase', (genus, heightKm, r, vKm) => {
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
