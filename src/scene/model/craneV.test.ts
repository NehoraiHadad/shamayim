import { expect, it } from 'vitest'
import { seeded } from '../../data/landmarks/hash'
import { seen } from './birdFlight'
import { craneV } from './craneV'

const SPAN = 4.4
const flocks = [9, 11, 18, 28].flatMap((count) => Array.from({ length: 40 }, (_, seed) => ({ count, seed })))
const laid = (count: number, seed: number, yaw: number) => craneV(count, SPAN, 1, yaw, 0.5, seeded(seed))

it('keeps every crane clear of the next: no two drawn closer than nine tenths of a span in the air', () => {
  for (const { count, seed } of flocks) {
    const birds = laid(count, seed, (seed / 40) * 2 * Math.PI)
    expect(birds).toHaveLength(count)
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const gap = Math.hypot(birds[i].x - birds[j].x, birds[i].z - birds[j].z)
        expect(gap, `flock of ${count} seed ${seed}: birds ${i}, ${j}`).toBeGreaterThan(0.9 * SPAN)
      }
    }
  }
})

it('lies as a V open 60–90°: two unequal arms behind one leader, whichever way it flies', () => {
  for (const { count, seed } of flocks) {
    const yaw = (seed / 40) * 2 * Math.PI, c = Math.cos(yaw), s = Math.sin(yaw)
    const local = laid(count, seed, yaw).map((b) => ({ u: b.x * c + b.z * s, v: -b.x * s + b.z * c }))
    const [lead, ...rest] = local
    for (const b of rest) expect(b.u).toBeLessThan(lead.u)
    const left = rest.filter((b) => b.v < lead.v), right = rest.filter((b) => b.v > lead.v)
    expect(left.length + right.length).toBe(count - 1)
    expect(Math.min(left.length, right.length)).toBeGreaterThanOrEqual(0.25 * (count - 1))
    const slope = rest.reduce((sum, b) => sum + Math.abs(b.v - lead.v) / (lead.u - b.u), 0) / rest.length
    const open = 2 * Math.atan(slope) * 180 / Math.PI
    expect(open).toBeGreaterThan(60)
    expect(open).toBeLessThan(90)
  }
})

it('reads as separate birds from below (30° up): few pairs closer than half a span on the screen', () => {
  let close = 0, pairs = 0
  for (const { count, seed } of flocks) {
    const at = laid(count, seed, (seed / 40) * 2 * Math.PI).map((b) => seen([b.x, b.y, b.z], 30))
    for (let i = 0; i < count; i++) {
      pairs++
      if (at.some((p, j) => j !== i && Math.hypot(p[0] - at[i][0], p[1] - at[i][1]) < 0.5 * SPAN)) close++
    }
  }
  expect(close / pairs).toBeLessThan(0.1)
})
