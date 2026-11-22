//# allFunctionsCalledOnLoad
import { cloudLight } from '../../world/lightCloud'
import type { WorldState } from '../../world/types'
import { shadowLayers, type ShadowBox, type ShadowTerrain } from './cloudShadowLayers'
import { projectCloudShadows } from './cloudShadowProject'
import { EXPOSURE_GAMMA, FLAT_NORMAL, landIrradiance, litLandRgb, type RadianceWorld } from './landRadiance'
import type { LayerOf, RGB } from './types'

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
  air?: Pick<WorldState['air'], 'visibilityKm' | 'dustWeight'>
  bodies?: Pick<WorldState['bodies'], 'sun' | 'moon'>
  terrain: ShadowTerrain
}

function fallbackShadowRgb(world: ShadowWorld): RGB {
  const l = world.light
  if (l.shares && l.palette && l.colour && l.ambient && l.dir && l.diffuse !== undefined) {
    return litLandRgb({
      light: l as WorldState['light'], ground: world.ground ?? { wet: 0, snowLineM: null },
      bodies: world.bodies, air: world.air, camera: world.camera,
    } as RadianceWorld, [0.32, 0.34, 0.30], FLAT_NORMAL, 0, undefined, 0)
  }
  return [0.22, 0.25, 0.30]
}

export function cloudShadowLayers(world: ShadowWorld, box: ShadowBox, planes?: readonly LayerOf<'plane'>[]) {
  const { light, terrain, cloudField, camera, flightTerrain: grid } = world
  if (!cloudField || !grid) return []
  // Explicitly solar-only gate (Finding 7): a night moon never triggers solar cloud-shadow projection.
  const sunAlt = world.bodies?.sun.altitude ?? (light.source === 'moon' ? -1 : light.altitude)
  const sunAz = world.bodies?.sun.azimuth ?? light.azimuth
  const sunShare = light.shares ? light.shares.sun : (light.source === 'moon' ? 0 : light.direct)
  if (sunAlt <= 0 || sunShare <= 0) return []
  const { field } = cloudField
  const { open } = cloudLight({ low: 0, mid: 0, high: 0 }, field)
  if (open <= 0) return []

  // Visibility cutoff: skip cells whose max displayed luminance reduction is below 1/255.
  let maxDrop = 0.4
  if (light.shares && light.palette && light.colour && light.ambient && light.dir && light.diffuse !== undefined) {
    const irr = landIrradiance({
      light: light as WorldState['light'], ground: world.ground ?? { wet: 0, snowLineM: null },
      bodies: world.bodies, air: world.air, camera,
    })
    const sinA = Math.sin(sunAlt * RAD)
    const eLit = irr.eSunPi * sinA + irr.eSkyPi
    maxDrop = eLit > 1e-6 ? 1 - (irr.eSkyPi / eLit) ** EXPOSURE_GAMMA : 0
  } else {
    maxDrop = 1 - (1 / (1 + 7.62 * sunShare * Math.sin(sunAlt * RAD))) ** EXPOSURE_GAMMA
  }
  if (maxDrop < 1 / 255) return []
  const invSin = 1 / Math.sin(sunAlt * RAD)
  const minDepth = -2 * Math.log(open * Math.max(1e-6, 1 - 1 / (255 * maxDrop))) / invSin
  const accepted = projectCloudShadows({ cloudField, grid, terrain, camera, box, azimuth: sunAz, altitude: sunAlt, open, minDepth })
  return shadowLayers(terrain, box, accepted, fallbackShadowRgb(world), planes)
}
