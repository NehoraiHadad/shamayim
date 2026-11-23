import { describe, expect, it } from 'vitest'
import { EMPTY_VEGETATION } from '../model/vegDescriptor'
import type { Lift, PlaneVegetation } from '../model/types'
import { buildVegPalette, TONE } from '../model/vegSample'
import type { Ctx2D } from './hand'
import { paintVegCrowns } from './landVegCrowns'
import { paintVegLight } from './landVegLight'
import { treeBend, treeCrownAnchor } from './landVegPose'

const lift: Lift = { dx: 1, dy: -0.7, rgb: [0.85, 0.85, 0.7], alpha: 0.5 }

function recordEllipsesAndFills() {
  const ellipses: { cx: number; cy: number; rx: number; ry: number; fill: string }[] = []
  const pathStarts: [number, number][] = []
  let pending: { cx: number; cy: number; rx: number; ry: number }[] = []
  let fillStyle = ''
  const ctx = new Proxy({}, {
    get: (_, prop) => {
      if (prop === 'beginPath') return () => { pending = [] }
      if (prop === 'moveTo') return (x: number, y: number) => { pathStarts.push([x, y]) }
      if (prop === 'ellipse') return (cx: number, cy: number, rx: number, ry: number) => { pending.push({ cx, cy, rx, ry }) }
      if (prop === 'fill') return () => { for (const e of pending) ellipses.push({ ...e, fill: fillStyle }); pending = [] }
      return () => {}
    },
    set: (_, prop, val) => { if (prop === 'fillStyle') fillStyle = String(val); return true },
  }) as unknown as Ctx2D
  return { ctx, ellipses, pathStarts }
}

const alphaOf = (cssStr: string) => {
  const m = /\/\s*([\d.]+)\)/.exec(cssStr)
  return m ? Number(m[1]) : 1
}

describe('vegetation painter anchors & distance fade', () => {
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
    paintVegLight(ctx, veg, lift)
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

  it('moves woodland catchlights and forms through the same gust pose', () => {
    const r = 3, height = 6.5, widePhase = Math.PI / (2 * 1.3), narrowPhase = (3 * Math.PI) / (2 * 1.3)
    const wind = { lean: -0.8, gust: -0.5 }, time = 0.8, vis = 240 / 255
    const bend = (phase: number) => treeBend(0, height, vis, phase, wind, time)
    const wide = treeCrownAnchor(100, 90, r, height, widePhase, 0, bend(widePhase))
    const narrow = treeCrownAnchor(200, 90, r, height, narrowPhase, 0, bend(narrowPhase))
    expect(wide.rx).toBeGreaterThan(narrow.rx + 0.5)
    expect(wide.ry).not.toBeCloseTo(narrow.ry, 3)
    expect(wide.cy).not.toBeCloseTo(narrow.cy, 3)
    expect(wide.cx).toBeLessThan(99.5)

    const veg: PlaneVegetation = {
      ...EMPTY_VEGETATION,
      trees: new Float32Array([100, 90, r, height, widePhase, 0.4, 200, 90, r, height, narrowPhase, 0.4]),
      treeMeta: new Uint8Array([0, TONE.PINE_MID, 240, 0, TONE.PINE_MID, 240]),
      tones: buildVegPalette([0.2, 0.25, 0.18], 0.3),
    }
    const lightRec = recordEllipsesAndFills()
    paintVegLight(lightRec.ctx, veg, lift, wind, time)
    expect(lightRec.ellipses).toHaveLength(2)
    for (const [e, a] of [[lightRec.ellipses[0], wide], [lightRec.ellipses[1], narrow]] as const) {
      expect(e.cx).toBeCloseTo(a.cx + a.rx * 0.28, 4)
      expect(e.cy).toBeCloseTo(a.cy - 0.7 * a.ry * 0.30, 4)
      expect(e.rx).toBeCloseTo(a.rx * 0.50, 4)
      expect(e.ry).toBeCloseTo(a.ry * 0.42, 4)
    }

    const formRec = recordEllipsesAndFills()
    paintVegCrowns(formRec.ctx, veg, wind, time)
    // Each crown draws the body first, then the shade and ambient highlights.
    expect(formRec.pathStarts).toHaveLength(6)
    for (const [i, a, phase] of [[0, wide, widePhase], [3, narrow, narrowPhase]] as const) {
      const [x, y] = formRec.pathStarts[i]
      const billow = 1 + 0.16 * Math.sin(phase) + 0.08 * Math.cos(phase * 1.3)
      expect(x).toBeCloseTo(a.cx + a.rx * billow, 4)
      expect(y).toBeCloseTo(a.cy, 4)
    }
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
    paintVegLight(ctx, vegTufts, lift)
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
