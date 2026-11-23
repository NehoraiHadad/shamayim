import type { RGB } from '../../world/types'
import type { SceneStyle } from '../sceneStyle'

/** A 2D context: the visible canvas's, or an offscreen layer's. */
export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

/**
 * The enriched hand (§1c): what painters add on top of the model's geometry and colours. Parameterised by tones from the
 * model, never by moment names. The drawing helpers ported from the anidoodle skill are in `core.ts`; the land's
 * texture, washes and soft edges in `planes.ts` (after `prototypes/canvas-scene/styleRich.ts`).
 */
export interface Hand {
  /** The ground texture's strength (0: none, 1: as the model gives it). */
  grain: number
}

export const HAND: Hand = { grain: 1 }

/** A scratch surface a painter may ask for (a glyph sprite, a puff): the painter never creates one itself. */
export interface Scratch { canvas: OffscreenCanvas | HTMLCanvasElement; ctx: Ctx2D }

/**
 * What a painter is given besides its context and its layer (the anidoodle contract, `references/determinism-and-
 * contract.md`): a painter is a pure function of `(desc, env)`. No clock (time is `phase`, seconds from the loop), no
 * `Math.random` (seeded from the desc's seeds), no DOM, no `ctx.filter`, no `new OffscreenCanvas`/`new Image`: scratch
 * surfaces come from `env.canvas()`, sized in device px (`scale` device px per scene px).
 */
export interface PaintEnv {
  hand: Hand
  /** The scene's style (`real` when not given); the layers a style paints its own way stand in `drawn/index.ts`. */
  style?: SceneStyle
  /** Seconds since the loop started (animated layers); 0 for a still. */
  phase: number
  /** Device px per scene px on the canvas being painted (the layer's cache ratio). */
  scale: number
  canvas(w: number, h: number): Scratch
}

const byte = (c: number) => Math.round(Math.min(1, Math.max(0, c)) * 255)

/** sRGB 0–1 (and alpha) → a CSS colour. */
export function css(rgb: RGB, alpha = 1): string {
  return alpha >= 1 ? `rgb(${byte(rgb[0])} ${byte(rgb[1])} ${byte(rgb[2])})`
    : `rgb(${byte(rgb[0])} ${byte(rgb[1])} ${byte(rgb[2])} / ${Math.max(0, alpha).toFixed(3)})`
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

/** Traces a closed outline. */
export function outline(ctx: Ctx2D, points: readonly (readonly [number, number])[]) {
  ctx.beginPath()
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.closePath()
}
