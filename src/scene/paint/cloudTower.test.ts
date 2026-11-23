import { describe, expect, it } from 'vitest'
import type { CloudSprite } from './cloudSprite'
import { paintTower } from './cloudTower'
import type { Ctx2D, PaintEnv } from './hand'

/** The raster a tower is drawn as, read off a recording scratch surface: pixels, and where its rows stand (sprite px). */
function rasterOf(sprite: CloudSprite) {
  let w = 0, h = 0, data = new Uint8ClampedArray(), drawn = { y: 0, h: 1 }
  const env = { scale: 1, canvas: (cw: number, ch: number) => ({ canvas: {}, ctx: {
    createImageData: () => ({ data: (data = new Uint8ClampedArray(cw * ch * 4)) }),
    putImageData() { w = cw; h = ch },
  } }) } as unknown as PaintEnv
  const ctx = { save() {}, restore() {}, globalAlpha: 1,
    drawImage: (_c: unknown, _x: number, y: number, _w: number, dh: number) => { drawn = { y, h: dh } } } as unknown as Ctx2D
  paintTower(ctx, sprite, 0, 0, env)
  const alpha = (i: number, j: number) => data[(j * w + i) * 4 + 3] / 255
  const row = (j: number) => Array.from({ length: w }, (_, i) => alpha(i, j))
  /** Each row's height (sprite px, up from the near base edge) and its alphas. */
  const rows = Array.from({ length: h }, (_, j) => ({ up: -(drawn.y + ((j + 0.5) / h) * drawn.h), a: row(j), j }))
  const red = (i: number, j: number) => data[(j * w + i) * 4]
  return { w, rows, red }
}

const cb = { genus: 'cb', w: 40, tall: 110, under: 8, lean: 0, tau: 30, share: 1, seed: 7, anvil: 1,
  body: [0.8, 0.8, 0.8], shade: [0.3, 0.3, 0.3], lit: [1, 1, 1], litA: 0, silver: 0, glow: 0 } as unknown as CloudSprite
const cloudy = (a: readonly number[]) => a.filter((v) => v > 0.5).length

/** How many runs of cloud a row holds. */
const runs = (a: readonly number[]) => a.filter((v, i) => v > 0.5 && !((a[i - 1] ?? 0) > 0.5)).length

/** Rows of cloud pieces (4-connected, alpha over `floor`) that do not touch the largest one: their pixels' share. */
function detachedShare({ w, rows }: ReturnType<typeof rasterOf>, floor: number) {
  const on = rows.flatMap((r) => r.a.map((v) => v > floor))
  const seen = new Uint8Array(on.length), sizes: number[] = []
  for (let start = 0; start < on.length; start++) {
    if (!on[start] || seen[start]) continue
    const stack = [start]
    let size = 0
    seen[start] = 1
    while (stack.length) {
      const n = stack.pop()!
      size++
      for (const m of [n - w, n + w, n % w ? n - 1 : -1, n % w < w - 1 ? n + 1 : -1]) {
        if (m >= 0 && m < on.length && on[m] && !seen[m]) { seen[m] = 1; stack.push(m) }
      }
    }
    sizes.push(size)
  }
  return 1 - Math.max(...sizes) / sizes.reduce((s, n) => s + n, 0)
}

describe('a tower is one mass', () => {
  const shapes = [
    { ...cb, anvil: 0, w: 30, tall: 125 }, // the narrow near column of haifa 17:00
    { ...cb, anvil: 1, w: 100, tall: 160 }, // a wide mature Cb
    { ...cb, anvil: 0, w: 130, tall: 130 }, // the squat heap of haifa 14:00
    { ...cb, anvil: 0, w: 15, tall: 40 }, // a small one on the horizon
  ]
  it.each(shapes)('w $w tall $tall: no beads up the column and no blob beside it, whatever the seed', (shape) => {
    for (let seed = 1; seed <= 40; seed++) {
      const raster = rasterOf({ ...shape, seed: seed * 7919 } as CloudSprite)
      // The foot melts into the rain and the haze: the column is counted above it.
      const foot = 0.4
      // Every row of the column holds cloud at least a third of the base wide: never a neck between two beads.
      for (const r of raster.rows) {
        if (r.up > foot * shape.tall && r.up < 0.7 * shape.tall) expect(cloudy(r.a) / raster.rows[0].a.length).toBeGreaterThan(0.1)
      }
      expect(detachedShare(raster, 0.2)).toBeLessThan(0.02)
      // A lumpy outline may fold over itself in a few rows; it does not break up.
      const body = raster.rows.filter((r) => r.up > 0 && r.up < 0.7 * shape.tall)
      expect(body.filter((r) => runs(r.a) > 1).length / body.length).toBeLessThan(0.25)
    }
  })
})

it('flares a mature Cb up into its anvil, with no narrow neck under the cap', () => {
  const { rows } = rasterOf(cb)
  const reach = (from: number, to: number) => Math.max(...rows
    .filter((r) => r.up >= from * cb.tall && r.up < to * cb.tall).map((r) => cloudy(r.a)))
  const cap = reach(0.85, 1.2), neck = reach(0.6, 0.85), waist = reach(0.2, 0.5)
  expect(cap).toBeGreaterThan(waist)
  expect(neck).toBeGreaterThan(0.75 * cap)
})

it('keeps the base of a sunlit tower in its own shade, under the light on its side', () => {
  const { w, rows, red } = rasterOf({ ...cb, anvil: 0, litA: 0.9, toward: [1, 0] } as CloudSprite)
  const toneAt = (up: number) => red(Math.floor(w / 2) + 4, rows.reduce((a, b) =>
    Math.abs(b.up - up) < Math.abs(a.up - up) ? b : a).j)
  expect(toneAt(-4)).toBeLessThan(0.45 * 255)
  expect(toneAt(0.6 * cb.tall)).toBeGreaterThan(0.75 * 255)
})

it('lumps the crown softly: an uneven outline, but no balloon standing out of it', () => {
  const sprite = { ...cb, genus: 'cg', anvil: 0, tall: 80, w: 60 } as CloudSprite
  const { w, rows } = rasterOf(sprite)
  // The outline's height, column by column over the middle half of the crown.
  const tops = Array.from({ length: Math.floor(w * 0.3) }, (_, n) => n + Math.floor(w * 0.35))
    .map((i) => Math.max(...rows.filter((r) => r.a[i] > 0.5).map((r) => r.up)))
  const steps = tops.slice(1).map((t, i) => Math.abs(t - tops[i]))
  expect(Math.max(...tops) - Math.min(...tops)).toBeGreaterThan(1)
  expect(Math.max(...steps)).toBeLessThan(0.2 * sprite.tall)
})
