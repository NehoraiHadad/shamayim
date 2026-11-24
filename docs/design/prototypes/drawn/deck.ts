import { fractal, rng } from '../../../../src/scene/paint/shared/base/core'
import { css, mix, type Ctx2D } from '../../../../src/scene/paint/shared/base/hand'
import type { RGB } from '../../../../src/scene/model/types'
import { fieldAt, type SheetField } from '../../../../src/scene/paint/drawn/sheetField'
import { bump, carve, type P } from './carve'

/*
 * A closed deck from below, as the print has it: rolls one behind another, closing up toward the horizon as the model's rows
 * do, each a strip with a hanging scalloped foot, its ink wiped upward, here and there a key line along the foot where it is near. Where
 * the model's own tone is darker the strip hangs lower and its ink is deeper. Pure: the field, the tones, the seed.
 */

export interface DeckInks { local: RGB; half: RGB; foot: RGB; key: RGB; line: number }

/** A roll's height against the row spacing, at least and at most (px); how far tone and noise move its foot (against it). */
const ROLL = 2.6, LEAST = 4, MOST = 58, HANG = 1.1, BEND = 1.9, FREQ = 0.009
/** A scallop's width against the roll, its bulge, and the key line. */
const WIDE = 1.15, OUT = 0.13, LINE = 0.55, ALPHA = 0.3

/** The rolls over the whole field, the farthest first (the caller clips to where the deck is). */
export function paintDeck(ctx: Ctx2D, f: SheetField, mean: number, ink: DeckInks, seed: number): void {
  const row = (y: number) => Math.min(f.rows - 1, Math.max(0, ((y - f.y0) / f.height) * (f.rows - 1)))
  const toneAt = (x: number, y: number) => fieldAt(f.tone, f.cols, f.rows, ((x - f.x0) / f.width) * (f.cols - 1), row(y)) - mean
  let y = f.y0 + f.height
  for (let n = 0; y > f.y0 - MOST; n++) {
    const tall = Math.min(MOST, Math.max(LEAST, ROLL * f.spacing[Math.round(row(y))])), near = Math.min(1, tall / 26), r = rng(seed + n * 577)
    const foot: P[] = []
    for (let x = f.x0 - tall * r(); x < f.x0 + f.width + WIDE * tall; x += WIDE * tall * (0.25 + 1.5 * r() ** 2)) {
      const dark = -toneAt(x, y - tall / 2), bend = fractal(seed % 991, x, y, FREQ / (0.4 + near), 0.03, 2) - 0.5
      foot.push([x, y + tall * (BEND * bend + HANG * Math.max(-0.5, Math.min(0.5, 2.5 * dark)))])
    }
    // Scallops hang down: the way goes left to right, so the bulge is to its right; some are cut with a line, most are not.
    const scallops = foot.slice(1).map((b, i) => [...bump(foot[i], b, -OUT * (0.3 + 1.3 * r())), b]), edge = scallops.flat()
    const deep = 1 - 0.55 * (1 - near), wipe = ctx.createLinearGradient(0, y - 1.5 * tall, 0, y + 0.4 * tall)
    wipe.addColorStop(0, css(mix(ink.half, ink.local, 0.6 * deep)))
    wipe.addColorStop(0.45, css(ink.half))
    wipe.addColorStop(1, css(mix(ink.half, ink.foot, 0.6 * deep)))
    ctx.beginPath()
    edge.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)))
    ctx.lineTo(f.x0 + f.width + 2 * tall, y - 2.4 * tall)
    ctx.lineTo(f.x0 - 2 * tall, y - 2.4 * tall)
    ctx.fillStyle = wipe
    ctx.fill()
    ctx.beginPath()
    scallops.forEach((s, i) => { if (fractal(seed % 983, s[0][0], y, 0.02, 0.02, 1) > 0.5) carve(ctx, s, LINE * (0.5 + 0.5 * near), seed + n + i, 0.9) })
    ctx.fillStyle = css(ink.key, ALPHA * near * ink.line)
    ctx.fill()
    y -= tall * 0.9
  }
}
