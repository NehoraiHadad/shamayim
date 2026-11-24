import type { RGB } from '../../../world/types'
import type { CloudSprite } from '../cloudSprite'
import type { Lamp } from './lamp'
import type { LayerBase } from './base'

/**
 * Where a sheet's nodes lie in the air it is made of, for marks that go with the cloud (a hand asks for it,
 * `StyleLight.cloudAir`). A node's ground place (km east, north) is its row's `ranges` along its column's look; in the air it
 * is that less the wind's carry `d` (`airAt`). One carry for the whole layer: a row is faster than the next only as seen.
 * Within half an hour of midnight two airs are drawn, one over the other, each by its `weight` (they sum to 1): so are the marks.
 */
export interface CloudAir {
  /** Per row of `ys`: km over the ground. */
  ranges: number[]
  /** Per column of `xs`: the unit look. */
  east: number[]; north: number[]
  frames: { d: [eastKm: number, northKm: number]; weight: number }[]
}

export type CloudLayers =
  /**
   * One field layer drawn as a continuous sheet over the dome (SPEC §6.0), in sky px. A grid of screen rays: `xs` the
   * column centres, `ys` the row centres (top to bottom, denser toward the horizon, where the deck compresses). Per node
   * (row-major, `ys.length × xs.length`): `alpha` the drawn coverage after the soft threshold, 0–1; `tone` 0 lit to 1
   * shade (from τ and the light at the node), `source` the light of a thick base there against its mean (linear, 1 where it
   * is not given). `body`, `shade` and `lit` the layer's colours at this hour.
   */
  | LayerBase & { kind: 'cloudSheet'; lattice: 'low' | 'tower' | 'mid' | 'high'; genus: string
      lamp?: Lamp
      air?: CloudAir
      xs: number[]; ys: number[]; alpha: number[]; tone: number[]; source?: number[]; body: RGB; shade: RGB; lit: RGB
      /** By night, the towns' light on each texel: its tone and its weight (row-major, 0–1). */
      city?: { rgb: RGB; weight: number[] }
      /** Per row of `ys`: how fast the wind carries it across, surface px/s (+ left → right). */
      speeds: number[]
      /** In a dusty air, per row of `ys`: the share of the sheet's light the dust before it lets through (0–1). */
      through?: number[]
      /** By day, how far the sun stands above the twilight's last degrees (0–1). */
      daylit?: number
      /** Px its last row goes on down, as it stands at eye level, to the far horizon of a place that looks down on it. */
      below?: number }
  /** The field's towers as sprites (sky px, far first), each at its cell's place and its across-wind speed (px/s). */
  | LayerBase & { kind: 'cloudCells'; lattice: 'tower'; cells: { sprite: CloudSprite; x: number; y: number; speed: number }[] }
