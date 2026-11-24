import { describe, expect, it } from 'vitest'
import type { RGB } from '../../model/types'
import type { ReceiverBrush } from '../shared/land/receiverBrush'
import { BODY, foliage, TOPS, UNDER } from './foliage'

const GREEN: RGB = [0.3, 0.4, 0.2], DUSK: RGB = [0.1, 0.1, 0.2]
const AT = { x: 50, y: 20, rx: 6, ry: 5 }

/** The points of a crown's three layers, in the order laid. */
function crown(ink: RGB, seed: number): number[][][] {
  const layers: number[][][] = []
  const brush = {
    path: () => {
      const points: number[][] = []
      layers.push(points)
      return { moveTo: (...p: number[]) => points.push(p), lineTo: (...p: number[]) => points.push(p), closePath() {} }
    },
    fill() {},
  } as unknown as ReceiverBrush
  const layer = foliage(brush, AT, seed)
  for (const form of [UNDER, BODY, TOPS]) layer([ink], 1, form)
  return layers
}

describe('foliage', () => {
  it('keeps its form while the light changes, and gives each tree its own', () => {
    expect(crown(DUSK, 7)).toEqual(crown(GREEN, 7))
    expect(crown(GREEN, 8)).not.toEqual(crown(GREEN, 7))
  })

  it('stays about its crown, its lit tops above its middle', () => {
    for (let seed = 1; seed < 30; seed++) {
      const [under, , tops] = crown(GREEN, seed)
      expect(under.every(([x, y]) => Math.abs(x - AT.x) < AT.rx * 1.5 && Math.abs(y - AT.y) < AT.ry * 1.5)).toBe(true)
      expect(tops.reduce((sum, [, y]) => sum + y, 0) / tops.length).toBeLessThan(AT.y)
    }
  })
})
