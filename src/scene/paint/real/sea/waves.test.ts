import { describe, expect, it } from 'vitest'
import type { Streak } from '../../../model/types'
import type { Ctx2D } from '../../shared/base/hand'
import { layWaves, type Water } from './waves'

const water: Water = { top: 100, bottom: 160, long: [18, 6] }
const ripples: Streak[] = Array.from({ length: 60 }, (_, i) => ({ x: 10 + i * 37 % 300, y: 101 + i % 58, w: 2, alpha: 0.1 }))

/** Every wave's box, as traced. */
function laid(on: Water, streaks = ripples, strength = 5) {
  const boxes: { x: number; y: number; w: number }[] = [], alphas: number[] = []
  let at = [0, 0]
  const ctx = {
    beginPath() {}, moveTo: (x: number, y: number) => { at = [x, y] },
    quadraticCurveTo: (_cx: number, _cy: number, x: number) => { if (x > at[0]) boxes.push({ x: at[0], y: at[1], w: x - at[0] }) },
    fill() { alphas.push(Number(/([\d.]+)\)$/.exec(this.fillStyle)?.[1])) }, fillStyle: '',
  }
  layWaves(ctx as unknown as Ctx2D, on, streaks, [1, 1, 1], [[0, 0, 0], 1], 0.5, strength)
  return { boxes, alphas }
}

describe('waves', () => {
  it('are a mirror without the wind\'s strokes', () => {
    expect(laid(water, []).boxes).toEqual([])
  })

  it('stay on the water and out of the labels\' boxes', () => {
    const label = { x: 80, y: 120, w: 90, h: 14 }, open = laid(water).boxes, kept = laid({ ...water, clear: [label] }).boxes
    const under = (b: { x: number; y: number; w: number }) => b.x < label.x + label.w && b.x + b.w > label.x && b.y > label.y && b.y < label.y + label.h
    expect(open.every((b) => b.y >= water.top)).toBe(true)
    expect(open.some(under)).toBe(true)
    expect(kept.some(under)).toBe(false)
  })

  it('are long and whole far off, short and broken near', () => {
    const mean = (y: number) => {
      const { boxes } = laid(water, ripples.map((s) => ({ ...s, y })))
      return boxes.reduce((sum, b) => sum + b.w, 0) / boxes.length
    }
    expect(mean(106)).toBeGreaterThan(3 * mean(156))
  })

  it('never cover the water whole, however strong', () => {
    expect(Math.max(...laid(water, ripples, 50).alphas)).toBeLessThanOrEqual(0.75)
  })
})
