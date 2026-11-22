import type { WorldState } from '../../world/types'
import type { RadianceWorld } from './landRadiance'
import type { ShadowTerrain } from './planeCloudShadow'

export const supports = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const
export type ShadowWorld = Pick<WorldState, 'cloudField' | 'camera'> & {
  flightTerrain?: WorldState['flightTerrain']
  light: Pick<WorldState['light'], 'azimuth' | 'altitude' | 'direct'>
    & Partial<Pick<WorldState['light'], 'source' | 'shares' | 'diffuse' | 'colour' | 'ambient' | 'palette' | 'dir'>>
  ground?: WorldState['ground']
  air?: RadianceWorld['air']
  bodies?: Pick<WorldState['bodies'], 'sun' | 'moon'>
  terrain: ShadowTerrain
}

export type Projection = { x: number; km: number; eastKm: number; northKm: number; seaLevelM: number }
