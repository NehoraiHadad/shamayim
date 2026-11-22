import type { PlainPatch } from '../data/city/plainData'
import type { FarFootprint } from '../data/city/townFootprints'

/** A seen stretch of a built cell on the plain (`plainPatches`), with its cell's mean storeys (0 when unknown). */
export interface FarPatch extends PlainPatch { level: number; townId?: number }

/** A tower of the far raster in view: on the plain, or on the far ridge's crest (scene px; `km` from the eye). */
export interface FarTowerSite { x: number; top: number; base: number; km: number; heightM: number; onRidge: boolean }

/**
 * The towns beyond the near ridge (`farCities.ts`): the seen stretches of built cells on the plain, with their
 * distance,
 * built share and storeys, and the far raster's towers in view. Independent of the hour.
 */
export interface FarCities {
  footprints?: ReadonlyMap<number, FarFootprint>
  patches: FarPatch[]
  towers: FarTowerSite[]
  /** A place seen from outside keeps its own city to the outside view: the far towns start here (km), else null. */
  fromKm: number | null
  /** What is drawn of them (`townShapes`): the towns' mass by strength step, their blocks and towers, their lights. */
  shapes: {
    mass: { x: number; y: number; w: number; h: number; km: number; step: number; townId?: number }[]
    blocks: { x: number; base: number; w: number; h: number; km: number; heightM?: number; visiblePx?: number }[]
    lights: { x: number; y: number; r: number; alpha: number; km: number }[]
  }
}

