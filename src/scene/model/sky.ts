//# allFunctionsCalledOnLoad
import { xOf } from '../../domain/camera'
import { coinOf } from '../../world/air'
import { cloudTransmit } from '../../world/light'
import { sunLight } from '../../world/sceneLight'
import { smoothstep } from '../../world/ridgeLighting'
import type { WorldState } from '../../world/types'
import { colourKey, layerKey, skyBoxKey } from './keys'
import { hazeOf } from './planeLight'
import { mixRgb, rgbOf } from './tone'
import type { Arch, Band, Glow, LayerOf, RGB, SceneBox } from './types'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const WHITE: RGB = [1, 1, 1]

/**
 * Where things stand in the sky surface (sky px). Across, a direction goes through the world's camera, scaled from the
 * 375 px reference to the figure's width and offset to where the figure stands in the sky (`landLeft`); the sky surface may
 * be wider than the figure (the app's sky spans the window), and the same px a degree carry on past the figure's edges.
 * Up, the bodies stand on the world's relief (`relief.y`, the land's own angle scale), so the sun sets behind the ridge it
 * really sets behind.
 *
 * The clouds use the same relief up to `DOME_ALT`; above it the relief's zenith is only ~135 px over the horizon, less
 * than half the sky the screen shows over the land, so the rest of the dome (to the zenith) is spread over the whole sky
 * above: a cloud overhead is drawn high behind the text, as an eye looking up sees it (an illustrator's dome, not a
 * projection; the bodies keep the true scale, the clouds near the horizon too).
 */
export interface SkyGeom {
  /** Figure px per reference px. */
  s: number
  left: number
  /** The sky surface's width. */
  width: number
  /** y of eye level. */
  horizon: number
  /** Px round the whole horizon (360°), a whole number of device px: where a drifting cloud band repeats. */
  period: number
  /** Exact azimuth span in sky px. The seam is 55° outside either edge of the reference 250° view. */
  azimuthRange: { min: number; period: number }
  /** x of an azimuth (unwrapped: the camera's seam is behind the view). */
  x: (azimuth: number) => number
  /** y of a body at an (apparent) altitude: the world's relief. */
  y: (altitude: number) => number
  /** y of a cloud at an altitude: the relief low down, the dome spread over the sky above. */
  dome: (altitude: number) => number
}

/** Up to this altitude (deg) clouds stand on the relief; above it the dome is spread over the sky above. */
export const DOME_ALT = 22
/** The dome's zenith stands this far under the sky surface's top (px). */
const DOME_TOP = 18

export function skyGeom(world: WorldState, box: SceneBox): SkyGeom {
  const s = box.width / world.camera.width
  const left = box.landLeft ?? 0
  const width = box.skyWidth ?? box.width
  const y = (altitude: number) => box.landTop + world.relief.y(altitude)
  const yDome = y(DOME_ALT)
  const top = Math.min(DOME_TOP, yDome * 0.5)
  const span = 360 * world.camera.pxPerDeg * s
  const period = Math.round(span * box.dpr) / box.dpr
  return {
    s, left, width, horizon: y(0), period, azimuthRange: { min: left + (box.width - span) / 2, period: span },
    x: (azimuth) => left + xOf(azimuth, world.camera) * s,
    y,
    dome: (altitude) => altitude <= DOME_ALT ? y(altitude)
      : yDome - (yDome - top) * ((Math.min(90, altitude) - DOME_ALT) / (90 - DOME_ALT)) ** 0.85,
  }
}

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

/** The gradient's colour at a fraction of the sky's height. */
export function stopAt(stops: readonly [number, RGB][], at: number): RGB {
  for (let i = 1; i < stops.length; i++) {
    const [a, ca] = stops[i - 1], [b, cb] = stops[i]
    if (at <= b) return b > a ? mixRgb(ca, cb, clamp01((at - a) / (b - a))) : cb
  }
  return stops.at(-1)![1]
}

/**
 * The sky's colour at an altitude (deg above eye level) as the gradient draws it: what still water mirrors at the same
 * angle below the horizon.
 */
export function skyAt(world: WorldState, box: SceneBox): (altitude: number) => RGB {
  const stops = skyStops(world, box)
  return (altitude) => stopAt(stops, clamp01((box.landTop + world.relief.y(Math.max(0, altitude))) / Math.max(1, box.skyHeight)))
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

/** The covers of the three layers (low, mid, high). */
export const coversOf = (world: WorldState) => ({ low: world.clouds[0]?.cover ?? 0, mid: world.clouds[1]?.cover ?? 0,
  high: world.clouds[2]?.cover ?? 0 })

/** How much the cloud in front veils a body (0 clear … 1 hidden): the share of its direct light the cloud takes. */
export const veilOf = (world: WorldState) => 1 - cloudTransmit(coversOf(world))

/**
 * The glows of the sky (sky px): round the sun a three-layer glow (a broad warm sky, a nearer brightening, the bright
 * aureole), its colour the sun's after air mass and aerosol, weaker as the sun climbs and as the cloud in front takes its
 * direct light, none in dust; the twilight glow where the sun crosses the land round sunrise and sunset; a cool glow round
 * the moon by night.
 */
export function skyGlows(world: WorldState, box: SceneBox, geom = skyGeom(world, box)): Glow[] {
  const out: Glow[] = []
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
    const clear = 1 - 0.7 * smoothstep(0.4, 0.95, 1 - cloudTransmit(coversOf(world)))
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
 * lays it as the sky canvas's CSS background, see `paint/sky.ts`).
 */
export function skyLayer(world: WorldState, box: SceneBox): LayerOf<'sky'> | null {
  if (box.skyHeight <= 0 || box.width <= 0) return null
  const geom = skyGeom(world, box)
  const stops = skyStops(world, box)
  const band = horizonBand(world, box)
  const glow = skyGlows(world, box, geom)
  const arch = skyArch(world, box, geom)
  const r1 = (v: number) => Math.round(v * 2) / 2
  return {
    kind: 'sky', id: 'sky', surface: 'sky', z: 0, soft: true,
    bounds: { x: 0, y: 0, w: geom.width, h: box.skyHeight },
    key: layerKey('sky', skyBoxKey(box, true), stops.map(([at, rgb]) => [at, colourKey(rgb)]),
      band && [band.y, band.h, colourKey(band.rgb), Math.round(band.alpha * 255)],
      glow.map((g) => [r1(g.x), r1(g.y), r1(g.r), g.ry ?? 0, colourKey(g.rgb), Math.round(g.alpha * 255)]),
      arch && [r1(arch.x), r1(arch.shadow), r1(arch.belt), Math.round(arch.alpha * 255)]),
    stops, glow, arch, band,
  }
}
