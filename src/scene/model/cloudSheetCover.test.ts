import { expect, it } from 'vitest'
import { cellsAround } from '../../world/field/cells'
import { altitudeOf, groundRangeAt } from '../../world/field/project'
import { kernel } from '../../world/field/rasterNodes'
import type { CloudField } from '../../world/field/types'
import { sheetOpacity, sheetPathFactor } from './cloudSheetMath'
import { seenDepth } from './cloudSheetSeen'
import { geom, RAD } from './cloudSheetSeen.test-helper'
import { DOME_ALT } from './sky'

it.each([
  ['mid', 0.28], ['mid', 0.46], ['mid', 0.75],
  ['low', 0.28], ['low', 0.46], ['low', 0.75],
] as const)('preserves cover and mean opacity across 120 drawn %s fields at %s cover', (lattice, cover) => {
  const baseKm = lattice === 'mid' ? 3.7 : 1.1
  const field: CloudField = { placeId: '', t: 960, layers: [{
    lattice, baseKm, meanVKm: 0.6, cover, Q: 0.95, g: 1,
    floorTau: 0, kappa: 5, form: { conv: 0, strat: 0, sheet: 0, veil: 0 }, d: [0, 0], vel: [0, 0],
  }] }
  const height = baseKm + 0.3
  let roundCover = 0, shapedCover = 0, roundSky = 0, shapedSky = 0, count = 0
  for (let i = 0; i < 120; i++) {
    const cells = cellsAround({ ...field, placeId: `cover-${i}` }, lattice, 0, 0, 18)
    const seen = seenDepth(cells, height, geom)
    const edge = groundRangeAt(height, 23)
    for (let j = 0; j < 24; j++) {
      // Sample equal ground areas for cover, and equal screen rows for mean alpha.
      const y = geom.dome(23) + (geom.dome(90) - geom.dome(23)) * (j + 0.5) / 24
      const alt = DOME_ALT + 68 * ((307 - y) / 289) ** (1 / 0.85)
      const skyRange = groundRangeAt(height, alt)
      const groundRange = edge * Math.sqrt((j + 0.5) / 24)
      const measure = (range: number, altitude: number, isCover: boolean) => {
        const correction = seen?.(range, altitude)
        const slant = sheetPathFactor(baseKm, 0.6, altitude, Infinity)
        for (let k = -12; k <= 12; k++) {
          const az = k * 10 * RAD, x = range * Math.sin(az), y = range * Math.cos(az)
          const round = cells.reduce((sum, cell) => sum + kernel(cell.tau0,
            ((x - cell.x) ** 2 + (y - cell.y) ** 2) / cell.r ** 2, cell.genus === 'cu'), 0)
          const shaped = Math.max(0, round + (correction?.(x, y) ?? 0))
          // Use the same optical-depth threshold as the equal-area sheet cover test.
          if (isCover) {
            roundCover += Number(round > 0.05)
            shapedCover += Number(shaped > 0.05)
          } else {
            roundSky += sheetOpacity(round, slant)
            shapedSky += sheetOpacity(shaped, slant)
          }
        }
      }
      measure(groundRange, altitudeOf(height, groundRange), true)
      measure(skyRange, alt, false)
      count += 25
    }
  }
  expect.soft(Math.abs(shapedCover - roundCover) / count).toBeLessThanOrEqual(0.02)
  expect.soft(Math.abs(shapedSky - roundSky) / count).toBeLessThan(0.02)
})
