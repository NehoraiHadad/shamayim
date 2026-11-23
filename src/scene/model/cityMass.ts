import type { BuildingFaces } from './buildingLight'
import type { Box, CityBlock, RGB } from './types'

/** Painted far-city ground retains its source town and panorama-eye distance after visibility/text culls. */
export type CityGround = Box & { km?: number; townId?: number }
export interface CityMass { alpha: number; boxes: CityGround[] }

/**
 * The far towns at one distance (C3): their mass (the town as the eye resolves it: cells of the built-share field, one
 * strength step each) and the blocks rising from it with a lit face toward the light, in tones after the air at `km`;
 * drawn far to near.
 */
export interface CityTier { km: number; lit: RGB; shade: RGB; mass: CityMass[]; blocks: CityBlock[]; resolved?: Record<number, BuildingFaces>; unresolved?: RGB }
