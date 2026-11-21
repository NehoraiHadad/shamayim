import { describe, expect, it } from 'vitest'
import { EMPTY_VEGETATION } from '../model/vegDescriptor'
import type { LayerOf, PlaneVegetation } from '../model/types'
import { buildVegPalette, TONE } from '../model/vegSample'
import { HAND, type Ctx2D } from './hand'
import { paintVegCrowns, treeCrownAnchor } from './landVegCrowns'
import { paintPlaneLight } from './planeLight'

const env = { hand: HAND, phase: 0, scale: 2, canvas: () => ({ canvas: {} as OffscreenCanvas, ctx: {} as Ctx2D }) }

function recordEllipsesAndFills() {
  const ellipses: { cx: number; cy: number; rx: number; ry: number; fill: string }[] = []
  let pending: { cx: number; cy: number; rx: number; ry: number }[] = []
  let fillStyle = ''
  const ctx = new Proxy({}, {
    get: (_, prop) => {
      if (prop === 'beginPath') return () => { pending = [] }
      if (prop === 'ellipse') return (cx: number, cy: number, rx: number, ry: number) => { pending.push({ cx, cy, rx, ry }) }
      if (prop === 'fill') return () => { for (const e of pending) ellipses.push({ ...e, fill: fillStyle }); pending = [] }
      return () => {}
    },
    set: (_, prop, val) => { if (prop === 'fillStyle') fillStyle = String(val); return true },
  }) as unknown as Ctx2D
  return { ctx, ellipses }
}

const alphaOf = (cssStr: string) => {
  const m = /\/\s*([\d.]+)\)/.exec(cssStr)
  return m ? Number(m[1]) : 1
}

function makePlane(veg: PlaneVegetation): LayerOf<'plane'> {
  return {
    kind: 'plane', plane: 'near', id: 'plane.near', surface: 'land', z: 30, key: 'k',
    bounds: { x: 0, y: 0, w: 375, h: 128 }, outline: [[0, 40], [375, 40], [375, 128], [0, 128]],
    fill: [0.2, 0.25, 0.18], surfaceTone: { palette: [[0.2, 0.25, 0.18]], cols: 1, rows: 1, cells: [0], source: 'test' },
    gullies: [], terraces: [], vegetation: veg, grain: { amount: 0, seed: 1 },
    light: {
      key: 'l', blend: 'source-over', faces: [], veil: [], shade: [], lit: [], rims: [], snow: null,
      lift: { dx: 1, dy: -0.7, rgb: [0.85, 0.85, 0.7], alpha: 0.5 },
    },
  }
}

describe('Stage 4 vegetation painter anchors & smooth distance fade', () => {
  it('places palm catchlight on the bent palm crown rather than the trunk', () => {
    const x = 100, y = 90, r = 3, height = 9, phase = Math.PI / 2
    const anchor = treeCrownAnchor(x, y, r, height, phase, 3)
    expect(anchor.cx).toBeCloseTo(x + r * 0.42, 4)
    expect(anchor.cy).toBeCloseTo(y - height * 0.62, 4)

    const veg: PlaneVegetation = {
      ...EMPTY_VEGETATION,
      trees: new Float32Array([x, y, r, height, phase, 0.4]),
      treeMeta: new Uint8Array([3, TONE.PALM, 240]),
      tones: buildVegPalette([0.2, 0.25, 0.18], 0.3),
    }
    const { ctx, ellipses } = recordEllipsesAndFills()
    paintPlaneLight(ctx, makePlane(veg), env)
    expect(ellipses).toHaveLength(1)
    // Crown is at cy ≈ 84.42 (well above trunk/base at y - r*0.58 ≈ 88.26).
    expect(ellipses[0].cy).toBeLessThan(85)
    expect(ellipses[0].cx).toBeGreaterThan(x + 1.5)

    // Unknown-species orchard crown (kind 4) has distinct proportions from wide silvery olive (kind 1).
    const oliveAnchor = treeCrownAnchor(100, 90, 3, 5, 0.5, 1)
    const orchardAnchor = treeCrownAnchor(100, 90, 3, 5, 0.5, 4)
    expect(orchardAnchor.rx).toBeLessThan(oliveAnchor.rx)
    expect(orchardAnchor.ry).toBeGreaterThan(oliveAnchor.ry)
  })

  it('weights tuft and crown lift alpha by visibility and fades form crowns smoothly to zero near cutoff', () => {
    const vegTufts: PlaneVegetation = {
      ...EMPTY_VEGETATION,
      tufts: new Float32Array([
        60, 80, 2.0, 0.05,  // below cutoff: skipped
        120, 80, 2.0, 0.25, // low visibility tier
        200, 80, 2.0, 0.90, // full visibility tier
      ]),
      tuftMeta: new Uint8Array([0, TONE.SHRUB, 0, TONE.SHRUB, 0, TONE.SHRUB]),
      tones: buildVegPalette([0.2, 0.25, 0.18], 0.3),
    }
    const { ctx, ellipses } = recordEllipsesAndFills()
    paintPlaneLight(ctx, makePlane(vegTufts), env)
    expect(ellipses).toHaveLength(2)
    const low = ellipses.find((e) => Math.abs(e.cx - 120) < 5)!
    const high = ellipses.find((e) => Math.abs(e.cx - 200) < 5)!
    expect(alphaOf(low.fill)).toBeLessThan(alphaOf(high.fill) * 0.5)

    // Form painter scales pine crown, understory, shade and light sides smoothly with alphaByte.
    const alphasFor = (alphaByte: number) => {
      const fills: string[] = []
      let fillStyle = ''
      const fctx = new Proxy({}, {
        get: (_, p) => (p === 'fill' ? () => { fills.push(fillStyle) } : () => {}),
        set: (_, p, v) => { if (p === 'fillStyle') fillStyle = String(v); return true },
      }) as unknown as Ctx2D
      paintVegCrowns(fctx, {
        ...EMPTY_VEGETATION,
        trees: new Float32Array([100, 80, 2.5, 5, 0.5, 0.4]),
        treeMeta: new Uint8Array([0, TONE.PINE_MID, alphaByte]),
        tones: buildVegPalette([0.2, 0.25, 0.18], 0.3),
      })
      return fills.map(alphaOf)
    }
    const fullA = alphasFor(245), midA = alphasFor(120), nearCutA = alphasFor(20)
    expect(fullA.length).toBeGreaterThanOrEqual(4) // understory + shadow + body + shade + light side
    expect(Math.max(...nearCutA)).toBeLessThan(Math.max(...midA) * 0.25)
    expect(Math.max(...midA)).toBeLessThan(Math.max(...fullA) * 0.6)
  })
})
