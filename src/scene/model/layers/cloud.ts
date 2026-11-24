import type { RGB } from '../../../world/types'
import type { CloudSprite } from '../cloudSprite'
import type { LayerBase } from './base'

export type CloudLayers =
  /**
   * One field layer drawn as a continuous sheet over the dome (SPEC §6.0), in sky px. A grid of screen rays: `xs` the
   * column centres, `ys` the row centres (top to bottom, denser toward the horizon, where the deck compresses). Per node
   * (row-major, `ys.length × xs.length`): `alpha` the drawn coverage after the soft threshold, 0–1; `tone` 0 lit to 1
   * shade (from τ and the light at the node). `body`, `shade` and `lit` the layer's colours at this hour.
   */
  | LayerBase & { kind: 'cloudSheet'; lattice: 'low' | 'tower' | 'mid' | 'high'; genus: string
      xs: number[]; ys: number[]; alpha: number[]; tone: number[]; body: RGB; shade: RGB; lit: RGB
      /** By night, the towns' light on each texel: its tone and its weight (row-major, 0–1). */
      city?: { rgb: RGB; weight: number[] }
      /** Per row of `ys`: how fast the wind carries it across, surface px/s (+ left → right). */
      speeds: number[]
      /** In a dusty air, per row of `ys`: the share of the sheet's light the dust before it lets through (0–1). */
      through?: number[] }
  /** The field's towers as sprites (sky px, far first), each at its cell's place and its across-wind speed (px/s). */
  | LayerBase & { kind: 'cloudCells'; lattice: 'tower'; cells: { sprite: CloudSprite; x: number; y: number; speed: number }[] }
