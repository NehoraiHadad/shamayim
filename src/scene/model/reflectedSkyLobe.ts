import { SCENE_H } from '../../world/sceneBox'
import type { RGB, WorldState } from '../../world/types'
import { srgbRgbToLinear } from './landRadiance'
import { lowLobe, metalSkyLobe, ROUGH_LOBE_HEIGHT, twilightShare } from './landSkyIrradiance'
import { horizonBand, skyGeom, skyStops, stopAt } from './sky'
import { horizonBandAlphaAt, skyGlows } from './skyGlows'
import { rgbOf } from './tone'
import type { Glow, SceneBox } from './types'

interface ReflectedSky {
  sample: ReturnType<typeof paintedSkySampler>
  rough?: RGB
  metal?: RGB
}
const memo = new WeakMap<WorldState, ReflectedSky>()
const RAD = Math.PI / 180

// Two-point Gauss–Radau in sin(elevation) over one e-folding height (~22°).
// The fixed horizon node resolves the band even on strongly stretched relief.
// Azimuth uses three midpoints across the lobe's half-power width.
const halfPower = Math.acos(Math.SQRT2 - 1)
const roughSamples = ([[0, 1 / 4], [2 / 3, 3 / 4]] as const).map(([fraction, measure]) => {
  const up = fraction * ROUGH_LOBE_HEIGHT
  const bearings = [-2 / 3, 0, 2 / 3].map(side => {
    const offset = side * halfPower
    return { offset: offset / RAD,
      weight: measure * lowLobe(up, Math.sqrt(1 - up * up) * Math.cos(offset)) }
  })
  return { altitude: Math.asin(up) / RAD, bearings }
})

// Composite midpoint integration in equal-solid-angle coordinates (sin elevation
// and bearing). Use full support: the old rule cropped the tails at one scale
// height and the half-power bearing. Double the reference's elevation resolution
// where the gradient and haze change fastest, keeping the same 16 bearings.
const metalSamples = Array.from({ length: 24 }, (_, i) => {
  const up = (i + .5) / 24, horizontal = Math.sqrt(1 - up * up)
  const bearings = Array.from({ length: 16 }, (_, j) => {
    const offset = (j + .5) * 360 / 16 - 180
    return { offset, weight: metalSkyLobe(up, horizontal * Math.cos(offset * RAD)) }
  })
  return { altitude: Math.asin(up) / RAD, bearings }
})

// Gradient interpolation and source-over on the displayed sRGB values.
function mixSrgb(from: RGB, to: RGB, t: number): RGB {
  return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t]
}

function glowAlpha(glow: Glow, x: number, y: number): number {
  const radius = Math.hypot((x - glow.x) / glow.r, (y - glow.y) / (glow.ry ?? glow.r))
  return glow.alpha * Math.max(0, 1 - radius)
}

/** Palette, glows and haze of the CSS sky wash, in linear light at a bearing relative to the sun. */
export function paintedSkySampler(world: WorldState) {
  const { sun } = world.bodies
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
  // The body layer's disc belongs to the direct beam. The sky wash still has
  // an aureole and ridge glow when the disc is hidden by terrain.
  const glows = skyGlows(world, box.landTop, geom)
  return (altitude: number) => {
    const y = geom.y(altitude)
    const base = stopAt(stops, y / box.skyHeight, mixSrgb)
    const bandAlpha = band ? horizonBandAlphaAt(band, y) : 0
    return (offset: number): RGB => {
      const x = geom.left + sun.x + offset * camera.handed * camera.pxPerDeg
      let rgb = base
      for (const glow of glows) {
        const alpha = glowAlpha(glow, x, y)
        if (alpha > 0) rgb = mixSrgb(rgb, glow.rgb, alpha)
      }
      if (band && bandAlpha > 0) rgb = mixSrgb(rgb, band.rgb, bandAlpha)
      return srgbRgbToLinear(rgb)
    }
  }
}

/** Memoize the receiver averages and share the sky projection per world. */
export function reflectedSkyLobe(world: WorldState, shape: 'rough' | 'metal' = 'rough'): RGB {
  if (!twilightShare(world.bodies.sun.altitude)) return srgbRgbToLinear(rgbOf(world.light.palette.horizon))
  let entry = memo.get(world)
  if (!entry) memo.set(world, entry = { sample: paintedSkySampler(world) })
  const known = entry[shape]
  if (known) return known
  const sum: [number, number, number] = [0, 0, 0]
  let total = 0
  for (const { altitude, bearings } of shape === 'metal' ? metalSamples : roughSamples) {
    const sample = entry.sample(altitude)
    for (const { offset, weight } of bearings) {
      const [r, g, b] = sample(offset)
      sum[0] += weight * r
      sum[1] += weight * g
      sum[2] += weight * b
      total += weight
    }
  }
  const rgb: RGB = [sum[0] / total, sum[1] / total, sum[2] / total]
  return entry[shape] = rgb
}
