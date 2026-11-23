import type { Normal } from '../../world/livingLight'
import { aerosolDepth } from '../../world/sceneLight'
import type { RGB, WorldState } from '../../world/types'
import type { Surroundings } from './buildingGround'
import { skyReflection } from './landSkyIrradiance'

/** Directional sky in rough window glass, with Fresnel reflectance and diffuse light
 * from the interior. The mullions see the same sky but return less of it. */
export function glassIncidence(world: WorldState, { irr }: Surroundings) {
  const sky = skyReflection(world.light, irr.sunAlt, .099 + aerosolDepth(world.air)[1], irr.eSkyVec)
  const az = Math.hypot(irr.sunDir.across, irr.sunDir.ahead) || 1
  const memo = new WeakMap<Normal, RGB>()
  return (n: Normal, mullion = false): RGB => {
    let reflection = memo.get(n)
    if (!reflection) {
      const nv = Math.max(0, -n[1])
      const toward = (2 * nv * n[0] * irr.sunDir.across + (1 + 2 * nv * n[1]) * irr.sunDir.ahead) / az
      // Average Schlick over the shallow viewing angles of the rough panes.
      const fresnel = .04 + .96 * (1 - .58 * nv) ** 5
      const directional = sky(.14 + .5 * nv * Math.max(0, n[2]), .47 * toward)
      reflection = mixReflection(directional, irr.eSkyVec, fresnel)
      memo.set(n, reflection)
    }
    return mullion ? [reflection[0] * .84, reflection[1] * .84, reflection[2] * .84] : reflection
  }
}

function mixReflection(sky: RGB, fill: RGB, fresnel: number): RGB {
  const channel = (i: 0 | 1 | 2) => (1.65 * fresnel + .62) * sky[i] + .25 * (1 - fresnel) * fill[i]
  return [channel(0), channel(1), channel(2)]
}
