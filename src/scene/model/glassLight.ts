import type { Normal } from '../../world/livingLight'
import { aerosolDepth } from '../../world/sceneLight'
import type { RGB, WorldState } from '../../world/types'
import type { Surroundings } from './buildingGround'
import { skyReflection } from './landSkyIrradiance'

// Four incoherent air/glass interfaces in series. Each adds R/(1−R)
// to the reflectance odds once the internal returns are summed.
const SURFACE_F0 = .04
const DOUBLE_GLAZING_F0 = 4 * SURFACE_F0 / (1 + 3 * SURFACE_F0)

/** Directional sky in rough window glass, with Fresnel reflectance and diffuse light
 * from the interior. The mullions see the same sky but return less of it. */
export function glassIncidence(world: WorldState, { irr }: Surroundings) {
  // Use the broad directional sky. The gilding's concentrated forward
  // accent would paint the warm horizon across whole panes.
  const sky = skyReflection(world.light, irr.sunAlt, .099 + aerosolDepth(world.air)[1], irr.eSkyVec, 0)
  const az = Math.hypot(irr.sunDir.across, irr.sunDir.ahead) || 1
  const memo = new WeakMap<Normal, readonly [RGB, RGB]>()
  return (n: Normal, mullion = false): RGB => {
    let reflection = memo.get(n)
    if (!reflection) {
      const nv = Math.max(0, -n[1])
      const toward = (2 * nv * n[0] * irr.sunDir.across + (1 + 2 * nv * n[1]) * irr.sunDir.ahead) / az
      // V points toward the eye, so R = 2(N·V)N − V. Roughness lifts the
      // sky sample just above the horizon. Projected area limits each return.
      const fresnel = DOUBLE_GLAZING_F0 + (1 - DOUBLE_GLAZING_F0) * (1 - nv) ** 5
      const directional = sky(.14 + 2 * nv * Math.max(0, n[2]), toward)
      const pane = mixReflection(directional, irr.eSkyVec, fresnel)
      reflection = [pane, [pane[0] * .84, pane[1] * .84, pane[2] * .84]]
      memo.set(n, reflection)
    }
    return reflection[Number(mullion)]
  }
}

function mixReflection(sky: RGB, fill: RGB, fresnel: number): RGB {
  const channel = (i: 0 | 1 | 2) => fresnel * sky[i] + .37 * (1 - fresnel) * fill[i]
  return [channel(0), channel(1), channel(2)]
}
