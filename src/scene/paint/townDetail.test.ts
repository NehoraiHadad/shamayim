import { expect, it } from 'vitest'
import type { RGB } from '../../world/types'
import { detailOf, melted, neighbourhood, sidesOf, softEdge } from './townDetail'

const faces = { left: [.9, .8, .6] as RGB, front: [.5, .5, .5] as RGB, right: [.2, .2, .3] as RGB }
const SHARE = .26
const mean = (f: typeof faces) => [0, 1, 2].map((i) => SHARE * (f.left[i] + f.right[i]) + (1 - 2 * SHARE) * f.front[i])

it('melts a body into its own mean', () => {
  for (const sides of [0, .3, 1]) {
    const m = mean(melted(faces, SHARE, sides, 0))
    mean(faces).forEach((c, i) => expect(m[i]).toBeCloseTo(c, 9))
  }
})

it('draws a near body whole and crisp', () => {
  const near = melted(faces, SHARE, sidesOf(5), .8)
  for (const k of ['left', 'front', 'right'] as const) faces[k].forEach((c, i) => expect(near[k][i]).toBeCloseTo(c, 9))
  expect(softEdge(detailOf(2.4), 5)).toBeCloseTo(0, 9)
})

it('comes up with size without a step', () => {
  for (let px = .3; px < 3; px += .01) expect(Math.abs(detailOf(px + .01) - detailOf(px))).toBeLessThan(.02)
  for (let x = 0; x < 375; x += .1) {
    expect(Math.abs(neighbourhood(x + .1, 40).tint - neighbourhood(x, 40).tint)).toBeLessThan(.05)
    expect(Math.abs(neighbourhood(x + .1, 40).flank - neighbourhood(x, 40).flank)).toBeLessThan(.1)
  }
})
