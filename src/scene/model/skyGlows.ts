//# allFunctionsCalledOnLoad
import { AFTERGLOW } from '../../world/afterglow'
import { coinOf } from '../../world/air'
import { smoothstep } from '../../world/ridgeLighting'
import { sunLight } from '../../world/sceneLight'
import type { WorldState } from '../../world/types'
import { cityDomes } from './cityLight'
import type { SkyGeom } from './sky'
import { mixRgb } from './tone'
import type { Glow, RGB } from './types'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const WHITE: RGB = [1, 1, 1]

/** Fade the afterglow colour within the altitude range in which it is available. */
export const afterglowWeight = (sunAlt: number) =>
  smoothstep(AFTERGLOW.to, AFTERGLOW.to + 2, sunAlt) * smoothstep(AFTERGLOW.from, AFTERGLOW.from - 2.3, sunAlt)

/** How much the cloud in front veils a body (0 clear … 1 hidden): the share of its direct light the cloud takes. */
export const veilOf = (world: WorldState) => 1 - world.light.clear

/** The painted solar aureole, cloud brightening and ridge glow, in bottom-to-top order. */
function solarSkyGlows(world: WorldState, top: number, left: number, scale: number): Glow[] {
  const out: Glow[] = []
  const { sun } = world.bodies
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
    const x = left + sun.x * scale, y = top + sun.y
    if (g > 0.01) {
      for (const [r, a] of [[200, 0.26], [86, 0.36], [32, 0.5]] as const) out.push({ x, y, r: r * bloom * Math.max(0.8, scale), rgb, alpha: a * g })
    }
    // Under a deck the sun is a brighter patch in the cloud, wide and soft.
    if (veil > 0.6 && up > 0) out.push({ x, y, r: 120 * scale, rgb: mixRgb(rgb, WHITE, 0.5), alpha: 0.22 * up * smoothstep(0.6, 0.95, veil) * (1 - coin) })
  }
  const glow = world.light.glow
  if (glow && glow.opacity > 0.01) {
    const base = sunLight(0.5, aerosol).rgb
    const afterglow = world.light.afterglow
    const after = afterglow ? mixRgb(base, afterglow.rgb, afterglowWeight(sun.altitude)) : base
    const clear = 1 - 0.7 * smoothstep(0.4, 0.95, 1 - world.light.clear)
    out.push({ x: left + glow.x * scale, y: top + glow.y, r: 170 * scale, ry: 90, rgb: after,
      alpha: 0.45 * glow.opacity * clear })
  }
  return out
}

/**
 * The glows of the sky (sky px): round the sun a three-layer glow (a broad warm sky, a nearer brightening, the bright
 * aureole), its colour the sun's after air mass and aerosol, weaker as the sun climbs and as the cloud in front takes its
 * direct light, none in opaque dust; the twilight glow where the sun crosses the land round sunrise and sunset; a cool
 * glow round the moon and the lit air over the towns by night. Listed in bottom-to-top paint order.
 */
export function skyGlows(world: WorldState, top: number, geom: SkyGeom): Glow[] {
  const out = [...cityDomes(world, geom), ...solarSkyGlows(world, top, geom.left, geom.s)]
  const { moon } = world.bodies
  const veil = veilOf(world)
  if (moon.up && world.night.dark > 0.05) {
    const strength = moon.illumination * world.night.dark * (1 - 0.85 * veil)
    if (strength > 0.02) out.push({ x: geom.left + moon.x * geom.s, y: top + moon.y, r: 64 * geom.s, rgb: [0.78, 0.82, 1],
      alpha: 0.22 * strength })
  }
  return out
}
