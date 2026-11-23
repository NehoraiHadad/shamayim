import { expect, it } from 'vitest'
import { greedyPairs, handover, HALF_WINDOW } from '../../world/field/handover'
import { altitudeOf, groundRangeAt } from '../../world/field/project'
import { outlineOf } from './cloudSheetOutline'
import { seenDepth } from './cloudSheetSeen'
import { alpha, cellAt, geom, HEIGHT } from './cloudSheetSeen.test-helper'
import { DOME_ALT } from './sky'

it('leaves the whole straddling disc intact, including rows above the join', () => {
  const cell = cellAt(25, 2.1)
  const range = groundRangeAt(HEIGHT, DOME_ALT)
  expect(cell.y - cell.r).toBeLessThan(range)
  expect(cell.y + cell.r).toBeGreaterThan(range)
  expect(seenDepth([cell], HEIGHT, geom)).toBeNull()
})
it('conserves footprint area across 120 seeded outlines', () => {
  for (let seed = 0; seed < 120; seed++) {
    const outline = outlineOf(seed)
    const area = outline.reduce((sum, radiusInverse2) => sum + 1 / radiusInverse2, 0) / outline.length
    expect(Math.abs(area - 1)).toBeLessThan(0.01)
  }
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
  const elevations = new Set<number>()
  for (let az = -125; az < 125; az++) {
    const rim = rows.find(row => alpha(cell, row.range, az, row.correction) > 0.5)
    expect(rim).toBeDefined()
    elevations.add(rim!.alt)
  }
  expect(elevations.size).toBeGreaterThan(1)
})


it.each([20, 40, 60])('fades in without a step beyond the round rim at %s km/h', speed => {
  const cell = cellAt(DOME_ALT, 1.5)
  const entry = groundRangeAt(HEIGHT, DOME_ALT) - cell.r
  const at = (minute: number, shaped: boolean) => {
    const moved = { ...cell, y: entry - minute * speed / 60 }
    const seen = shaped ? seenDepth([moved], HEIGHT, geom) : null
    return Array.from({ length: 91 }, (_, i) => {
      const range = entry - cell.r + (4 * cell.r * i) / 90
      return alpha(moved, range, 3, seen?.(range, altitudeOf(HEIGHT, range)))
    })
  }
  expect(at(0, true)).toEqual(at(0, false))
  const old = at(-1, false)
  const next = at(0, false)
  const referenceStep = Math.max(...next.map((value, i) => Math.abs(value - old[i])))
  // At the first minute within the dome, the added change must be smaller
  // than the round rim's own motion over that same minute at this wind.
  const round = at(1, false)
  const shaped = at(1, true)
  expect(Math.max(...shaped.map((value, i) => Math.abs(value - round[i])))).toBeLessThan(referenceStep)
})

it('interpolates outline identity across a real matched midnight handover', () => {
  const outgoing = cellAt(85, 2.4)
  const incoming = { ...outgoing, id: 72, seed: 72 }
  const pairs = greedyPairs([outgoing], [incoming], outgoing.r)
  expect(pairs.get(outgoing.id)).toBe(incoming.id)
  const range = groundRangeAt(HEIGHT, 40)
  const row = (cell: typeof outgoing, shaped: boolean) => {
    const correction = shaped ? seenDepth([cell], HEIGHT, geom)?.(range, 40) : null
    return Array.from({ length: 251 }, (_, i) => alpha(cell, range, i - 125, correction))
  }
  const start = row(outgoing, true), end = row(incoming, true)
  let previous = start
  let roundPrevious = row(outgoing, false)
  const identityChange = Math.max(...end.map((value, i) => Math.abs(value - start[i])))
  expect(identityChange).toBeGreaterThan(0)
  for (let minute = -HALF_WINDOW; minute <= HALF_WINDOW; minute++) {
    const [cell] = minute === HALF_WINDOW ? [incoming] : handover([outgoing], [incoming], pairs, 1, 0.46, minute)
    const current = row(cell, true), round = row(cell, false)
    for (let i = 0; i < current.length; i++) {
      // A minute cannot switch the full seed silhouette in one step.
      expect(Math.abs(current[i] - previous[i])).toBeLessThan(
        Math.abs(round[i] - roundPrevious[i]) + identityChange,
      )
    }
    previous = current
    roundPrevious = round
  }
  expect(previous).toEqual(end)
})

it.each([-1, 1])('matches point depths with bounded columns across the seam, direction %i', handed => {
  const cell = cellAt(42, 0.5)
  const seen = seenDepth([cell], HEIGHT, geom)!
  const tau = new Float64Array(96)
  const first = 2 * Math.PI - handed * Math.PI / 2, step = handed * Math.PI / 48
  const bearings = Array.from(tau, (_, i) => first + step * i)
  const east = bearings.map(Math.sin), north = bearings.map(Math.cos)
  for (const elevation of [30, 37, 42, 48, 60, 90]) {
    const range = groundRangeAt(HEIGHT, elevation), direct = seen(range, elevation)
    seen.row(range, elevation, { first, step, east, north }, tau)
    for (let i = 0; i < tau.length; i++) {
      expect(tau[i]).toBeCloseTo(direct?.(range * east[i], range * north[i]) ?? 0, 10)
    }
  }
})
