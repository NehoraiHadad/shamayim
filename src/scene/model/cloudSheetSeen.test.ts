import { expect, it } from 'vitest'
import { cellsAround } from '../../world/field/cells'
import { greedyPairs, handover, HALF_WINDOW } from '../../world/field/handover'
import { altitudeOf, groundRangeAt } from '../../world/field/project'
import { kernel } from '../../world/field/rasterNodes'
import type { CloudField, FieldCell } from '../../world/field/types'
import { sheetOpacity, sheetPathFactor } from './cloudSheetMath'
import { outlineOf, seenDepth } from './cloudSheetSeen'
import { DOME_ALT, type SkyGeom } from './sky'

const RAD = Math.PI / 180
const HEIGHT = 2
// Portrait dome and azimuth scale from the diagnosis. Only the dome and span enter the correction.
const geom = {
  azimuthRange: { period: 540, min: 0 },
  dome: (alt: number) => alt <= DOME_ALT ? 340 - 1.5 * alt
    : 307 - 289 * ((alt - DOME_ALT) / (90 - DOME_ALT)) ** 0.85,
} as SkyGeom
const cellAt = (alt: number, r: number, seed = 47): FieldCell => ({
  id: seed, seed, x: 0, y: groundRangeAt(HEIGHT, alt), r, lattice: 'mid', genus: 'ac',
  baseKm: HEIGHT - 0.2 * r, vKm: 0.4 * r, tau0: 7, share: 1, rainWeight: 0, rank: 0,
})

function alpha(cell: FieldCell, range: number, az: number, delta?: ((x: number, y: number) => number) | null) {
  const x = range * Math.sin(az * RAD), y = range * Math.cos(az * RAD)
  const round = kernel(cell.tau0, ((x - cell.x) ** 2 + (y - cell.y) ** 2) / cell.r ** 2, false)
  return 1 - Math.exp(-Math.max(0, round + (delta?.(x, y) ?? 0)))
}

it.each([25, 30, 40, 50, 60])('keeps an isolated altocumulus patch broad at %i degrees', centre => {
  const cell = cellAt(centre, 0.2)
  const seen = seenDepth([cell], HEIGHT, geom)
  const bounds = () => ({ left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity })
  const round = bounds(), shaped = bounds()
  const add = (box: ReturnType<typeof bounds>, az: number, y: number) => {
    box.left = Math.min(box.left, az)
    box.right = Math.max(box.right, az)
    box.top = Math.min(box.top, y)
    box.bottom = Math.max(box.bottom, y)
  }
  for (let alt = 22; alt <= 72; alt += 0.1) {
    const range = groundRangeAt(HEIGHT, alt), y = geom.dome(alt)
    const delta = seen?.(range, alt)
    for (let az = -35; az <= 35; az += 0.1) {
      if (alpha(cell, range, az) > 0.5) add(round, az, y)
      if (alpha(cell, range, az, delta) > 0.5) add(shaped, az, y)
    }
  }
  const aspect = ({ left, right, top, bottom }: ReturnType<typeof bounds>) => (bottom - top) / (1.5 * (right - left))
  const before = aspect(round), after = aspect(shaped)
  console.log(JSON.stringify({ altitude: centre, acAspect: [before, after] }))
  expect(before).toBeGreaterThan(1.05)
  expect(Number.isFinite(after) && after > 0).toBe(true)
  expect(after).toBeLessThanOrEqual(1.05)
})

it('uses the exact round depth on the relief', () => {
  const range = groundRangeAt(HEIGHT, 20)
  const below = cellAt(17, 0.2)
  const crossing = cellAt(24, 1)
  expect(seenDepth([below], HEIGHT, geom)).toBeNull()
  const correction = seenDepth([crossing], HEIGHT, geom)?.(range, 20)
  const before = Float32Array.from({ length: 120 }, (_, i) => alpha(crossing, range, i - 60))
  const after = Float32Array.from({ length: 120 }, (_, i) => alpha(crossing, range, i - 60, correction))
  expect(after).toEqual(before)
})

it('conserves footprint area across 120 seeded outlines before overlap compensation', () => {
  for (let seed = 0; seed < 120; seed++) {
    const outline = outlineOf(seed, 1)
    const area = outline.reduce((sum, radiusInverse2) => sum + 1 / radiusInverse2, 0) / outline.length
    expect(Math.abs(area - 1)).toBeLessThan(0.01)
  }
})

