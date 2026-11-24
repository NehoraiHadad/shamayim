import { expect, it } from 'vitest'
import { labOf } from '../../model/tone'
import type { LayerOf, RGB } from '../../model/types'
import { skyBackground } from '../shared/sky/skyBackground'
import { pigment, skied } from './kit/palette'
import { DRAWN_GRADE } from './light/skyGrade'
import { drawnSkyBase } from './sky'

const COLOURS: RGB[] = [[0, 0, 0], [0.03, 0.04, 0.12], [0.2, 0.4, 0.7], [0.9, 0.5, 0.35], [0.75, 0.85, 0.95], [1, 1, 1]]
const far = (a: RGB, b: RGB) => { const p = labOf(a), q = labOf(b); return Math.hypot(p.l - q.l, p.a - q.a, p.b - q.b) }

it('grades the sky in range, with no jump, its value kept', () => {
  for (const rgb of COLOURS) {
    const out = DRAWN_GRADE.colour(rgb, 10)
    for (const v of out) expect(v >= 0 && v <= 1).toBe(true)
    expect(Math.abs(labOf(out).l - labOf(rgb).l)).toBeLessThan(0.02)
    const next = rgb.map((v) => Math.min(1, v + 0.004)) as unknown as RGB
    expect(far(out, DRAWN_GRADE.colour(next, 10))).toBeLessThan(2 * far(rgb, next) + 0.01)
  }
})

it('gives what is the sky\'s own colour little more chroma, and what is not the whole gain', () => {
  const chroma = (rgb: RGB) => Math.hypot(labOf(rgb).a, labOf(rgb).b), sea: RGB = [0.4, 0.55, 0.65]
  expect(skied(sea, 0, 0)).toEqual(pigment(sea))
  expect(chroma(skied(sea)) / chroma(sea)).toBeLessThan(1.12)
  expect(chroma(pigment(sea)) / chroma(sea)).toBeGreaterThan(1.3)
})

it('lays one image of grain over the default base, the same for the same box', () => {
  const desc = { bounds: { x: 0, y: 0, w: 375, h: 428 }, stops: [[0, [0.2, 0.4, 0.7]], [1, [0.8, 0.9, 1]]], glow: [], arch: null, band: null } as unknown as LayerOf<'sky'>
  const base = drawnSkyBase(desc), image = base.slice(0, base.indexOf(', linear-gradient'))
  expect(base).toBe(`${image}, ${skyBackground(desc)}`)
  expect(image.startsWith('url("data:image/svg+xml,') && image.endsWith('")')).toBe(true)
  expect(image.length).toBeLessThan(40_000)
  expect(drawnSkyBase({ ...desc, stops: [[0, [0, 0, 0.1]], [1, [0, 0, 0.2]]] }).startsWith(image)).toBe(true)
})
