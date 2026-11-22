import { expect, it } from 'vitest'
import { coversFoot, farMasses, footSpans } from './markOcclusion'
import type { LayerOf } from './types'
import type { WorldState } from '../../world/types'

const footHidden = (world: WorldState, width: number, masses: Parameters<typeof footSpans>[2],
  box: { left: number; right: number; top: number; bottom: number }, km: number) =>
  footSpans(world, width, masses, box.bottom, km).some(span => span.left < box.right && span.right > box.left)

it('uses the far painter’s left edge when testing the full block span', () => {
  const towns = { tiers: [{ blocks: [{ x: 110, w: 4, base: 95, h: 5, km: 8 }],
    mass: [{ boxes: [{ x: 120, y: 89, w: 3, h: 2, km: 7 }] }] }] } as LayerOf<'farCities'>
  const masses = farMasses(towns)
  expect(masses).toEqual([
    { left: 110, right: 114, top: 90, km: 8 },
    { left: 120, right: 123, top: 89, km: 7 },
  ])
  const foot = { left: 113, right: 115, top: 88, bottom: 92 }
  expect(coversFoot(masses[0], foot, 9)).toBe(true)
  expect(coversFoot(masses[0], foot, 6)).toBe(false)
})

it.each([375, 1280])('tests the ridge segment inside the glyph edges at %i px', width => {
  const sx = width / 375
  const ridge = { points: [[0, 110], [100, 99], [101, 90], [102, 99], [375, 110]],
    distanceKm: [2, 2, 2, 2, 2] }
  const world = { terrain: { near: ridge, far: ridge }, place3: { kind: 'unknown' } } as unknown as WorldState
  const foot = { left: 100 * sx, right: 102 * sx, top: 85, bottom: 98 }
  // Both glyph edges clear the ridge, while the ridge peak inside the box hides the foot.
  expect(footHidden(world, width, [], foot, 8)).toBe(true)
  expect(footHidden(world, width, [], foot, 1)).toBe(false)
})

it('excludes the far and back ridges painted beneath outside structures', () => {
  const near = { points: [[0, 110], [375, 110]], distanceKm: [2, 2] }
  const back = { points: [[0, 20], [375, 20]], distanceKm: [1, 1] }
  const world = { terrain: { near, far: back, back }, place3: { kind: 'unknown' } } as unknown as WorldState
  expect(footHidden(world, 375, [], { left: 100, right: 102, top: 90, bottom: 100 }, 8)).toBe(false)
})
