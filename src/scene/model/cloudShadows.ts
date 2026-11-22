//# allFunctionsCalledOnLoad
import { cloudLight } from '../../world/lightCloud'
import type { WorldState } from '../../world/types'
import type { PlaneCloudShadow, ShadowBox, ShadowPlane, ShadowTerrain } from './planeCloudShadow'
import { projectCloudShadows } from './cloudShadowProject'
import { EXPOSURE_GAMMA, landIrradiance, type RadianceWorld } from './landRadiance'

/**
 * Solar cloud-shadow policy & layer builder (Stage 7 round 2, split from `cloudShadowProject.ts`).
 * Explicitly solar-only: moonlight never projects solar cloud shadows. When paired with terrain `planes`,
 * each shadow layer removes ONLY the receiver's direct solar term before compression and linear haze.
 */
const RAD = Math.PI / 180

type ShadowWorld = Pick<WorldState, 'cloudField' | 'camera'> & {
  flightTerrain?: WorldState['flightTerrain']
  light: Pick<WorldState['light'], 'azimuth' | 'altitude' | 'direct'>
    & Partial<Pick<WorldState['light'], 'source' | 'shares' | 'diffuse' | 'colour' | 'ambient' | 'palette' | 'dir'>>
  ground?: WorldState['ground']
  air?: RadianceWorld['air']
  bodies?: Pick<WorldState['bodies'], 'sun' | 'moon'>
  terrain: ShadowTerrain
}

export function cloudShadowsOf(world: ShadowWorld, box: ShadowBox): PlaneCloudShadow[] {
  const { light, terrain, cloudField, camera, flightTerrain: grid } = world
  if (!cloudField || !grid) return []
  // Explicitly solar-only gate (Finding 7): a night moon never triggers solar cloud-shadow projection.
  const sunAlt = world.bodies?.sun.altitude ?? (light.source === 'moon' ? -1 : light.altitude)
  const sunAz = world.bodies?.sun.azimuth ?? light.azimuth
  if (sunAlt <= 0) return []
  const irr = world.ground && light.shares && light.palette && light.ambient && light.dir && light.diffuse !== undefined
    ? landIrradiance(world as RadianceWorld) : undefined
  const sunShare = irr?.eSunPi ?? light.shares?.sun ?? (light.source === 'moon' ? 0 : light.direct)
  if (sunShare <= 0) return []
  const { field } = cloudField
  const { open } = cloudLight({ low: 0, mid: 0, high: 0 }, field)
  if (open <= 0) return []

  // Visibility cutoff: skip cells whose max displayed luminance reduction is below 1/255.
  let maxDrop: number
  if (irr) {
    const sinA = Math.sin(sunAlt * RAD)
    const eLit = irr.eSunPi * sinA + irr.eSkyPi
    maxDrop = eLit > 1e-6 ? 1 - (irr.eSkyPi / eLit) ** EXPOSURE_GAMMA : 0
  } else {
    maxDrop = 1 - (1 / (1 + 7.62 * sunShare * Math.sin(sunAlt * RAD))) ** EXPOSURE_GAMMA
  }
  if (maxDrop < 1 / 255) return []
  const invSin = 1 / Math.sin(sunAlt * RAD)
  const minDepth = -Math.log(open * Math.max(1e-6, 1 - 1 / (255 * maxDrop))) / invSin
  const accepted = projectCloudShadows({ cloudField, grid, terrain, camera, box, azimuth: sunAz, altitude: sunAlt, minDepth })
  const received = new Map<ShadowPlane, PlaneCloudShadow>()
  for (const { plane, blob } of accepted) {
    let receiver = received.get(plane)
    if (!receiver) received.set(plane, receiver = { plane, open, blobs: [] })
    receiver.blobs.push(blob)
  }
  return [...received.values()]
}
