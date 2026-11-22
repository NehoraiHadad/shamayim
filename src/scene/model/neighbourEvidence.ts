import type { MarkTerrainEvidence } from '../../world/markTerrainEvidence'
/** Measured neighbour presentation; owned portraits retain factor 1. */
export interface NeighbourEvidence extends MarkTerrainEvidence {
  /** Drawn / physical-visible height; owned glyphs retain factor 1. */
  factor: number
  /** True-distance material contrast; absent for owned portraits and ordinary neighbours. */
  contrast?: number
  trueHeightPx?: number
  trueDistanceKm?: number
  hazeKm?: number
  sourceId?: string
  supportId?: string
  town?: boolean
}
