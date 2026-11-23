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
  place: { id: 'contour' }, camera: SCENE_CAMERA, bodies: { sun: { azimuth: 0 } },
  relief: { y: (altitude: number) => terrainY(box.landHeight, altitude) },
} as WorldState

type Point = [number, number]
const cross = ([ax, ay]: Point, [bx, by]: Point, [cx, cy]: Point) =>
  (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)

function hullArea(points: Point[]) {
  const sorted = points.sort(([ax, ay], [bx, by]) => ax - bx || ay - by)
  const chain = (points: Point[]) => {
    const side: Point[] = []
    for (const point of points) {
      while (side.length >= 2 && cross(side[side.length - 2], side[side.length - 1], point) <= 0) side.pop()
      side.push(point)
    }
    return side.slice(0, -1)
  }
  const hull = [...chain(sorted), ...chain(sorted.reverse())]
  return Math.abs(hull.reduce((sum, [x, y], i) => {
    const [nextX, nextY] = hull[(i + 1) % hull.length]
    return sum + x * nextY - y * nextX
  }, 0)) / 2
}

// Sample the byte-quantized relief raster as the sheet paints it, at the 2x
// fixture resolution. A separate connected silhouette gets its own bounds and hull.
function contours(sheet: LayerOf<'cloudSheet'>) {
  const width = Math.floor(sheet.bounds.w * 2), height = Math.floor(sheet.bounds.h * 2)
  const mask = Uint8Array.from({ length: width * height }, (_, i) =>
    Number(sheetAlphaAt(sheet, (i % width + 0.5) / 2, (Math.floor(i / width) + 0.5) / 2) >= 0.25))
  const result = []
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] !== 1) continue
    const cells = [i], corners: Point[] = []
    let xMin = width, yMin = height, xMax = 0, yMax = 0
    mask[i] = 2
    for (let j = 0; j < cells.length; j++) {
      const index = cells[j], x = index % width, y = Math.floor(index / width)
      xMin = Math.min(x, xMin)
      xMax = Math.max(x + 1, xMax)
      yMin = Math.min(y, yMin)
      yMax = Math.max(y + 1, yMax)
      const adjacent = [x > 0 ? index - 1 : -1, x + 1 < width ? index + 1 : -1, index - width, index + width]
      let edge = false
      for (let direction = 0; direction < adjacent.length; direction++) {
        const next = adjacent[direction]
        if (next < 0 || next >= mask.length || mask[next] === 0) edge = true
        if (mask[next] !== 1) continue
        mask[next] = 2
        cells.push(next)
      }
      if (edge) corners.push([x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1])
    }
    result.push({ aspect: (yMax - yMin) / (xMax - xMin), convexity: cells.length / hullArea(corners) })
  }
  return result
}

it.each(['ac', 'cu'] as const)('keeps the painted %s components broad and convex from low sky to 60 degrees', genus => {
  const [lattice, heightKm, radius, thickness, kappa] = genus === 'ac'
    ? ['mid', 5, 1.5, 0.4, 15] as const : ['low', 1.4, 0.45, 0.36, 30] as const
  const geom = skyGeom(world, box)
  const layer: FieldLayer = {
    lattice, baseKm: heightKm - thickness / 2, meanVKm: thickness, kappa, cover: 0.25, Q: 1, g: 1,
    // A mixed low layer can contain isolated Cu among Sc and uses the cellular ray grid.
    floorTau: 0, form: { conv: 0, strat: lattice === 'low' ? 0.55 : 0, sheet: 0, veil: 0 }, d: [0, 0], vel: [0, 0],
  }
  const physical = layerSnapshot({ placeId: 'contour', t: 960, layers: [layer] }, lattice, 0, 0, 100)
  for (const elevation of [10, 15, 20, 35, 45, 55, 60]) {
    const cell: FieldCell = {
      genus, lattice, id: 47, seed: 47, x: 0, y: -groundRangeAt(heightKm, elevation), r: radius,
      baseKm: layer.baseKm, vKm: thickness, tau0: kappa * thickness, rainWeight: 0, share: 1, rank: 0,
    }
    const depth = (x: number, y: number) => cellTauAt(cell, x, y)
    const snapshot = { ...physical, cells: [cell], densityGrid: {
      ...physical.densityGrid, tauAt: depth, resolvedTauAt: depth, expectedTauAt: () => 0,
    } }
    const shapes = contours(cloudSheetOf(world, geom, snapshot, neutral)!)
    expect(shapes, String(elevation)).toHaveLength(1)
    for (const shape of shapes) {
      expect(shape.aspect, String(elevation)).toBeLessThanOrEqual(1)
      expect(shape.convexity, String(elevation)).toBeGreaterThanOrEqual(0.8)
    }
  }
})
