import type { Box, RGB, Streak } from '../../../model/types'
import type { Ctx2D } from '../../shared/base/hand'
import { paintStreaks, type Trace } from '../../shared/land/water'

/*
 * Waves on water, from the model's own strokes (their place, number, strength and drift): far off long low swells, near the
 * eye shorter wavelets that break in pieces, each with a face to the low sky and a dark one to the high. The wind's gusts
 * gather them, with slicks between. Pure: a stroke and its place.
 */

/** The water the waves lie on: its far and near rows, the labels' boxes, and how long a wave is of its stroke, far and near. */
export interface Water { top: number; bottom: number; clear?: readonly Box[]; long: readonly [number, number] }

/** A wave's height (px) far and near, in hairs at least one; from which depth the waves break; a piece's share of its place. */
const HIGH = [0.45, 1.5] as const, BREAK = 0.3, PIECE = 0.82
/** How far a slick takes a stroke's strength down. */
const SLICK = 0.7

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const depthAt = ({ top, bottom }: Water, y: number) => Math.min(1, Math.max(0, (y - top) / Math.max(1, bottom - top)))

/** The share of the wind's gusts at a place: slow along the water, quicker down it. */
function gust(x: number, y: number): number {
  const v = Math.sin(x * 0.051 + 2.3 * Math.sin(y * 0.19)) + Math.sin(x * 0.127 - y * 0.43 + 1.7)
  return 1 - SLICK * Math.min(1, Math.max(0, 0.5 - 0.5 * v))
}

/** A low crest: pointed at its ends, its top rounder than its foot. */
export function crest(ctx: Ctx2D, x: number, y: number, w: number, h: number): void {
  ctx.moveTo(x, y)
  ctx.quadraticCurveTo(x + w * 0.45, y - h, x + w, y)
  ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.5, x, y)
}

const wave = (water: Water, by: number): Trace => (ctx, s, hair, i) => {
  const d = depthAt(water, s.y), w = s.w * lerp(water.long[0], water.long[1], Math.sqrt(d)), h = Math.max(hair, lerp(HIGH[0], HIGH[1], d))
  const x = s.x + (s.w - w) / 2, y = s.y + by * h
  if (water.clear?.some((b) => x < b.x + b.w && x + w > b.x && y - 2 * h < b.y + b.h && y + 2 * h > b.y)) return
  const pieces = d < BREAK ? 1 : 2 + i % 2, step = w / pieces
  for (let n = 0; n < pieces; n++) {
    const off = pieces > 1 ? Math.sin(i * 2.4 + n * 1.9) : 0
    crest(ctx, x + step * (n + 0.12 * off), y + off * h * 0.7, step * (pieces > 1 ? PIECE : 1), h)
  }
}

/** Waves of one face; `other` is the face beneath it (its ink and its share of the strength). */
export function layWaves(ctx: Ctx2D, water: Water, streaks: readonly Streak[], face: RGB, other: readonly [RGB, number], hair: number, strength: number): void {
  const at = (share: number) => streaks.map((s) => ({ ...s, alpha: Math.min(0.75, s.alpha * strength * share * gust(s.x, s.y)) }))
  paintStreaks(ctx, at(other[1]), other[0], hair, wave(water, 0.8))
  paintStreaks(ctx, at(1), face, hair, wave(water, 0))
}

/** The light's sparks, as crests. */
export const sparkle: Trace = (ctx, s, height) => crest(ctx, s.x - s.w * 0.15, s.y, s.w * 1.3, height)
