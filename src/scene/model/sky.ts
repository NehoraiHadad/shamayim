import type { WorldState } from '../../world/types'
import { colourKey, layerKey, skyBoxKey } from './keys'
import { hazeOf } from './planeLight'
import { mixRgb, rgbOf } from './tone'
import type { Band, LayerOf, RGB, SceneBox } from './types'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/**
 * The sky's gradient stops (fractions of the sky surface's height): the zenith at the top, the mid tone a little over
 * half way down to the horizon, the horizon colour at eye level (the land's own horizon, offset by `box.landTop`) and
 * below it.
 */
export function skyStops(world: WorldState, box: SceneBox): [number, RGB][] {
  const { palette } = world.light
  const horizon = clamp01((box.landTop + world.relief.horizonY) / box.skyHeight)
  return [[0, rgbOf(palette.top)], [horizon * 0.55, rgbOf(palette.mid)], [horizon, rgbOf(palette.horizon)], [1, rgbOf(palette.horizon)]]
}

/**
 * The sky's colour at an altitude (deg above eye level) as the gradient draws it: what still water mirrors at the same
 * angle below the horizon.
 */
export function skyAt(world: WorldState, box: SceneBox): (altitude: number) => RGB {
  const stops = skyStops(world, box)
  return (altitude) => {
    const at = clamp01((box.landTop + world.relief.y(Math.max(0, altitude))) / Math.max(1, box.skyHeight))
    for (let i = 1; i < stops.length; i++) {
      const [a, ca] = stops[i - 1], [b, cb] = stops[i]
      if (at <= b) return b > a ? mixRgb(ca, cb, (at - a) / (b - a)) : cb
    }
    return stops.at(-1)![1]
  }
}

/** Height (px) of the haze band over the horizon. */
const BAND_H = 44

/**
 * The haze band at the horizon (`air.horizonBand`): the air seen through its whole depth, lighter and paler just over
 * the far land, stronger as the visibility falls; by night it keeps only the sky's own horizon tone, faint.
 */
export function horizonBand(world: WorldState, box: SceneBox): Band | null {
  const { horizonBand: given } = world.air
  const dark = world.night.dark
  const alpha = given.alpha * (1 - 0.6 * dark)
  if (alpha < 0.02) return null
  const rgb = mixRgb(hazeOf(world), [1, 1, 1], 0.12 * (1 - dark))
  return { y: box.landTop + world.relief.horizonY, h: BAND_H, rgb, alpha }
}

/**
 * The sky's gradient from the light's palette (`theme/skyLight.ts`, `skyStops`) and the haze band at the horizon (C3).
 * Stage C6 adds the glow and the afterglow.
 */
export function skyLayer(world: WorldState, box: SceneBox): LayerOf<'sky'> | null {
  if (box.skyHeight <= 0 || box.width <= 0) return null
  const stops = skyStops(world, box)
  const band = horizonBand(world, box)
  return {
    kind: 'sky', id: 'sky', surface: 'sky', z: 0, soft: true,
    bounds: { x: 0, y: 0, w: box.width, h: box.skyHeight },
    key: layerKey('sky', skyBoxKey(box, true), stops.map(([at, rgb]) => [at, colourKey(rgb)]),
      band && [band.y, band.h, colourKey(band.rgb), Math.round(band.alpha * 255)]),
    stops, glow: [], band,
  }
}
