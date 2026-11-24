import type { Pt, RGB } from '../../../world/types'
import type { Lamp } from './lamp'
import type { Box, LayerBase } from './base'

/**
 * One stretch of water in view (C3): its surface between the far edge and the near edge (land px), and its colours down
 * the surface: the sky it mirrors (by the Fresnel share at that depression, the higher sky nearer the eye) over the
 * water's own dark, after the air at that distance. `rim`: the fine light line where the far edge meets the land or the
 * sea's own horizon.
 */
export interface WaterBand {
  points: Pt[]
  far: Pt[]
  top: number
  bottom: number
  /** 0 at `top` … 1 at `bottom`. */
  stops: [number, RGB][]
  rim: { rgb: RGB; alpha: number }
}
/** A short horizontal stroke on the water (a ripple, a spark): `x` its left end, `w` its length. */
export interface Streak { x: number; y: number; w: number; alpha: number }
/**
 * Wind ruffle: ripples catching the low sky (`light`) and the high sky (`dark`), their number and length by the wind; each
 * ripple runs `drift` px downwind over one loop of the water's strip of frames (C7), rising and falling as it goes.
 */
export interface Ruffle { light: RGB; dark: RGB; lit: Streak[]; shade: Streak[]; drift: number }
/** The light's path on the water under the sun or moon, widening toward the eye with the waves' slope. */
export interface GlintPath { x: number; top: number; bottom: number; spread: number; rgb: RGB; alpha: number; sparks: Streak[] }

/**
 * A coastal place's own sea seen from outside (C5): its outline (screen px), the water's tones down the band (far → near:
 * the sky mirrored by Fresnel over the water's dark, after the air), the shore's tone along the coast, the light's path
 * on it, ripples catching the low sky (`light`) and the high (`dark`).
 */
export interface SeaDesc {
  points: Pt[]
  coast: Pt[]
  top: number
  bottom: number
  stops: [number, RGB][]
  shore: RGB
  glint: { x: number; rgb: RGB; alpha: number; sparks: Streak[] } | null
  ripples: Streak[]
  /** C7: how far (px) a ripple runs downwind over one loop of the layer's strip (signed like the wind across). */
  drift?: number
  light: RGB
  dark: RGB
  /** The labels' boxes (see the water layer's). */
  clear?: readonly Box[]
  /** The sea's horizon: a fine light line, level, from the shore to the edge (C5b). */
  horizon: { y: number; x0: number; x1: number; rgb: RGB; alpha: number }
}

export type WaterLayers =
  | LayerBase & { kind: 'water'; bands: WaterBand[]; ruffle: Ruffle; glints: GlintPath[];
      /** The labels' boxes, which no stroke enters: for a hand whose strokes are longer than the model's. */
      clear?: readonly Box[];
      lamp?: Lamp }
