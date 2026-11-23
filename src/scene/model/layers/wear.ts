import type { Pt, RGB } from '../../../world/types'
import type { LayerBase } from './base'

/** Where the line is tied (surface px): the tab of ground and the turns of rope round it. */
export interface WearEnd { x: number; y: number; w: number; rgb: RGB; side: -1 | 1 }
/** A raindrop hanging under the rope (surface px). */
export interface WearBead { x: number; y: number; r: number }

/**
 * A garment or a piece of gear on the line (`model/wear.ts`), drawn in its own frame (`model/wearKit.ts`: (0, 0) where the rope
 * passes, y down) placed at `x`, `y` (surface px), turned `tilt` rad to the rope's chord between its pegs and scaled
 * `scale` (surface px per garment unit). Tones after the light, the night, the rain and the dust; `side` the screen
 * side the light comes from (−1 left, 1 right, 0 none) and `shine` how strongly.
 */
export interface WearItem {
  garment: string
  x: number
  y: number
  tilt: number
  scale: number
  /** The cloth stretched by its own wet weight (vertical scale, ≥ 1). */
  hang: number
  pegTilts: number[]
  side: -1 | 0 | 1
  shine: number
  /** The living light (`model/wear.ts` `wearLight`): the side light's signed strength, the light on the front, through the back, from above. */
  across: number
  front: number
  back: number
  up: number
  tones: { body: RGB; lit: RGB; shade: RGB; deep: RGB; rim: RGB; seam: RGB; edge: RGB; tag: RGB; peg: RGB; pegEdge: RGB
    pegLight: RGB; spring: RGB; glint: RGB; water: RGB; cord: RGB; glow: RGB }
  /** A neighbour's shadow on it (the light running along the line): its outline at (dx, dy) garment units, at `alpha`. */
  cast?: { garment: string; dx: number; dy: number; alpha: number }
  /** 0–1: rain on it (darker, beaded), snow lying on its shoulders, dust dulling it. */
  wet: number
  snow: number
  dust: number
  seed: number
}

export type WearLayers =
  /**
   * The "מה ללבוש" clothesline (`model/wear.ts`, painted by `paint/shared/wear/`), on its own surface in the card: the
   * rope (or the stretch of it in front of a hook's far arm, `part: 'bit'`), each garment as a sprite, and the drops that fall from wet cloth.
   */
  | LayerBase & { kind: 'wearRope'; part: 'line' | 'bit'; points: Pt[]; width: number; rgb: RGB; lay: RGB; ends: WearEnd[]
      beads: WearBead[]; snow: number; seed: number }
  | LayerBase & { kind: 'wearItem'; item: WearItem }
  | LayerBase & { kind: 'wearDrip'; x: number; y: number; r: number; rgb: RGB; lit: RGB }
