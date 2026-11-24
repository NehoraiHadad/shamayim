import { azimuthAt, xOf } from '../../domain/camera'
import type { WorldState } from '../../world/types'
import type { SceneBox } from './types'

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
  azimuthAt: (x: number) => number
  domeAltitudeAt: (y: number) => number
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
    azimuthAt: (x) => azimuthAt((x - left) / box.width, world.camera),
    y,
    dome: (altitude) => altitude <= DOME_ALT ? y(altitude)
      : yDome - (yDome - top) * ((Math.min(90, altitude) - DOME_ALT) / (90 - DOME_ALT)) ** 0.85,
    domeAltitudeAt: (px) => {
      if (px <= top) return 90
      if (px < yDome) return DOME_ALT + (90 - DOME_ALT) * ((yDome - px) / (yDome - top)) ** (1 / 0.85)
      if (px === y(0)) return 0
      // The relief is monotone and combines sine and tanh, so invert it numerically.
      let low = -90, high = DOME_ALT
      for (let i = 0; i < 46; i++) {
        const mid = (low + high) / 2
        if (y(mid) > px) low = mid
        else high = mid
      }
      return (low + high) / 2
    },
  }
}
