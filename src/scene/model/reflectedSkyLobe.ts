import { SCENE_H } from '../../world/sceneBox'
import type { RGB, WorldState } from '../../world/types'
import { srgbRgbToLinear } from './landRadiance'
import { lowLobe, ROUGH_LOBE_HEIGHT, twilightShare } from './landSkyIrradiance'
import { horizonBand, skyGeom, skyStops, stopAt } from './sky'
import { skyGlows } from './skyGlows'
import { rgbOf } from './tone'
import type { Band, Glow, SceneBox } from './types'

const memo = new WeakMap<WorldState, RGB>()
const RAD = Math.PI / 180

// Two-point Gauss–Radau in sin(elevation) over one e-folding height (~22°).
// The fixed horizon node resolves the band even on strongly stretched relief.
// Azimuth uses three midpoints across the lobe's half-power width.
const halfPower = Math.acos(Math.SQRT2 - 1)
const samples = ([[0, 1 / 4], [2 / 3, 3 / 4]] as const).flatMap(([fraction, measure]) => {
  const up = fraction * ROUGH_LOBE_HEIGHT
  return [-2 / 3, 0, 2 / 3].map(side => {
    const offset = side * halfPower
    return { altitude: Math.asin(up) / RAD, offset: offset / RAD,
      weight: measure * lowLobe(up, Math.sqrt(1 - up * up) * Math.cos(offset)) }
  })
})

// Gradient interpolation and source-over on the displayed sRGB values.
function mixSrgb(from: RGB, to: RGB, t: number): RGB {
  return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t]
}

function glowAlpha(glow: Glow, x: number, y: number): number {
  const radius = Math.hypot((x - glow.x) / glow.r, (y - glow.y) / (glow.ry ?? glow.r))
  return glow.alpha * Math.max(0, 1 - radius)
}

function bandAlpha(band: Band, y: number): number {
  // Same stops above eye level as skyBackground: 0 and .35 at 0 and .45
  // of the 1.3h gradient span, then full alpha at the horizon.
  const fromTop = 1 + (y - band.y) / band.h
  const mid = .45 * 1.3
  if (fromTop <= 0) return 0
  return band.alpha * (fromTop < mid ? .35 * fromTop / mid : .35 + .65 * (fromTop - mid) / (1 - mid))
}

/** One linear-light average of the illustrated low sky for the glass and metal incident lobes. */
export function reflectedSkyLobe(world: WorldState): RGB {
  const known = memo.get(world)
  if (known) return known
  const { sun } = world.bodies
  if (!twilightShare(sun.altitude)) return srgbRgbToLinear(rgbOf(world.light.palette.horizon))

  const { camera } = world
  // Reference-pixel projection, padded on both sides to include off-screen sky and city domes.
  const padding = 360 * camera.pxPerDeg / 2
  // Use the scene harness's 300 px of sky above the figure as the reference
  // for the illustrated gradient. Receiver colours stay independent of page layout.
  const landTop = 300
  const box: SceneBox = { width: camera.width, landLeft: padding, skyWidth: camera.width + 2 * padding,
    skyHeight: landTop + SCENE_H, landTop, landHeight: SCENE_H, dpr: 1 }
  const geom = skyGeom(world, box)
  const stops = skyStops(world, box)
  const band = horizonBand(world, box)
  // The disc is a separate body layer. The broad glows here are diffuse and
  // the independent beam already accounts for the disc.
  const glows = skyGlows(world, box.landTop, geom)
  const sum: [number, number, number] = [0, 0, 0]
  let total = 0
  for (const { altitude, offset, weight } of samples) {
    const y = geom.y(altitude)
    const x = geom.left + sun.x + offset * camera.handed * camera.pxPerDeg
    let rgb = stopAt(stops, y / box.skyHeight, mixSrgb)
    for (const glow of glows) {
      const alpha = glowAlpha(glow, x, y)
      if (alpha > 0) rgb = mixSrgb(rgb, glow.rgb, alpha)
    }
    if (band) rgb = mixSrgb(rgb, band.rgb, bandAlpha(band, y))
    const [r, g, b] = srgbRgbToLinear(rgb)
    sum[0] += weight * r
    sum[1] += weight * g
    sum[2] += weight * b
    total += weight
  }
  const rgb: RGB = [sum[0] / total, sum[1] / total, sum[2] / total]
  memo.set(world, rgb)
  return rgb
}
