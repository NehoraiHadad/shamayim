import type { WorldState } from '../../world/types'
import { facadeTwilight } from './buildingExposure'
import { buildingSurroundings } from './buildingLight'
import { srgbRgbToLinear } from './landRadiance'
import { afterglowHorizon, twilightShare } from './landSkyIrradiance'

/** Key the input light, shared for every orientation and material. Quantising each resulting
 * colour would make adding another palette bin invalidate the cache more often. */
export function receiverLightKey(world: WorldState) {
  const { irr, ground, air } = buildingSurroundings(world)
  const { sunDir: s, moonDir: m } = irr
  const twilight = twilightShare(irr.sunAlt)
  // The pane's directional lobe can change chroma at fixed diffuse irradiance.
  const pane = twilight > 0 ? srgbRgbToLinear(afterglowHorizon(world.light, irr.sunAlt)) : []
  return [
    ...irr.eSunVec, ...irr.eMoonVec, ...irr.eSkyVec, ...ground, ...air, irr.yHorizon, irr.skyBias, facadeTwilight(irr.sunAlt),
    s.across * irr.eSunPi, s.ahead * irr.eSunPi, s.up * irr.eSunPi,
    m.across * irr.eMoonPi, m.ahead * irr.eMoonPi, m.up * irr.eMoonPi,
    ...pane.map(channel => twilight * channel),
  ].map(v => Math.sign(v) * Math.round(18 * Math.log1p(Math.abs(v) / .012)))
}
