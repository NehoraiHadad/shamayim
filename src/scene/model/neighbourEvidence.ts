import type { MarkTerrainEvidence } from '../../world/markTerrainEvidence'
/** Measured neighbour presentation; owned portraits retain factor 1. */
export interface NeighbourEvidence extends MarkTerrainEvidence {
  /** Source ownership survives descriptor projection; famous owned portraits keep their original lighting. */
  nonOwn?: boolean
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
