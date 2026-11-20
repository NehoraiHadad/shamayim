/**
 * The camera: the one place that turns a direction in the world (an azimuth, clockwise from north) into a place across
 * the scene. Everything else (the sky, the land, the marks, the light) works in azimuths and asks the camera.
 *
 * Across, the scene is cylindrical and linear in azimuth: `pxPerDeg` scene px a degree, `heading` in the middle.
 * `handed` says which way the azimuth grows on screen: +1 is a true camera (turning right, clockwise, moves right);
 * −1 is the scene as drawn since the start: west on the left, east on the right, south in the middle, as if the
 * southern sky were seen in a mirror while facing north (`docs/design/scene-2-5d-plan.md` §1).
 *
 * Up is not the camera's business yet: every angle goes through `anglePx` (`data/terrain/angleScale.ts`).
 * See `docs/design/camera-fable.md` for where this is going (a 360° world and a turning view).
 */
export interface Camera {
  /** Azimuth (deg) at the middle of the scene. */
  heading: number
  /** +1: azimuth grows to the right (a true camera); −1: it grows to the left (the mirrored scene). */
  handed: 1 | -1
  /** Scene px per degree of azimuth. */
  pxPerDeg: number
  /** Scene width in scene px (the drawing box; the SVG stretches it to the screen). */
  width: number
}

/**
 * The scene: facing south, as an eye there sees it (east on the left, west on the right), 135 px per 90° over 375 px
 * (250° in view). Until 2026-11 it was drawn mirrored (east on the right): see `STORED_CAMERA`.
 */
export const SCENE_CAMERA: Camera = { heading: 180, handed: 1, pxPerDeg: 135 / 90, width: 375 }

/**
 * The order the south panorama is stored and recorded in (west-north-west first): the old mirrored scene's. Fixed, so
 * stored and recorded panoramas stay valid; `terrainFromPanorama` turns them into the scene's order.
 */
export const STORED_CAMERA: Camera = { heading: 180, handed: -1, pxPerDeg: 135 / 90, width: 375 }

/** Which side of the screen a compass side (east or west) is on for a camera facing roughly south or north. */
export function screenSide(side: 'east' | 'west', c: Camera = SCENE_CAMERA): 'left' | 'right' {
  return xOf(side === 'east' ? 90 : 270, c) < c.width / 2 ? 'left' : 'right'
}

/** Degrees in (−180, 180]. */
export function wrap180(degrees: number): number {
  return ((((degrees + 180) % 360) + 360) % 360) - 180
}

/** Degrees of azimuth across the whole width. */
export const spanDeg = (c: Camera = SCENE_CAMERA) => c.width / c.pxPerDeg

/** Azimuth (deg) at the left edge (x = 0). */
export const leftAzimuth = (c: Camera = SCENE_CAMERA) => c.heading - (c.handed * spanDeg(c)) / 2

/**
 * Scene x of a direction, measured around the heading: the seam is straight behind the view, so a body that passes
 * behind (the sun at midnight) leaves one edge and comes back at the other.
 */
export function xOf(azimuth: number, c: Camera = SCENE_CAMERA): number {
  const fromHeading = ((((azimuth - c.heading) % 360) + 540) % 360) - 180
  return c.width / 2 + (c.handed * (c.pxPerDeg * fromHeading))
}

/**
 * Fraction of the width (0 at the left edge) of a direction, measured from the left edge onward: in view between 0 and
 * 1, and above 1 for everything out of view (never negative). Used for things that sit on the land's rays.
 */
export function fractionOf(azimuth: number, c: Camera = SCENE_CAMERA): number {
  return (((c.handed * (azimuth - leftAzimuth(c)) + 360) % 360)) / spanDeg(c)
}

/** Azimuth (deg) at a fraction of the width (0 at the left edge); not wrapped to [0, 360). */
export function azimuthAt(fraction: number, c: Camera = SCENE_CAMERA): number {
  return leftAzimuth(c) + (c.handed * spanDeg(c)) * fraction
}

/** cos and sin of the heading, exact on the compass points (so today's scene computes exactly what it always did). */
function headingTrig(c: Camera): [number, number] {
  const h = ((c.heading % 360) + 360) % 360
  if (h === 0) return [1, 0]
  if (h === 90) return [0, 1]
  if (h === 180) return [-1, 0]
  if (h === 270) return [0, -1]
  return [Math.cos((h * Math.PI) / 180), Math.sin((h * Math.PI) / 180)]
}

/** How much a direction points to the scene's right: +1 at the right edge's side, −1 at the left's (sin of the turn). */
export function lateral(azimuth: number, c: Camera = SCENE_CAMERA): number {
  const [cosH, sinH] = headingTrig(c)
  const a = (azimuth * Math.PI) / 180
  return c.handed * (Math.sin(a) * cosH - Math.cos(a) * sinH)
}

/** How much a direction points into the scene: +1 straight at the heading, −1 straight behind (cos of the turn). */
export function toward(azimuth: number, c: Camera = SCENE_CAMERA): number {
  const [cosH, sinH] = headingTrig(c)
  const a = (azimuth * Math.PI) / 180
  return Math.cos(a) * cosH + Math.sin(a) * sinH
}

/**
 * Where the "sea level" note stands below sea level (no sea in view): over the open side of the Rift, which was drawn
 * on the right when east was; it follows east.
 */
export const SEA_LABEL_SIDE: 'left' | 'right' = screenSide('east')
