import { expect, it } from 'vitest'
import { SCENE_CAMERA } from '../../domain/camera'
import { layerSnapshot } from '../../world/field/density'
import { cellTauAt } from '../../world/field/footprint'
import { groundRangeAt } from '../../world/field/project'
import type { FieldCell, FieldLayer } from '../../world/field/types'
import { terrainY } from '../../world/terrain'
import type { WorldState } from '../../world/types'
import { cloudSheetOf } from './cloudSheet'
import { sheetAlphaAt } from './cloudSheetGrid'
import { skyGeom } from './sky'
import type { LayerOf, SceneBox } from './types'

const box: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const neutral = { body: [1, 1, 1], shade: [0.5, 0.5, 0.5], lit: [1, 1, 1], light: 0 } as const
const world = {
  place: { id: 'shape' }, camera: SCENE_CAMERA, bodies: { sun: { azimuth: 0 } },
  relief: { y: (altitude: number) => terrainY(box.landHeight, altitude) },
} as WorldState
const geom = skyGeom(world, box)

/** One cell of a layer, alone in the sky, as the sheet shows it. */
function lone(genus: 'ac' | 'cu', x: number, y: number, r: number, vKm: number, heightKm: number) {
  const lattice = genus === 'ac' ? 'mid' as const : 'low' as const
  const layer: FieldLayer = {
    lattice, baseKm: heightKm - vKm / 2, meanVKm: vKm, kappa: 15, cover: 0.25, Q: 1, g: 1, floorTau: 0,
    form: { conv: 0, strat: lattice === 'low' ? 0.55 : 0, sheet: 0, veil: 0 }, d: [0, 0], vel: [0, 0],
  }
  const cell: FieldCell = {
    genus, lattice, id: 47, seed: 47, x, y, r, baseKm: layer.baseKm, vKm, tau0: 15, rainWeight: 0, share: 1, rank: 0,
  }
  const physical = layerSnapshot({ placeId: 'shape', t: 960, layers: [layer] }, lattice, 0, 0, 100)
  const depth = (east: number, north: number) => cellTauAt(cell, east, north)
  return cloudSheetOf(world, geom, { ...physical, cells: [cell], densityGrid: {
    ...physical.densityGrid, tauAt: depth, resolvedTauAt: depth, expectedTauAt: () => 0,
  } }, neutral)!
}

/** The painted widths (px) of a lone cloud, half a pixel a row, top to bottom. */
function widths(sheet: LayerOf<'cloudSheet'>) {
  const rows = []
  for (let y = 0; y < sheet.bounds.h; y += 0.5) {
    let count = 0
    for (let x = 0.25; x < sheet.bounds.w; x += 0.5) count += Number(sheetAlphaAt(sheet, x, y) >= 0.25)
    if (count) rows.push(count / 2)
  }
  return rows
}

it.each([
  ['ac', 5, 1.5, 0.4], ['cu', 1.4, 0.35, 0.36],
] as const)('draws a lone %s cell as wide as it is tall, on a broad foot', (genus, heightKm, r, vKm) => {
  for (const elevation of [35, 40, 45, 50, 55, 60]) {
    const rows = widths(lone(genus, 0, -groundRangeAt(heightKm, elevation), r, vKm, heightKm))
    const widest = Math.max(...rows), foot = rows[Math.floor(0.85 * rows.length)]
    console.info(genus, elevation, { tall: rows.length / 2, widest, foot: foot / widest, at: rows.indexOf(widest) / rows.length })
    expect.soft(rows.length / 2 / widest, `${genus} ${elevation}`).toBeLessThanOrEqual(1.1)
    // An oval is .71 of its width there: no cone, no drop hanging from its tip.
    expect.soft(foot / widest, `${genus} ${elevation}`).toBeGreaterThanOrEqual(0.6)
  }
})

it('draws no level rim: an overhead cell ends at a height that follows the air, not the projection', () => {
  const heightKm = 5, sheet = lone('ac', 0, 0, groundRangeAt(heightKm, 40), 0.4, heightKm)
  const rim = Array.from({ length: 125 }, (_, i) => {
    let y = 0
    while (y < sheet.bounds.h && sheetAlphaAt(sheet, 3 * i, y) >= 0.25) y += 0.5
    return y
  })
  console.info({ low: Math.min(...rim), high: Math.max(...rim) })
  // No part of it, a tenth of the width long, lies along one row.
  for (let i = 0; i + 13 < rim.length; i++) {
    const run = rim.slice(i, i + 13)
    expect.soft(Math.max(...run) - Math.min(...run)).toBeGreaterThan(0)
  }
  expect(Math.max(...rim) - Math.min(...rim)).toBeGreaterThan(4)
})
