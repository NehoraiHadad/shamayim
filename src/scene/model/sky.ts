//# allFunctionsCalledOnLoad
import { coinOf } from '../../world/air'
import { sunLight } from '../../world/sceneLight'
import { smoothstep } from '../../world/ridgeLighting'
import type { WorldState } from '../../world/types'
import { cityDomes } from './cityLight'
import { colourKey, layerKey, skyBoxKey } from './keys'
import { skyGeom } from './skyGeom'
import { horizonBand, skyStops } from './skyGradient'
import { coversOf, skyColours, veilOf } from './skyColour'
import { mixRgb } from './tone'
import type { Arch, Glow, LayerOf, RGB, SceneBox } from './types'

export { coversOf, veilOf } from './skyColour'
export { DOME_ALT, skyGeom, type SkyGeom } from './skyGeom'
export { horizonBand, skyAt, skyStops, stopAt } from './skyGradient'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const WHITE: RGB = [1, 1, 1]

/**
 * The glows of the sky (sky px): round the sun a three-layer glow (a broad warm sky, a nearer brightening, the bright
 * aureole), its colour the sun's after air mass and aerosol, weaker as the sun climbs and as the cloud in front takes its
 * direct light, none in dust; the twilight glow where the sun crosses the land round sunrise and sunset; a cool glow round
 * the moon and the lit air over the towns by night.
 */
export function skyGlows(world: WorldState, box: SceneBox, geom = skyGeom(world, box)): Glow[] {
  const out: Glow[] = cityDomes(world, geom)
  const { sun, moon } = world.bodies
  const veil = veilOf(world)
  const coin = coinOf(world.air)
  const aerosol = world.air
  if (sun.altitude > -1.5) {
    const rgb = mixRgb(sunLight(Math.max(0, sun.altitude), aerosol).rgb, WHITE, 0.2)
    const up = smoothstep(-1.5, 1, sun.altitude)
    const low = 1 - 0.32 * smoothstep(8, 40, sun.altitude)
    // A hot day's bloom (the air's heat): the glow spreads wider.
    const bloom = 1 + 0.25 * clamp01(world.air.heat)
    const g = up * low * (1 - 0.85 * veil) * (1 - coin)
    const x = geom.left + sun.x * geom.s, y = box.landTop + sun.y
    if (g > 0.01) {
      for (const [r, a] of [[200, 0.26], [86, 0.36], [32, 0.5]] as const) out.push({ x, y, r: r * bloom * Math.max(0.8, geom.s), rgb, alpha: a * g })
    }
    // Under a deck the sun is a brighter patch in the cloud, wide and soft.
    if (veil > 0.6 && up > 0) out.push({ x, y, r: 120 * geom.s, rgb: mixRgb(rgb, WHITE, 0.5), alpha: 0.22 * up * smoothstep(0.6, 0.95, veil) * (1 - coin) })
  }
  const glow = world.light.glow
  if (glow && glow.opacity > 0.01) {
    const after = world.light.afterglow?.rgb ?? sunLight(0.5, aerosol).rgb
    const clear = 1 - 0.7 * smoothstep(0.4, 0.95, 1 - world.light.clear)
    out.push({ x: geom.left + glow.x * geom.s, y: box.landTop + glow.y, r: 170 * geom.s, ry: 90, rgb: after,
      alpha: 0.45 * glow.opacity * clear })
  }
  if (moon.up && world.night.dark > 0.05) {
    const strength = moon.illumination * world.night.dark * (1 - 0.85 * veil)
    if (strength > 0.02) out.push({ x: geom.left + moon.x * geom.s, y: box.landTop + moon.y, r: 64 * geom.s, rgb: [0.78, 0.82, 1],
      alpha: 0.22 * strength })
  }
  return out
}

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
