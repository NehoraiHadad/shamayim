import { expect, it } from 'vitest'
import { TEXEL } from '../../../model/planeBands'
import type { Lamp } from '../../../model/layers/lamp'
import type { LayerOf, PlaneLitField, Pt, RGB } from '../../../model/types'
import { EMPTY_VEGETATION } from '../../../model/vegDescriptor'
import { HAND, type Ctx2D, type PaintEnv } from '../../shared/base/hand'
import { paintPlaneLight } from '../../shared/land/planeLight'
import { paintRealPlane } from './plane'

const W = 180, H = 90, COLS = W / TEXEL
const outline: Pt[] = [[0, 6], [W, 6], [W, H], [0, H]]
const field = (sun: number, haze = 0): PlaneLitField => ({
  cols: 1, rows: 1, grid: new Uint8Array([110, 0, 200, haze]),
  eSun: [1.5 * sun, 1.3 * sun, 1.1 * sun], eMoon: [0, 0, 0], eSky: [0.2, 0.25, 0.35], hazeLin: [0.3, 0.4, 0.5], yHorizon: 0.5,
})
const lamp = (x: number, altitude = 15): Lamp => ({ x, y: -20, domeY: -20, altitude, body: 'sun', strength: 1 })
const desc = (litField: PlaneLitField, at?: Lamp, gullies: LayerOf<'plane'>['gullies'] = []): LayerOf<'plane'> => ({
  kind: 'plane', plane: 'near', id: 'plane.near', surface: 'land', z: 30, key: `k${gullies.length}`, bounds: { x: 0, y: 0, w: W, h: H }, outline,
  fill: [0.4, 0.4, 0.3], surfaceTone: { palette: [[0.6, 0.5, 0.35], [0.35, 0.42, 0.25]], cols: 2, rows: 1, cells: [0, 1], source: 'test' },
  gullies, terraces: [], vegetation: EMPTY_VEGETATION, grain: { amount: 1, seed: 5 }, light: { key: 'l', blend: 'source-over', litField }, lamp: at,
})

/** The ground's raster as a painter stamps it. */
function raster(paint: typeof paintRealPlane, layer: LayerOf<'plane'>): Uint8ClampedArray {
  let pixels: Uint8ClampedArray | undefined
  const ctx = new Proxy({}, {
    get: (_, name) => name === 'createImageData' ? (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) })
      : name === 'putImageData' ? (image: ImageData) => { pixels ??= image.data } : () => {},
    set: () => true,
  }) as unknown as Ctx2D
  paint(ctx, layer, { hand: HAND, phase: 0, scale: 2, canvas: () => ({ canvas: {} as OffscreenCanvas, ctx }) } satisfies PaintEnv)
  return pixels!
}

const mean = (pixels: Uint8ClampedArray, from = 4 * COLS * 3): RGB => {
  const sum = [0, 0, 0]
  for (let o = from; o < pixels.length; o += 4) for (let c = 0; c < 3; c++) sum[c] += pixels[o + c]
  return sum.map((s) => s / ((pixels.length - from) / 4) / 255) as unknown as RGB
}

it('keeps a plane\'s mean colour', () => {
  for (const sun of [0, 0.5, 1]) {
    const own = mean(raster(paintRealPlane, desc(field(sun), lamp(90)))), plain = mean(raster(paintPlaneLight, desc(field(sun))))
    own.forEach((c, k) => expect(Math.abs(c - plain[k])).toBeLessThan(0.03))
  }
})

it('turns a fold\'s banks as the light crosses, and lights none of it without a beam', () => {
  const gully = [{ points: [[90, 14], [90, 70]] as Pt[], w: 1.4, alpha: 0.13 }]
  const banks = (x: number, sun = 1) => {
    const cut = raster(paintRealPlane, desc(field(sun), lamp(x), gully)), whole = raster(paintRealPlane, desc(field(sun), lamp(x)))
    let side = 0
    // Fourteen texels down, the two texels each side of the bed: what the fold alone changes.
    for (let j = 8; j < 14; j++) for (const d of [1, 2]) {
      const at = (i: number) => cut[4 * (j * COLS + i) + 1] - whole[4 * (j * COLS + i) + 1]
      side += at(COLS / 2 - 1 + d) - at(COLS / 2 - d)
    }
    return side
  }
  expect(banks(-60)).toBeGreaterThan(20)
  expect(banks(240)).toBeLessThan(-20)
  expect(raster(paintRealPlane, desc(field(0), lamp(-60), gully))).toEqual(raster(paintRealPlane, desc(field(0), lamp(240), gully)))
})

it('leaves a fully hazed plane the haze\'s own colour', () => {
  const pixels = raster(paintRealPlane, desc(field(1, 255), lamp(90)))
  for (let o = 0; o < pixels.length; o += 4) expect([...pixels.slice(o, o + 3)]).toEqual([...pixels.slice(0, 3)])
})
