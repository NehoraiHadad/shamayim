//# allFunctionsCalledOnLoad
import { azimuthAt, xOf } from '../../domain/camera'
import { smoothstep } from '../../world/ridgeLighting'
import type { WorldState } from '../../world/types'
import { cityOnSky } from './cityLight'
import { domeOf } from './dome'
import { colourKey, layerKey, skyBoxKey } from './keys'
import { hazeOf } from './landVeil'
import { skyGlows } from './skyGlows'
import { gradeSky } from './skyTone'
import { mixRgb, rgbOf } from './tone'
import type { Arch, Band, LayerOf, RGB, SceneBox } from './types'

export { skyGlows, veilOf } from './skyGlows'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/**
 * Where things stand in the sky surface (sky px). Across, a direction goes through the world's camera, scaled from the
 * 375 px reference to the figure's width and offset to where the figure stands in the sky (`landLeft`); the sky surface may
 * be wider than the figure (the app's sky spans the window), and the same px a degree carry on past the figure's edges.
 * Up, the bodies stand on the world's relief (`relief.y`, the land's own angle scale), so the sun sets behind the ridge it
 * really sets behind.
 *
 * The clouds use the same relief up to `DOME_ALT` (`dome.ts`); above it the relief's zenith is only ~135 px over the
 * horizon, less than half the sky the screen shows over the land, so the rest of the dome (to the zenith) is spread over
 * the whole sky above: a cloud overhead is drawn high behind the text, as an eye looking up sees it (an illustrator's dome, not a
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
  azimuthAt: (x: number) => number
  domeAltitudeAt: (y: number) => number
}

export function skyGeom(world: WorldState, box: SceneBox): SkyGeom {
  const s = box.width / world.camera.width
  const left = box.landLeft ?? 0
  const width = box.skyWidth ?? box.width
  const y = (altitude: number) => box.landTop + world.relief.y(altitude)
  const span = 360 * world.camera.pxPerDeg * s
  const period = Math.round(span * box.dpr) / box.dpr
  return {
    s, left, width, horizon: y(0), period, azimuthRange: { min: left + (box.width - span) / 2, period: span },
    x: (azimuth) => left + xOf(azimuth, world.camera) * s,
    azimuthAt: (x) => azimuthAt((x - left) / box.width, world.camera),
    y,
    ...domeOf(y),
  }
}

/**
 * The sky's gradient stops (fractions of the sky surface's height): the zenith at the top, the mid tone a little over
 * half way down to the horizon, the horizon colour at eye level (the land's own horizon, offset by `box.landTop`) and
 * below it, as the hand paints them.
 */
export function skyStops(world: WorldState, box: SceneBox): [number, RGB][] {
  const { palette } = world.light
  const horizon = clamp01((box.landTop + world.relief.horizonY) / box.skyHeight)
  // By night inside a town its lit air is over every side, less and less up to the zenith (the mid stop stands ~30° up).
  const at = (colour: string, altitude: number) => gradeSky(world, cityOnSky(world, rgbOf(colour), altitude))
  const low = at(palette.horizon, 0)
  return [[0, at(palette.top, 90)], [horizon * 0.55, at(palette.mid, 30)], [horizon, low], [1, low]]
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
    shadowRgb: gradeSky(world, [0.2, 0.24, 0.4]), beltRgb: gradeSky(world, [0.62, 0.36, 0.45]), alpha: on }
}

/**
 * The sky's base: the gradient from the light's palette (`theme/skyLight.ts`), the glows of the sun, the twilight and the
 * moon, Earth's shadow, and the haze band at the horizon. One layer, repainted only when one of these changes (the app
 * lays it as the sky canvas's CSS background, see `paint/shared/sky/skyBackground.ts`).
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
      arch && [r1(arch.x), r1(arch.shadow), r1(arch.belt), colourKey(arch.shadowRgb), colourKey(arch.beltRgb), Math.round(arch.alpha * 255)]),
    stops, glow, arch, band,
  }
}
