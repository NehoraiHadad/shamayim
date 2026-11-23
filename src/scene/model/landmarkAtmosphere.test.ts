import { expect, it } from 'vitest'
import type { WorldState } from '../../world/types'
import type { WorldMark } from '../../world/markGeometry'
import { farNeighbourMarks } from './farNeighbourMarks'
import { landmarkContrast, landmarkTonesAt } from './landmarkAtmosphere'
import { tonesAt } from './marks'
import { toneAt } from './landVeil'
import { labOf, mixRgb } from './tone'
import type { RGB } from './types'

const world = { light: { palette: { ridgeNear: '#283948', mid: '#93a8be', horizon: '#d2d9de' },
  shares: { sun: 1, moon: 0 }, direct: 1, colour: [1, .95, .85], ambient: [.5, .6, .7], diffuse: .2 },
  night: { dark: 0 }, bodies: { sun: { azimuth: 0, altitude: 45 } }, ground: { wet: 0 },
  air: { haze: [.65, .7, .75], visibilityKm: 25, fade: (km: number) => 1 - Math.exp(-3.912 * km / 25) },
  land: { local: [{ eastM: 0, northM: 0, elevationM: 0, sample: { cover: 30, albedo: [.18, .2, .14] } }] }, place3: { kind: 'unknown' }, terrain: { horizonY: 70,
    near: { points: [[0, 110], [375, 110]], distanceKm: [1, 1] } } } as unknown as WorldState
const gap = (a: RGB, b: RGB) => {
  const x = labOf(a), y = labOf(b)
  return Math.hypot(x.l - y.l, x.a - y.a, x.b - y.b)
}
it('uses the land aerial colour and far-city contrast laws at each true distance', () => {
  const near = landmarkTonesAt(world, 4), far = landmarkTonesAt(world, 18)
  expect(landmarkContrast(world, 18)).toBeCloseTo(Math.exp(-3.912 * 18 / 25), 12)
  expect(gap(far.lit, far.shade)).toBeLessThan(gap(near.lit, near.shade))
  expect(gap(far.wall, toneAt(world, 18))).toBeLessThan(gap(near.wall, toneAt(world, 4)))
  expect(gap(near.lit, near.shade)).toBeLessThan(gap(tonesAt(world, 2).lit, tonesAt(world, 2).shade))
  expect(far.wall).toEqual(mixRgb(toneAt(world, 18), tonesAt(world, 18).wall, Math.exp(-3.912 * 18 / 25)))
})
it('keeps two equally sized icons at different true distances with different haze and contrast', () => {
  const source = { kind: 'castle', glyphKind: 'castle', named: true, plane: 'far', townFootprint: false,
    base: 100, h: 1, hPx: 1, w: 1, scale: 1, sightKm: 12 } as WorldMark
  const marks = [{ ...source, id: 'near', x: 140, km: 4 }, { ...source, id: 'far', x: 240, km: 18 }]
  const box = { width: 375, skyHeight: 0, landTop: 0, landHeight: 128, dpr: 2 }
  const result = farNeighbourMarks({ ...world, marks }, box, null, { left: 100, right: 120, hazeKm: 2 }, [], [])
  expect(result).toHaveLength(2)
  const near = result.find(g => g.sourceId === 'near')!, far = result.find(g => g.sourceId === 'far')!
  expect(near.h * near.scale).toBe(6)
  expect(far.h * far.scale).toBe(6)
  expect([near.hazeKm, far.hazeKm]).toEqual([4, 18])
  expect(near.contrast).toBeCloseTo(Math.exp(-3.912 * 4 / 25), 12)
  expect(far.contrast).toBeCloseTo(Math.exp(-3.912 * 18 / 25), 12)
  expect(far.contrast).toBeLessThan(near.contrast!)
  expect(far.tones).toEqual(landmarkTonesAt(world, 18))
})
