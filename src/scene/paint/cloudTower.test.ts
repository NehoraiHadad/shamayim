import { expect, it } from 'vitest'
import type { CloudSprite } from './cloudSprite'
import { paintTower } from './cloudTower'
import type { Ctx2D, PaintEnv } from './hand'

/* The puffs a tower is built of, read off a recording context: each puff translates to its centre, then fills a radial
 * gradient of its radius. */
function puffsOf(sprite: CloudSprite) {
  const puffs: { x: number; y: number; r: number }[] = []
  let at = [0, 0]
  const scratch = {
    setTransform() {}, save() {}, restore() {}, scale() {}, fill() {}, beginPath() {}, arc() {}, ellipse() {}, fillRect() {},
    translate: (x: number, y: number) => { at = [x, y] },
    createRadialGradient: (_x: number, _y: number, _r: number, _x1: number, _y1: number, r: number) => {
      puffs.push({ x: at[0], y: at[1], r })
      return { addColorStop() {} }
    },
    createLinearGradient: () => ({ addColorStop() {} }),
  }
  const ctx = { save() {}, restore() {}, drawImage() {}, globalAlpha: 1 } as unknown as Ctx2D
  const env = { scale: 1, canvas: () => ({ canvas: {}, ctx: scratch }) } as unknown as PaintEnv
  paintTower(ctx, sprite, 0, 0, env)
  return puffs
}

const cb = { genus: 'cb', w: 40, tall: 110, under: 8, tau: 30, share: 1, seed: 7, anvil: 1,
  body: [0.8, 0.8, 0.8], shade: [0.3, 0.3, 0.3], lit: [1, 1, 1], litA: 0, silver: 0, glow: 0 } as unknown as CloudSprite

it('flares a mature Cb up into its anvil, with no narrow neck under the cap', () => {
  const puffs = puffsOf(cb)
  const reach = (from: number, to: number) => Math.max(...puffs
    .filter((p) => -p.y >= from * cb.tall && -p.y < to * cb.tall).map((p) => Math.abs(p.x) + p.r))
  const cap = reach(0.85, 1.2), neck = reach(0.6, 0.85), waist = reach(0.2, 0.5)
  expect(cap).toBeGreaterThan(waist)
  expect(neck).toBeGreaterThan(0.75 * cap)
})
