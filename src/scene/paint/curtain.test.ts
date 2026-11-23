import { expect, it } from 'vitest'
import { curtain } from './curtain'
import type { Ctx2D } from './hand'

/* A curtain read off a recording context: each filled slab's width at the base, its alpha, and its gradient's peak. */
function slabsOf(alpha: number) {
  const slabs: { w: number; a: number; lean: number }[] = []
  const saved: number[] = []
  let xs: number[] = []
  const ctx = {
    globalAlpha: 1, fillStyle: null as unknown,
    save() { saved.push(ctx.globalAlpha) }, restore() { ctx.globalAlpha = saved.pop()! },
    beginPath() { xs = [] }, closePath() {},
    moveTo(x: number) { xs.push(x) }, lineTo(x: number) { xs.push(x) },
    createLinearGradient: () => {
      const g = { peak: 0, addColorStop: (_t: number, colour: string) => {
        const a = / \/ ([\d.]+)\)/.exec(colour)
        g.peak = Math.max(g.peak, a ? Number(a[1]) : 1)
      } }
      return g
    },
    fill() { slabs.push({ w: xs[1] - xs[0], a: ctx.globalAlpha * (ctx.fillStyle as { peak: number }).peak, lean: xs[2] - xs[1] }) },
  }
  curtain(ctx as unknown as Ctx2D, { x: 0, top: 0, bottom: 90, w: 110, lean: 50, rgb: [0.4, 0.45, 0.5], alpha, seed: 245934642 }, false)
  return slabs
}

it('is one soft mass: its body comes to the shaft alpha in the middle, in many faint copies', () => {
  const body = slabsOf(0.58).filter((s) => s.w > 30)
  const middle = 1 - body.reduce((through, s) => through * (1 - s.a), 1)
  expect(middle).toBeGreaterThan(0.5)
  expect(middle).toBeLessThan(0.8)
  // No copy shows its own edge.
  expect(Math.max(...body.map((s) => s.a))).toBeLessThan(0.12)
})

it('carries its fibres fainter than the body and no thinner than a soft band, so it does not read as streaks', () => {
  const fibres = slabsOf(0.58).filter((s) => s.w <= 30)
  expect(fibres.length).toBeGreaterThan(0)
  expect(Math.max(...fibres.map((s) => s.a))).toBeLessThan(0.1)
  expect(Math.min(...fibres.map((s) => s.w))).toBeGreaterThan(1)
})
