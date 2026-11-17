import { seat } from '../../../data/landmarks/seat'
import type { PlacedMark } from '../../../data/landmarks/types'
import { fieldReach } from './generic/buildingSpecs'
import { curated, planeOf, specOf } from './hillPlane'

/** A drawn box in scene px (y grows down). */
export interface Box { left: number; right: number; top: number; bottom: number }

const clamp = (value: number) => Math.max(0, Math.min(1, value))
export const FAR_SCALE = .6

export function overlaps(a: Box, b: Box, pad = 0) {
  return a.left < b.right + pad && b.left < a.right + pad && a.top < b.bottom + pad && b.top < a.bottom + pad
}

export function boxAround(x: number, y: number, half: number): Box {
  return { left: x - half, right: x + half, top: y - half, bottom: y + half }
}

/** Where a building-like mark stands at px x: plane, drawn height, scale, base and its box (ILLUSTRATION.md §2). */
export function markGeometry(mark: PlacedMark, x: number, ground: (x: number) => number, far = false) {
  const spec = specOf(mark)
  if (!spec) return null
  const plane = far ? 'line' : planeOf(mark)
  const depth = clamp(Math.abs(mark.dy) / 1.5)
  const h = spec.h(far ? mark.hPx / FAR_SCALE : mark.hPx)
  const scale = far ? FAR_SCALE : plane === 'behind' ? 1 - .2 * depth : 1
  const seated = seat(ground, x, spec.w * scale, 0, far || curated(mark) || Boolean(mark.absorbed))
  if (!seated) return null
  const base = (plane === 'face' ? ground(x) + 3 + 9 * depth
    : seated.baseY + (plane === 'behind' ? .25 * depth * h * scale : 0)) - (mark.lift ?? 0)
  const half = spec.w * scale / 2
  return { spec, plane, h, scale, base, box: { left: x - half, right: x + half, top: base - h * scale, bottom: base } }
}

/** A field patch's depth under the crest: its own fit, else deeper the further it lies from the section line. */
export function fieldDepthOf(mark: PlacedMark) {
  return mark.fieldDepth ?? 2 + 6 * clamp(Math.abs(mark.dy) / 1.5)
}

/** The box a field of width w at x covers at a given depth under the ground (fields.tsx). */
export function fieldBox(kind: string, x: number, w: number, depth: number, ground: (x: number) => number): Box {
  const xs = [0, .25, .5, .75, 1].map((t) => x - w / 2 + t * w)
  const ys = xs.map(ground)
  return { left: x - w / 2, right: x + w / 2, top: Math.min(...ys) + depth - 1.6, bottom: Math.max(...ys) + depth + fieldReach(kind) }
}
