import type { WorldState } from '../../world/types'
import { colourKey, layerKey, skyBoxKey } from './keys'
import { rgbOf } from './tone'
import type { LayerOf, RGB, SceneBox } from './types'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/**
 * The sky's gradient from the light's palette (`theme/skyLight.ts`): the zenith at the top, the mid tone a little over
 * half way down to the horizon, the horizon colour at eye level (the land's own horizon, offset by `box.landTop`) and
 * below it. Stage C6 adds the glow, the afterglow and the horizon band.
 */
export function skyLayer(world: WorldState, box: SceneBox): LayerOf<'sky'> | null {
  if (box.skyHeight <= 0 || box.width <= 0) return null
  const { palette } = world.light
  const horizon = clamp01((box.landTop + world.relief.horizonY) / box.skyHeight)
  const stops: [number, RGB][] = [[0, rgbOf(palette.top)], [horizon * 0.55, rgbOf(palette.mid)],
    [horizon, rgbOf(palette.horizon)], [1, rgbOf(palette.horizon)]]
  return {
    kind: 'sky', id: 'sky', surface: 'sky', z: 0, soft: true,
    bounds: { x: 0, y: 0, w: box.width, h: box.skyHeight },
    key: layerKey('sky', skyBoxKey(box, true), stops.map(([at, rgb]) => [at, colourKey(rgb)])),
    stops, glow: [], band: null,
  }
}
