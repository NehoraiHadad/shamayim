import type { Box, RGB, Streak } from '../../../model/types'
import type { Ctx2D } from '../../shared/base/hand'
import { paintStreaks, running, type Trace } from '../../shared/land/water'

/*
 * Waves on water, a train of them from each of the model's own strokes (its place, strength and drift; as many as the wind
 * raises): far off long low swells, near the eye shorter wavelets that break in pieces, each with a face to the low sky and
 * a dark one to the high. The wind's gusts gather them, with slicks between. Pure: a stroke and its place.
 */

/** The water the waves lie on: its far and near rows, the labels' boxes, and how long a wave is of its stroke, far and near. */
export interface Water { top: number; bottom: number; clear?: readonly Box[]; long: readonly [number, number] }

/** A wave's height (px) far and near, in hairs at least one and at most a share of its length; from which depth it breaks; a piece's share of its place. */
const HIGH = [0.45, 1.4] as const, STEEP = 0.16, BREAK = 0.3, PIECE = 0.82
/** The crests of a train, the px between them far and near, and how far each is out of line (of its length). */
const TRAIN = [0, -1, 1], APART = [0.9, 4.2] as const, ASKEW = 0.42
/** How far a slick takes a stroke's strength down. */
const SLICK = 0.7

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const depthAt = ({ top, bottom }: Water, y: number) => Math.min(1, Math.max(0, (y - top) / Math.max(1, bottom - top)))

/** The share of the wind's gusts at a place: slow along the water, quicker down it. */
function gust(x: number, y: number): number {
  const v = Math.sin(x * 0.051 + 2.3 * Math.sin(y * 0.19)) + Math.sin(x * 0.127 - y * 0.43 + 1.7)
  return 1 - SLICK * Math.min(1, Math.max(0, 0.5 - 0.5 * v))
}

/** A low crest's form, of its length and height: pointed at its ends, its top rounder than its foot. */
const CREST = [[0.28, -0.42], [0.58, -0.46], [1, 0], [0.5, 0.25]] as const

/** A low crest from its left end, along (tx, ty). */
export function crest(ctx: Ctx2D, x: number, y: number, w: number, h: number, tx = 1, ty = 0): void {
  ctx.moveTo(x, y)
  for (const [u, v] of CREST) ctx.lineTo(x + u * w * tx - v * h * ty, y + u * w * ty + v * h * tx)
}

const wave = (water: Water, by: number, train: readonly number[]): Trace => (ctx, s, hair, i) => {
  const d = depthAt(water, s.y), long = s.w * lerp(water.long[0], water.long[1], Math.sqrt(d)), odd = Math.sin(i * 2.4)
  const pieces = d < BREAK ? 1 : 2 + i % 2
  for (const row of train) {
    const w = long * (1 - 0.3 * Math.abs(row)), step = w / pieces, h = Math.max(hair, Math.min(lerp(HIGH[0], HIGH[1], d), step * STEEP))
    const x = s.x + (s.w - w) / 2 + row * ASKEW * odd * w, y = s.y + row * (0.8 + 0.3 * odd) * lerp(APART[0], APART[1], d) + by * h
    if (y < water.top || water.clear?.some((b) => x < b.x + b.w && x + w > b.x && y - 2 * h < b.y + b.h && y + 2 * h > b.y)) continue
    for (let n = 0; n < pieces; n++) {
      const off = pieces > 1 ? Math.sin(i * 2.4 + n * 1.9 + row) : 0
      crest(ctx, x + step * (n + 0.12 * off), y + off * h * 0.7, step * (pieces > 1 ? PIECE : 1), h)
    }
  }
}

/** What a ripple keeps of its strength where its cycle ends. */
const LEFT = 0.3

/** The ripples at this point of the loop, each from nothing to nothing: a train is seen where a hair's jump is not. */
export function rising(streaks: readonly Streak[], t: number, drift: number, offset: number): Streak[] {
  return running(streaks, t, drift, offset).map((s, i) => ({ ...s, alpha: Math.max(0, (s.alpha - LEFT * streaks[i].alpha) / (1 - LEFT)) }))
}

/** Waves of one face; `other` is the face beneath it (its ink and its share of the strength). */
export function layWaves(ctx: Ctx2D, water: Water, streaks: readonly Streak[], face: RGB, other: readonly [RGB, number], hair: number, strength: number): void {
  const at = (share: number) => streaks.map((s) => ({ ...s, alpha: Math.min(0.75, s.alpha * strength * share * gust(s.x, s.y)) }))
  paintStreaks(ctx, at(other[1]), other[0], hair, wave(water, 0.8, [0]))
  paintStreaks(ctx, at(1), face, hair, wave(water, 0, TRAIN))
}

/** The light's sparks, as crests. */
export const sparkle: Trace = (ctx, s, height) => crest(ctx, s.x - s.w * 0.15, s.y, s.w * 1.3, height)
