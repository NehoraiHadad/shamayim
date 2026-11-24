import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { LayerOf, PlaneLitField, Pt } from '../../model/types'
import { HAND, type Ctx2D, type PaintEnv } from '../shared/base/hand'
import { paintDrawnPlane } from './plane'

/** Records what is called and set on it, a path by the calls it was traced with. */
function recorder() {
  const calls: string[] = []
  const said = (value: unknown) => (typeof value === 'number' ? value.toFixed(4) : value && typeof value === 'object' ? `{${(value as { calls?: string[] }).calls?.join(';') ?? ''}}` : String(value))
  const proxy: object = new Proxy({ calls } as Record<string, unknown>, {
    get: (held, name: string) => name in held ? held[name] : (...args: unknown[]) => {
      calls.push(`${name}(${args.map(said).join(',')})`)
      return name.startsWith('create') ? recorder().proxy : undefined
    },
    set: (_, name: string, value) => { calls.push(`${name}=${said(value)}`); return true },
  })
  return { calls, proxy }
}

beforeEach(() => vi.stubGlobal('Path2D', function Path2D() { return recorder().proxy }))
afterEach(() => vi.unstubAllGlobals())

const W = 60, H = 45
const field = (sun: number): PlaneLitField => ({
  cols: 3, rows: 2, grid: new Uint8Array(Array.from({ length: 6 }, (_, n) => [n % 3 * 120, 0, 200, n < 3 ? 60 : 5]).flat()),
  eSun: [1.7 * sun, 1.3 * sun, 0.9 * sun], eMoon: [0, 0, 0], eSky: [0.2, 0.3, 0.45], hazeLin: [0.3, 0.4, 0.5], yHorizon: 0.5,
})
const desc = (key: string, sun = 1): LayerOf<'plane'> => ({
  kind: 'plane', plane: 'near', id: 'plane.near', key, bounds: { x: 0, y: 0, w: W, h: H }, outline: [[0, 6], [W, 2], [W, H], [0, H]] as Pt[],
  surfaceTone: { palette: [[0.6, 0.5, 0.35], [0.3, 0.45, 0.25]], cols: 2, rows: 1, cells: [0, 1], source: 'test' }, gullies: [], terraces: [], fill: [0.4, 0.4, 0.3],
  vegetation: { seed: 1, tones: [], strata: [], strataMeta: [], fields: new Float32Array(), fieldMeta: [], rows: [], rowMeta: [] },
  grain: { amount: 1, seed: 5 }, light: { key: `${key}:${sun}`, litField: field(sun) },
}) as unknown as LayerOf<'plane'>

function painted(layer: LayerOf<'plane'>) {
  const beam = recorder(), shade = recorder()
  paintDrawnPlane(beam.proxy as Ctx2D, layer, { hand: HAND, phase: 0, scale: 2, shade: shade.proxy as Ctx2D } as PaintEnv)
  return { beam: beam.calls, shade: shade.calls }
}

it('paints a kept ground as it paints it anew', () => {
  const made = painted(desc('a')), again = painted(desc('a')), anew = painted(desc('b'))
  expect(made.beam.length).toBeGreaterThan(20)
  expect(again).toEqual(made)
  expect(anew).toEqual(made)
})

it('keeps the pots of the ground while the light on it changes', () => {
  const pots = (calls: string[]) => new Set(calls.filter((call) => call.startsWith('fill({moveTo')).slice(0, 1))
  expect(pots(painted(desc('c', 1)).beam)).toEqual(pots(painted(desc('c', 0.2)).beam))
})

it('cuts the same shapes on both targets, the sun in one of them', () => {
  const { beam, shade } = painted(desc('d')), shapes = (calls: string[]) => calls.filter((call) => /^(clip|fill)\(/.test(call))
  expect(shapes(shade)).toEqual(shapes(beam))
  expect(shade.filter((c) => c.startsWith('fillStyle=rgb'))).not.toEqual(beam.filter((c) => c.startsWith('fillStyle=rgb')))
})
