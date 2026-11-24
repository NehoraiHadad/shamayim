import { expect, it } from 'vitest'
import { frame } from '../../test/cloudSheetFrame'
import { loneCell } from '../../test/loneCell'
import { cellTauAt } from '../../world/field/footprint'
import { groundRangeAt } from '../../world/field/project'
import { seenDepth } from './cloudSheetSeen'

const RAD = Math.PI / 180, HEIGHT_KM = 5, TAU = 15
const { geom } = frame('step', '2026-11-17T12:00')

/** The depths a lone cell shows over a patch of the sky about it, its base at `elevation`, `r` km wide. */
function patch(elevation: number, r: number) {
  const d = groundRangeAt(HEIGHT_KM, elevation)
  const snapshot = loneCell('ac', 0, d, r, 0.4, HEIGHT_KM)
  const seen = seenDepth('step', 960, snapshot, geom, (x, y) => cellTauAt(snapshot.cells[0], x, y))
  const depths = []
  for (let up = -6; up <= 6; up += 0.5) {
    const altitude = elevation + up, range = groundRangeAt(HEIGHT_KM, altitude), read = seen(range, altitude)
    for (let across = -12; across <= 12; across++) depths.push(read(range * Math.sin(across * RAD), range * Math.cos(across * RAD)))
  }
  return depths
}

/** The largest step of any place's depth (a share of the cell's) between neighbours of a run of fine steps. */
function largest(steps: number[][]) {
  let most = 0
  for (let i = 1; i < steps.length; i++) for (const [k, depth] of steps[i].entries()) most = Math.max(most, Math.abs(depth - steps[i - 1][k]))
  return most / TAU
}

it('takes a growing cell into the eye\'s proportions with no step', () => {
  for (const elevation of [24, 28, 40]) {
    const run = Array.from({ length: 1600 }, (_, i) => patch(elevation, 0.2 + i * 0.000375))
    const step = largest(run)
    console.info('growing', elevation, step)
    expect.soft(step).toBeLessThanOrEqual(0.012)
  }
})

it('takes a cell drifting in across the dome\'s join into them with no step', () => {
  for (const r of [0.5, 1.4]) {
    const step = largest(Array.from({ length: 1200 }, (_, i) => patch(12 + i * 0.015, r)))
    console.info('drifting', r, step)
    expect.soft(step).toBeLessThanOrEqual(0.015)
  }
})
