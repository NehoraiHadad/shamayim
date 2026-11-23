import type { BuildingFaces, accessoryTones } from '../buildingLight'
import type { CityTier } from '../cityMass'
import type { RGB } from '../../../world/types'
import type { LayerBase, Plain } from './base'
import type { OutsideLandDesc } from './land'
import type { GlyphDesc, Shine, Tones, TreeDesc } from './town'
import type { SeaDesc } from './water'

/** A block of a far town (or a far tower), standing on `base`, `km` away. */
export interface CityBlock { x: number; base: number; w: number; h: number; km: number; receiver: number; detail: number }
/** A lit window of a far town by night: a point with a faint halo, through the haze (Allard). */
export interface CityLight { x: number; y: number; r: number; alpha: number }
/**
 * One thing of the place seen from outside (stage C5), in paint order (back to front), screen px, its tones by `tier`
 * (the layer's tones per distance): a built square of the mass (`box`: its front from `top` to `foot`, `storeys` from its
 * real roof height, `folded` a tower folded into the mass), a tower (`full`: the famous or ≥ 150 m, a full tower; else a
 * spire's silhouette; `crown` 0 flat, 1 a setback, 2 a mast), or a mark of the place (a glyph or an icon, its own tones).
 */
export type OutsideItem =
  | { kind: 'box'; x: number; w: number; top: number; foot: number; tier: number; seed: number; storeys: number; folded: boolean
      /** A house's roof (tile or flat, a heater on some flat ones); null for a block of the mass. */
      roof: 'tile' | 'flat' | null; heater: boolean
      /** C9: a block of a town beyond the place (drawn behind it, far first). */
      beyond?: true; receiver: number; neighbours?: number }
  | { kind: 'tree'; tree: TreeDesc; tier: number }
  | { kind: 'tower'; x: number; base: number; w: number; h: number; tier: number; seed: number; crown: 0 | 1 | 2; full: boolean
      famous: boolean; storeys: number; receiver: number; industrial?: true }
  | { kind: 'mark'; glyph: GlyphDesc }

export type OutsideLayers =
  | LayerBase & { kind: 'farCities'; tiers: CityTier[]; lights: CityLight[]; lightRgb: RGB }
  | LayerBase & { kind: 'outside'; items: OutsideItem[]; tiers: Tones[]; sea: SeaDesc | null; shine: Shine
      /** The place's own ground over the ridge line (C5b + Stage 3): its top/base lines, living-land tone stops and crest. */
      land: OutsideLandDesc | null
      receivers: Record<number, BuildingFaces>[]; accessories: (ReturnType<typeof accessoryTones> | null)[]
      /** What a style's own light adds, for its painter alone (`OutsideLook.own`). */
      own?: Plain }
