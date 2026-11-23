import { plantWindAt, plantWindFade, treeTravel, tuftTravel, type PlantWind } from '../../../model/landWind'
import { palmBend, PALM_CROWN_HEIGHT } from '../../../model/vegShapes'
import { h01 } from './vegInk'

interface CrownAnchor { cx: number; cy: number; rx: number; ry: number }

/** Shared crown centre & radii used identically by `paintVegCrowns` (form) and `paintPlaneLight` (sun catchlight). */
export function treeCrownAnchor(x: number, y: number, r: number, height: number, phase: number, kind: number, bend = 0): CrownAnchor {
  if (kind === 3) {
    return { cx: x + palmBend(r, phase) + bend, cy: y - height * PALM_CROWN_HEIGHT, rx: r * 1.05, ry: r * 0.62 }
  }
  // Vary woodland (kind 0) silhouette aspect subtly within `treeExtent` (conifer domes alongside broader oaks).
  const rx = kind === 0 ? r * (1.02 + 0.14 * Math.sin(phase * 1.3))
    : kind === 1 ? r * 1.18 : kind === 2 ? r * 0.98 : r * 1.06
  const ry = kind === 0 ? r * (0.84 + 0.08 * Math.cos(phase * 1.7))
    : kind === 1 ? r * 0.78 : kind === 2 ? r * 0.92 : r * 0.86
  return { cx: x + bend, cy: y - ry * 0.55, rx, ry }
}

export function treeBend(kind: number, height: number, vis: number, phase: number, wind: PlantWind | undefined, time: number): number {
  return wind ? treeTravel(kind, height) * plantWindFade(vis) * plantWindAt(wind, time, phase) : 0
}

export function tuftBend(seed: number, x: number, y: number, kind: number, r: number, vis: number,
  wind: PlantWind | undefined, time: number): number {
  if (!wind) return 0
  const phase = h01(seed, x, y, 23) * 2 * Math.PI
  return tuftTravel(kind, r) * plantWindFade(vis) * plantWindAt(wind, time, phase)
}

/** The upper tuft's lit dab and its solar catchlight share this fraction of the blade tip bend. */
export const TUFT_CROWN_BEND = 0.30
