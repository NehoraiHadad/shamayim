import type { GlyphKind } from '../../../world/glyphSpecs'
import type { RGB } from '../../../world/types'
import type { GlyphSurfaces } from '../glyphSurfaces'
import type { DomeFloodlight } from '../metalLight'
import type { NeighbourEvidence } from '../neighbourEvidence'
import type { LayerBase } from './base'

/**
 * The colours a glyph, a house or a tree is painted in (stage C4), after the light and the air at its distance: the
 * scene's hand cut from the ridge colour and lifted toward the sky (walls), the light's colour on the faces turned to
 * it (`lit`), the sky-lit dark on the others (`shade`), and the materials (stone, glass, tile, foliage, panels, the Báb's
 * gold, lamps).
 */
export interface Tones {
  wall: RGB; lit: RGB; shade: RGB; deep: RGB; rim: RGB
  roof: RGB; roofLit: RGB; stone: RGB; stoneLit: RGB; glass: RGB; glassLit: RGB; soot: RGB
  green: RGB; greenLit: RGB; panel: RGB
  /** A lit window, a lamp. */
  win: RGB
  /** The foot mist: the air at the glyph's distance. */
  mist: RGB
}

/**
 * The light every glyph of a layer shares (one world light): how dark it is, how strong the direct light, the cast
 * shadow (across per px of height, away from the light; `alpha` 0 under overcast), the share of windows lit, the
 * aviation lights, the lean of trees and palms in the wind (rad, + leans right).
 */
export interface Shine {
  night: number
  direct: number
  /**
   * The living light: the light each face takes by its normal (`livingLight.ts` `faceLight`, 0–1, the direct share in it):
   * the front (toward the eye), the left and right sides, the top; `rim` a back-lit edge's; `across` the light's signed
   * side (−1 left … 1 right, 0 straight ahead or behind or with no direct light). Painters mix each face from its base
   * toward `Tones.lit` by its own share. Glyphs use `left - right` as signed light in screen space.
   */
  faces: { front: number; left: number; right: number; top: number; rim: number; across: number }
  /** A low sun's glint in the windows of the faces turned to it (0–1). */
  glint?: number
  /**
   * For a hand that lays the cast on the ground: `toward`, the share of its run that comes toward the eye (0–1, a light
   * ahead of it); `run`, its whole run on level ground per px of height (`length` is the run across the screen alone).
   */
  cast: { dx: number; length: number; alpha: number; toward?: number; run?: number }
  /** How far the place's walls are faced in its own limestone (0–1, by where it stands, not the light), for a hand that paints it. */
  stone?: number
  windows: number
  /** Continuous aviation lamp strength (0–1). */
  aviationStrength: number
  lean: number
  /** C7: how far (rad) trees sway about their lean in the gusts, over the portrait's strip of frames; 0 in a calm. */
  sway?: number
}

export interface GlyphDesc extends NeighbourEvidence {
  kind: GlyphKind
  /** Centre x and base y (px); drawn height in glyph px; px per glyph px; box width (px). */
  x: number
  base: number
  h: number
  scale: number
  w: number
  seed: number
  /** Fixed horizontal orientation in the scene, from the mark seed or its known orientation. */
  hand: 1 | -1
  tones: Tones
  surfaces?: GlyphSurfaces
  gilding?: RGB[][]
  floodlitDome?: DomeFloodlight
  windowWall?: RGB
  shadowTones?: Pick<Tones, 'deep' | 'shade'>
  famous: boolean
  /** A field's ground under it: y (px, relative to `base`) every glyph px across its width, west to east. */
  ground?: number[]
}

/** A tree (px): `x` its centre. */
export interface TreeDesc { kind: 'tree' | 'cypress' | 'palm'; x: number; base: number; w: number; h: number; seed: number }

export type TownLayers =
  | LayerBase & { kind: 'marks'; glyphs: GlyphDesc[]; shine: Shine }
