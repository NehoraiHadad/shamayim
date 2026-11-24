import { expect, it } from 'vitest'
import type { LayerCanvas } from '../compose/layerCache'
import { Surface } from '../compose/surface'
import type { LayerOf } from '../model/types'
import { SCENE_STYLES, painterOf } from './painters'
import { onSkyCanvas } from './shared/sky/skyBackground'

it('lays one multiply in each hand, after the opaque backdrop, and restores source-over', () => {
  const bounds = { x: 0, y: 0, w: 10, h: 10 }
  const base: LayerOf<'sky'> = { kind: 'sky', surface: 'sky', id: 'sky', z: 0, key: 'base', bounds,
    stops: [[0, [0.8, 0.8, 0.8]]], glow: [], arch: null, band: null }
  const grade: LayerOf<'skyFilter'> = { kind: 'skyFilter', surface: 'sky', id: 'skyFilter', z: 8.9,
    key: 'grade', blend: 'multiply', bounds, horizon: 10, stops: [[0, [0.8, 0.7, 0.6]], [1, [1, 1, 1]]] }
  const flash: LayerOf<'flash'> = { kind: 'flash', surface: 'sky', id: 'flash', z: 9, key: 'flash', bounds,
    rgb: [1, 1, 1], period: 10, cloud: { id: 'cloud', x: 5, y: 5, w: 10, h: 10, seed: 1, alpha: 1,
      body: [1, 1, 1], shade: [1, 1, 1], altitude: 10, distanceKm: 2, share: 1 } }
  const draws: string[] = []
  const offsets: number[] = []
  const factory = (width: number, height: number) => {
    const ctx = { globalCompositeOperation: 'source-over', setTransform() {}, clearRect() {}, fillRect() {},
      createLinearGradient: () => ({ addColorStop: (offset: number) => offsets.push(offset) }),
      drawImage() { draws.push(this.globalCompositeOperation) } }
    return { width, height, getContext: () => ctx } as unknown as LayerCanvas
  }
  expect(onSkyCanvas([base, flash])).toEqual([flash])
  for (const hand of SCENE_STYLES) {
    const surface = new Surface(factory(10, 10), { factory, now: () => 0,
      painters: desc => desc.kind === 'skyFilter' ? painterOf(desc, hand) : { form() {} } })
    surface.resize(10, 10, 1)
    surface.render(onSkyCanvas([flash, grade, base]))
    expect(draws.splice(0)).toEqual(['source-over', 'multiply', 'source-over'])
    expect(offsets.splice(0)).toEqual([0, 1])
    surface.lay(0, true, [grade])
    expect(draws).toEqual([])
  }
})
