import type { WorldState } from '../../world/types'
import type { ShadowTerrain } from './cloudShadowLayers'

export const supports = [[1, 0], [-1, 0], [0, 1], [0, -1]]
export type ShadowWorld = Pick<WorldState, 'cloudField' | 'camera'> & {
  flightTerrain?: WorldState['flightTerrain']
  light: Pick<WorldState['light'], 'azimuth' | 'altitude' | 'direct'>
  terrain: ShadowTerrain
}

export type Projection = { x: number; km: number; eastKm: number; northKm: number; seaLevelM: number }
