import { expect, it } from 'vitest'
import { SCENE_CAMERA } from '../../domain/camera'
import { loneCell } from '../../test/loneCell'
import { groundRangeAt } from '../../world/field/project'
import { terrainY } from '../../world/terrain'
import type { WorldState } from '../../world/types'
import { cloudSheetOf } from './cloudSheet'
import { sheetAlphaAt } from './cloudSheetGrid'
import { seenDepth } from './cloudSheetSeen'
import { DOME_ALT } from './dome'
import { skyGeom } from './sky'
import type { LayerOf, SceneBox } from './types'

const RAD = Math.PI / 180
const box: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const neutral = { body: [1, 1, 1], shade: [0.5, 0.5, 0.5], lit: [1, 1, 1], light: 0 } as const
const worldOf = (id: string) => ({
  place: { id }, camera: SCENE_CAMERA, bodies: { sun: { azimuth: 0 } },
  relief: { y: (altitude: number) => terrainY(box.landHeight, altitude) },
}) as WorldState
const geom = skyGeom(worldOf('shape'), box)

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

it.each([
  ['ac', 5, 1.5, 0.4], ['cu', 1.4, 0.35, 0.36],
] as const)('draws a lone %s cell as wide as it is tall, on a broad foot', (genus, heightKm, r, vKm) => {
  for (const elevation of [35, 40, 45, 50, 55, 60]) {
    // Round the sky of several places, as each has its own lobes, and over a row's span (5°), as a rim is drawn on the rows.
    const shapes = ['a', 'b', 'c'].flatMap((id) => [150, 180, 210].flatMap((azimuth) => [-2, -1, 0, 1, 2].map((step) => {
      const range = groundRangeAt(heightKm, elevation + step)
      const rows = widths(cloudSheetOf(worldOf(id), geom,
        loneCell(genus, range * Math.sin(azimuth * RAD), range * Math.cos(azimuth * RAD), r, vKm, heightKm), neutral)!)
      const widest = Math.max(...rows), low = rows.slice(Math.floor(rows.length / 2))
      // A vase: how far the foot's half narrows before it widens again, and its width near its end.
      const waist = Math.max(0, ...low.map((wide, i) => Math.max(...low.slice(i)) - wide)) / widest
      // Its body: less than a quarter as wide as its widest, a row is a lobe's tip (an oval loses a thirtieth of its height).
      return { tall: rows.filter((wide) => wide >= widest / 4).length / 2, widest, foot: rows[Math.floor(0.85 * rows.length)] / widest, waist }
    })))
    const mean = (of: (shape: (typeof shapes)[number]) => number) => shapes.reduce((sum, shape) => sum + of(shape), 0) / shapes.length
    const aspect = mean(({ tall, widest }) => tall / widest), foot = mean((shape) => shape.foot)
    const least = Math.min(...shapes.map((shape) => shape.foot)), tallest = Math.max(...shapes.map(({ tall, widest }) => tall / widest))
    const waist = Math.max(...shapes.map((shape) => shape.waist))
    console.info(`${genus} ${elevation}: aspect ${aspect.toFixed(2)}, foot ${foot.toFixed(2)}; each: aspect ${tallest.toFixed(2)}, foot ${least.toFixed(2)}, waist ${waist.toFixed(2)}`)
    expect.soft(aspect, `${genus} ${elevation}`).toBeLessThanOrEqual(1.1)
    // An oval is .71 of its width there: no cone, no drop hanging from its tip.
    expect.soft(foot, `${genus} ${elevation}`).toBeGreaterThanOrEqual(0.6)
  }
}, 30_000)

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
