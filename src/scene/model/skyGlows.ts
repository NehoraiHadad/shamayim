//# allFunctionsCalledOnLoad
import { coinOf } from '../../world/air'
import { sunLight } from '../../world/sceneLight'
import { smoothstep } from '../../world/ridgeLighting'
import type { WorldState } from '../../world/types'
import { cityDomes } from './cityLight'
import { srgbRgbToLinear } from './landRadiance'
import { afterglowWeight } from './landSkyIrradiance'
import type { SkyGeom } from './sky'
import { veilOf } from './skyColour'
import { gradeSky } from './skyTone'
import { mixRgb } from './tone'
import type { Glow, RGB, SceneBox } from './types'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const WHITE: RGB = [1, 1, 1]

/** The painted solar aureole, cloud brightening and ridge glow, in bottom-to-top order. */
export function solarSkyGlows(world: WorldState, top: number, left: number, scale: number): Glow[] {
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
    const rgb = ridgeGlowColour(world)
    const clear = 1 - 0.7 * smoothstep(0.4, 0.95, 1 - world.light.clear)
    out.push({ x: left + glow.x * scale, y: top + glow.y, r: 170 * scale, ry: 90, rgb,
      alpha: 0.45 * glow.opacity * clear })
  }
  return out
}

/** Fade the cloud colour into the ridge glow at both ends of the afterglow window. */
function ridgeGlowColour(world: WorldState): RGB {
  const { afterglow } = world.light
  const weight = afterglow ? afterglowWeight(world.bodies.sun.altitude) : 0
  if (afterglow && weight === 1) return afterglow.rgb
  const base = sunLight(0.5, world.air).rgb
  return afterglow && weight > 0 ? mixRgb(base, afterglow.rgb, weight) : base
}

/**
 * The glows of the sky (sky px): round the sun a three-layer glow (a broad warm sky, a nearer brightening, the bright
 * aureole), its colour the sun's after air mass and aerosol, weaker as the sun climbs and as the cloud in front takes its
 * direct light, suppressed by dust. The twilight glow sits where the sun crosses the land around sunrise and sunset.
 * At night a cool halo surrounds the moon and domes of lit air sit over the towns. Graded here, as the
 * hand paints them: `solarSkyGlows` is also a light on things.
 */
export function skyGlows(world: WorldState, box: SceneBox, geom: SkyGeom): Glow[] {
  const out = [...cityDomes(world, geom), ...solarSkyGlows(world, box.landTop, geom.left, geom.s)]
  const { moon } = world.bodies
  const veil = veilOf(world)
  if (moon.up && world.night.dark > 0.05) {
    const strength = moon.illumination * world.night.dark * (1 - 0.85 * veil)
    if (strength > 0.02) out.push({ x: geom.left + moon.x * geom.s, y: box.landTop + moon.y, r: 64 * geom.s, rgb: [0.78, 0.82, 1],
      alpha: 0.22 * strength })
  }
  return out.map((glow) => ({ ...glow, rgb: gradeSky(world, glow.rgb) }))
}

/** Solar glow over the palette horizon at a point on the reference sky surface. */
export function sunwardHorizon(horizon: RGB, glows: readonly Glow[], x: number, y: number): RGB {
  let rgb = horizon
  for (const glow of glows) {
    // skyBackground fades each elliptical gradient linearly to transparent at its edge.
    const radius = Math.hypot((x - glow.x) / glow.r, (y - glow.y) / (glow.ry ?? glow.r))
    const alpha = glow.alpha * Math.max(0, 1 - radius)
    // Composite the displayed sRGB layers in paint order, then decode the result for irradiance.
    rgb = [0, 1, 2].map(i => rgb[i] + (glow.rgb[i] - rgb[i]) * alpha) as [number, number, number]
  }
  return srgbRgbToLinear(rgb)
}