it('preserves ensemble cover and mean opacity across 120 drawn mid-level fields', () => {
  const field: CloudField = { placeId: '', t: 960, layers: [{
    lattice: 'mid', baseKm: 3.7, meanVKm: 0.6, cover: 0.46, Q: 0.95, g: 1,
    floorTau: 0, kappa: 5, form: { conv: 0, strat: 0, sheet: 0, veil: 0 }, d: [0, 0], vel: [0, 0],
  }] }
  const height = 4
  let roundCover = 0, shapedCover = 0, roundSky = 0, shapedSky = 0, count = 0
  for (let i = 0; i < 120; i++) {
    const cells = cellsAround({ ...field, placeId: `cover-${i}` }, 'mid', 0, 0, 18)
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
        const slant = sheetPathFactor(3.7, 0.6, altitude, Infinity)
        for (let k = -12; k <= 12; k++) {
          const az = k * 10 * RAD, x = range * Math.sin(az), y = range * Math.cos(az)
          const round = cells.reduce((sum, cell) => sum + kernel(cell.tau0,
            ((x - cell.x) ** 2 + (y - cell.y) ** 2) / cell.r ** 2, false), 0)
          const shaped = Math.max(0, round + (correction?.(x, y) ?? 0))
          // Ignore round-off when subtracting an original kernel from the field sum.
          if (isCover) {
            roundCover += Number(round > 1e-6)
            shapedCover += Number(shaped > 1e-6)
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
  console.log(JSON.stringify({ groundCover: [roundCover / count, shapedCover / count],
    skyAlpha: [roundSky / count, shapedSky / count] }))
  expect.soft(Math.abs(shapedCover - roundCover) / count).toBeLessThan(0.01)
  expect.soft(Math.abs(shapedSky - roundSky) / count).toBeLessThan(0.02)
})

it('breaks a level overhead rim into shorter runs', () => {
  // A zenith-centred round footprint has the same rim altitude at every azimuth.
  const cell = cellAt(90, 2.4)
  const seen = seenDepth([cell], HEIGHT, geom)
  const rows = Array.from({ length: 481 }, (_, i) => {
    const alt = 23 + i / 10
    const range = groundRangeAt(HEIGHT, alt)
    return { alt, range, correction: seen?.(range, alt) }
  })
  let longest = 0, run = 0, previous = -Infinity
  for (let az = -125; az < 125; az++) {
    const rim = rows.find(row => alpha(cell, row.range, az, row.correction) > 0.5)
    expect(rim).toBeDefined()
    const y = Math.round(geom.dome(rim!.alt))
    run = y === previous ? run + 1 : 1
    longest = Math.max(longest, run)
    previous = y
  }
  console.log(JSON.stringify({ overheadLongestRun: [250, longest] }))
  expect(longest).toBeLessThan(250 / 4)
})

it('limits the alpha step as a drifting cell enters the dome', () => {
  const cell = cellAt(DOME_ALT, 0.32)
  const atEntry = cell.y + cell.r
  const positions = Array.from({ length: 25 }, (_, i) => {
    // 0.36 km/h drift resolves the sharp rim at one-minute intervals.
    const x = 0, y = atEntry - (i - 12) * 0.006
    const moved = { ...cell, x, y }
    const seen = seenDepth([moved], HEIGHT, geom)
    return Array.from({ length: 90 }, (_, j) => {
      const range = atEntry - cell.r + (j - 45) / 100
      const alt = altitudeOf(HEIGHT, range)
      return alpha(moved, range, 1.5, seen?.(range, alt))
    })
  })
  let maxStep = 0
  for (let i = 1; i < positions.length; i++) {
    const step = Math.max(...positions[i].map((value, j) => Math.abs(value - positions[i - 1][j])))
    maxStep = Math.max(maxStep, step)
  }
  console.log(JSON.stringify({ domeMaxAlphaStep: maxStep }))
  expect(maxStep).toBeLessThan(0.5)
})

it('limits the alpha step through the complete midnight handover of a matched cell', () => {
  const outgoing = cellAt(85, 2.4)
  const incoming = { ...outgoing, id: 72, seed: 72 }
  const pairs = greedyPairs([outgoing], [incoming], outgoing.r)
  expect(pairs.get(outgoing.id)).toBe(incoming.id)
  let first: number[] | undefined, previous: number[] | undefined
  let maxStep = 0
  for (let minute = -HALF_WINDOW; minute <= HALF_WINDOW; minute++) {
    const cells = minute === HALF_WINDOW ? [incoming] : handover([outgoing], [incoming], pairs, 1, 0.46, minute)
    const seen = seenDepth(cells, HEIGHT, geom)
    const alt = 40
    const range = groundRangeAt(HEIGHT, alt), correction = seen?.(range, alt)
    const row = Array.from({ length: 251 }, (_, i) => alpha(cells[0], range, i - 125, correction))
    first ??= row
    if (previous) {
      const last = previous
      maxStep = Math.max(maxStep, ...row.map((value, i) => Math.abs(value - last[i])))
    }
    previous = row
  }
  const endChange = Math.max(...previous!.map((value, i) => Math.abs(value - first![i])))
  console.log(JSON.stringify({ midnightMaxAlphaStep: maxStep, midnightTotalAlphaChange: endChange }))
  expect(endChange).toBeGreaterThan(0.35)
  expect(maxStep).toBeLessThan(0.35)
})
