//# allFunctionsCalledOnLoad
import { smoothstep } from '../../world/ridgeLighting'
import type { WorldState } from '../../world/types'
import { colourKey, layerKey, skyBoxKey } from './keys'
import { skyGeom } from './skyGeom'
import { horizonBand, skyStops } from './skyGradient'
import { coversOf, skyColours } from './skyColour'
import { skyGlows } from './skyGlows'
import type { Arch, LayerOf, SceneBox } from './types'

export { coversOf, veilOf } from './skyColour'
export { skyGlows } from './skyGlows'
export { skyGeom, type SkyGeom } from './skyGeom'
export { horizonBand, skyAt, skyStops, stopAt } from './skyGradient'

/**
 * Earth's shadow and the belt of Venus: from just before sunset to ~6° after (and the mirror at dawn), opposite the sun,
 * under a sky that is not overcast. The shadow climbs about as fast as the sun sinks (as the WebGL air drew it).
 */
export function skyArch(world: WorldState, box: SceneBox, geom = skyGeom(world, box)): Arch | null {
  const alt = world.bodies.sun.altitude
  const union = 1 - (1 - coversOf(world).low) * (1 - coversOf(world).mid) * (1 - coversOf(world).high)
  const on = smoothstep(1.5, -0.5, alt) * (1 - smoothstep(-5, -7, alt)) * (1 - smoothstep(0.4, 0.8, union))
  if (on < 0.02) return null
  const top = 1 + 1.1 * Math.max(0, -alt)
  const h = (deg: number) => geom.horizon - geom.y(deg)
  return { x: geom.x(world.bodies.sun.azimuth + 180), y: geom.horizon, rx: 0.75 * geom.width, shadow: h(top), belt: h(top + 9),
    shadowRgb: [0.2, 0.24, 0.4], beltRgb: [0.62, 0.36, 0.45], alpha: on }
}

/**
 * The sky's base: the gradient from the light's palette (`theme/skyLight.ts`), the glows of the sun, the twilight and the
 * moon, Earth's shadow, and the haze band at the horizon. One layer, repainted only when one of these changes (the app
 * lays it as the sky canvas's CSS background unless a grade needs the base in the bitmap).
 */
export function skyLayer(world: WorldState, box: SceneBox): LayerOf<'sky'> | null {
  if (box.skyHeight <= 0 || box.width <= 0) return null
  const geom = skyGeom(world, box)
  const colours = skyColours(world)
  const stops = skyStops(world, box, colours)
  const band = horizonBand(world, box, colours)
  const glow = skyGlows(world, box, geom)
  const arch = skyArch(world, box, geom)
  const r1 = (v: number) => Math.round(v * 2) / 2
  return {
    kind: 'sky', id: 'sky', surface: 'sky', z: 0, soft: true,
    bounds: { x: 0, y: 0, w: geom.width, h: box.skyHeight },
    key: layerKey('sky', skyBoxKey(box, true), stops.map(([at, rgb]) => [colours.bandWeight ? at * box.skyHeight : at, colourKey(rgb)]),
      band && [band.y, band.h, colourKey(band.rgb), Math.round(band.alpha * 255)],
      glow.map((g) => [r1(g.x), r1(g.y), r1(g.r), g.ry ?? 0, colourKey(g.rgb), Math.round(g.alpha * 255)]),
      arch && [r1(arch.x), r1(arch.shadow), r1(arch.belt), Math.round(arch.alpha * 255)]),
    stops, glow, arch, band,
  }
}
