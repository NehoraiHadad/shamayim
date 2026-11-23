//# allFunctionsCalledOnLoad
import type { WorldState } from '../../world/types'
import { fallingOf } from './falling'
import { layerKey, skyBoxKey } from './keys'
import { skyGeom, type SkyGeom } from './sky'
import type { FallingCloud, LayerOf, RGB, SceneBox } from './types'

/** The flash's colour: the blue-white of lightning seen through cloud. */
const FLASH: RGB = [0.86, 0.9, 1]
const q = (v: number, step: number) => Math.round(v / step)

/**
 * In-cloud lightning at positive `rain.thunderWeight`: the largest raining clouds in view (two at most) each light from
 * within on a seeded schedule of flashes (`anim.ts`), drifting with their rain (`falling.ts`).
 */
export function flashLayersOf(world: WorldState, box: SceneBox, geom: SkyGeom = skyGeom(world, box)): LayerOf<'flash'>[] {
  if (!world.rain || world.rain.thunderWeight <= 0) return []
  const strength = world.rain.thunderWeight
  const falling = fallingOf(world, box, geom, 'rain')
  if (!falling) return []
  const mid = geom.left + box.width / 2
  // The cloud's x nearest the middle of the view, among its copies round the band.
  const inView = (b: FallingCloud) => b.x + Math.round((mid - b.x) / geom.period) * geom.period
  // The largest raining clouds in view (the near ones, high on the dome, where a flash shows over the land).
  const half = box.width / 2
  const candidates = falling.cells.map((b) => ({ b, x: inView(b) }))
    .filter(({ b, x }) => Math.abs(x - mid) < half + b.w / 4)
    .sort((a, c) => c.b.w * c.b.h - a.b.w * a.b.h).slice(0, 2)
  return candidates.map(({ b, x }, i) => {
    const pad = b.w * 0.45
    const cloud = { ...b, x }
    return {
      kind: 'flash' as const, id: `flash.${i}`, surface: 'sky' as const, z: 9, soft: true, cloud, rgb: FLASH, period: geom.period,
      bounds: { x: Math.floor(x - b.w / 2 - pad), y: Math.floor(b.y - b.h * 1.8 - pad * 0.5), w: Math.ceil(b.w + 2 * pad), h: Math.ceil(b.h * 2.3 + pad) },
      animated: { mode: 'drift' as const, speed: falling.speed, period: geom.period,
        pulse: { strength, seed: b.seed, first: 1.5 + (Math.abs(b.seed) % 7), every: [7, 22] as [number, number] } },
      key: layerKey('flash', skyBoxKey(box, true), [cloud.id, q(x, 0.5), q(b.y, 0.5), q(b.w, 1), q(b.h, 0.5), b.seed]),
    }
  })
}
