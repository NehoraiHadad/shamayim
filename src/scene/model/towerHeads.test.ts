import { expect, it } from 'vitest'
import { crownAt, halfAt, headsOf } from './towerHeads'

const W = 100, SEEDS = Array.from({ length: 40 }, (_, i) => 7919 * (i + 1))

/** How far left and right the heads reach at a height, as they are painted; both 0 over the top. */
function outline(seed: number, tall: number, anvil: number, y: number) {
  let left = 0, right = 0
  for (const head of headsOf({ seed, w: W, tall, anvil })) {
    const crown = crownAt(head, y)
    if (crown >= 1) continue
    const half = halfAt(head, y) * Math.sqrt(1 - crown * crown)
    left = Math.min(left, head.x - half)
    right = Math.max(right, head.x + half)
  }
  return [left, right]
}

it('spreads an anvil and its overshooting top out of the column with no step', () => {
  for (const seed of SEEDS) for (const up of [0.2, 0.4, 0.6, 0.75, 0.9]) {
    let before = outline(seed, 1.6 * W, 0, -up * 1.6 * W)
    for (let anvil = 0.0025; anvil <= 1; anvil += 0.0025) {
      const now = outline(seed, 1.6 * W, anvil, -up * 1.6 * W)
      for (const side of [0, 1]) expect.soft(Math.abs(now[side] - before[side]), `${seed} ${up} ${anvil}`).toBeLessThanOrEqual(0.05 * W)
      before = now
    }
  }
})

it('crowns a tower with no anvil no wider than the shoulder under it', () => {
  for (const seed of SEEDS) for (const tall of [0.6, 1.1, 1.35, 1.6]) {
    const wide = (up: number) => {
      const [left, right] = outline(seed, tall * W, 0, -up * tall * W)
      return right - left
    }
    for (let up = 0.3; up < 1; up += 0.02) expect.soft(wide(up), `${seed} ${tall} ${up}`).toBeLessThanOrEqual(wide(up - 0.02) + 1e-9)
  }
})
