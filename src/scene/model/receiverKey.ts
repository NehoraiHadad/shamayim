import type { WorldState } from '../../world/types'
import { buildingSurroundings } from './buildingLight'

/** Key the input light, shared for every orientation and material. Quantising each resulting
 * colour would make adding another palette bin invalidate the cache more often. */
export function receiverLightKey(world: WorldState) {
  if (world.night.dark >= 1) return null
  const { irr, ground, air } = buildingSurroundings(world)
  const { sunDir: s, moonDir: m } = irr
  return [
    ...irr.eSunVec, ...irr.eMoonVec, ...irr.eSkyVec, ...ground, ...air, irr.yHorizon, irr.skyBias,
    s.across * irr.eSunPi, s.ahead * irr.eSunPi, s.up * irr.eSunPi,
    m.across * irr.eMoonPi, m.ahead * irr.eMoonPi, m.up * irr.eMoonPi,
  ].map(v => Math.round(v * 48))
}
