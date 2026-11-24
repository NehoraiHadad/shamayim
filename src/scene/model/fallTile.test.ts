import { expect, it } from 'vitest'
import { withFallTile } from './fallTile'
import type { LayerDesc, LayerOf } from './types'

const fall = (id: string): LayerOf<'fall'> => ({ kind: 'fall', id, surface: 'land', z: 60, key: 'f', precip: 'rain', rgb: [1, 1, 1], slant: 0.4,
  marks: [{ x: 3, y: 5, len: 9, r: 0, alpha: 0.5 }, { x: 40, y: 80, len: 16, r: 0, alpha: 1 }], bounds: { x: 0, y: 0, w: 64, h: 96 },
  animated: { mode: 'fall', fall: { vx: 40, vy: 100, areas: [], alphas: [] } } })

it('keeps the fall as thick, as long and as fast on a larger tile', () => {
  const near = fall('fall.near')
  const [wide] = withFallTile([near], { x: 2, y: 1 }) as LayerOf<'fall'>[]
  expect(wide.bounds).toEqual({ x: 0, y: 0, w: 128, h: 96 })
  expect(wide.marks.map((m) => m.len)).toEqual([9, 16, 9, 16])
  for (const m of wide.marks) expect(m.x >= 0 && m.x < 128 && m.y >= 0 && m.y < 96).toBe(true)
  expect(wide.animated).toBe(near.animated)
  expect(wide.key).not.toBe(near.key)
})

it('leaves the far streaks, and every layer when none asks', () => {
  const layers: LayerDesc[] = [fall('fall.far.snow'), fall('fall.near')]
  expect(withFallTile(layers, { x: 2, y: 1 })[0]).toBe(layers[0])
  expect(withFallTile(layers)).toBe(layers)
})
