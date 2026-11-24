import type { RGB } from '../../../world/types'
import type { AnimSpec, Lay } from './motion'

/**
 * CSS px. `width` is the land figure's; `landTop` (and `landLeft`) where the figure's top-left stands in the sky surface;
 * `skyWidth` the sky surface's width when it differs from the figure's (the app's sky spans the window, the figure a
 * column); `dpr` the device pixel ratio.
 */
export interface SceneBox { width: number; skyHeight: number; landTop: number; landHeight: number; dpr: number
  skyWidth?: number; landLeft?: number }

export interface Box { x: number; y: number; w: number; h: number }

/** Plain data: what a worker's message carries as it is. */
export type Plain = string | number | boolean | null | undefined | readonly Plain[] | { readonly [key: string]: Plain }

export type LayerId = string
export type Surface = 'sky' | 'land' | 'wear'

/**
 * The light part of a light-dependent layer (the scrub split, §1d): the layer's own `key` covers its form only (fills,
 * texture: no light), this `key` covers what the light changes. The compositor repaints the light canvas alone when only
 * this key changes, and lays it over the form with `blend`; the light painter keeps inside the form's shape.
 */
export interface LightPart {
  key: string
  /** How the light canvas meets the form under it (`source-over` covers it; the planes lay theirs on with `source-over`). */
  blend: 'source-over' | 'multiply' | 'screen' | 'overlay' | 'soft-light'
  /** Optional layer tone after light and haze (omitted on terrain planes). */
  tint?: RGB
}

export interface LayerBase {
  id: LayerId
  surface: Surface
  /** Draw order within its surface, low first. */
  z: number
  /** A hash of the layer's exact inputs (box and dpr included, never `phase`): repainted only when it changes. */
  key: string
  /** The layer's extent in its surface's px: its cached canvas is this size × the cache's pixel ratio. */
  bounds: Box
  animated?: AnimSpec
  /** Cached at `min(dpr, 2)`: soft layers (sky, clouds, mist) lose nothing to it. */
  soft?: boolean
  light?: LightPart
  /** Laid where its object is now (`Lay`): the layer's bounds and coordinates are round its own origin. */
  placed?: Lay
  /** How its canvas meets the surface under it (`source-over` when absent). */
  blend?: 'source-over' | 'source-atop' | 'multiply' | 'lighter'
}
