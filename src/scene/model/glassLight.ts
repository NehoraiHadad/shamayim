import type { Normal } from '../../world/livingLight'
import { aerosolDepth } from '../../world/sceneLight'
import type { RGB, WorldState } from '../../world/types'
import type { Surroundings } from './buildingGround'
import { facadeTwilight } from './buildingExposure'
import { linearLuminance } from './landRadiance'
import { skyReflection } from './landSkyIrradiance'
import { reflectedCloudFill } from './reflectedCloudFill'
import { reflectedSkyLobe } from './reflectedSkyLobe'
import type { TwilightScreen } from './styleLight'

// Four incoherent air/glass interfaces in series. Each adds R/(1−R)
// to the reflectance odds once the internal returns are summed.
const SURFACE_F0 = .04
const DOUBLE_GLAZING_F0 = 4 * SURFACE_F0 / (1 + 3 * SURFACE_F0)
type Returns = readonly [RGB, RGB]

function paneAndBand(pane: RGB): Returns {
  return [pane, [pane[0] * .84, pane[1] * .84, pane[2] * .84]]
}

/** Directional sky in rough window glass, with Fresnel reflectance and diffuse light
 * from the interior. The mullions see the same sky but return less of it. */
export function glassIncidence(world: WorldState, { irr }: Surroundings, screenOf?: TwilightScreen) {
  // Use the broad directional sky. The gilding's concentrated forward
  // accent would paint the warm horizon across whole panes.
  const sky = skyReflection(world.light, irr.sunAlt, .099 + aerosolDepth(world.air)[1], irr.eSkyVec,
    reflectedSkyLobe(world), 0, 'rough', reflectedCloudFill(world))
  // Keep the passive pane within its facade's tonal range at twilight.
  // Fade the bound into daylight and as the scene reaches full night.
  const twilight = screenOf ? 0 : facadeTwilight(irr.sunAlt)
  const az = Math.hypot(irr.sunDir.across, irr.sunDir.ahead) || 1
  const memo = new WeakMap<Normal, Returns>()
  const limited = new WeakMap<RGB, WeakMap<RGB, Returns>>()
  return (n: Normal, stone: RGB, wall: RGB, mullion = false): RGB => {
    let reflection = memo.get(n)
    if (!reflection) {
      const nv = Math.max(0, -n[1])
      const toward = (2 * nv * n[0] * irr.sunDir.across + (1 + 2 * nv * n[1]) * irr.sunDir.ahead) / az
      // V points toward the eye, so R = 2(N·V)N − V. Roughness lifts the
      // sky sample just above the horizon. Projected area limits each return.
      const fresnel = DOUBLE_GLAZING_F0 + (1 - DOUBLE_GLAZING_F0) * (1 - nv) ** 5
      const directional = sky(.14 + 2 * nv * Math.max(0, n[2]), toward)
      const pane = mixReflection(directional, irr.eSkyVec, fresnel, screenOf?.(n).sky ?? 1)
      reflection = paneAndBand(pane)
      memo.set(n, reflection)
    }
    if (!twilight) return reflection[Number(mullion)]
    // Wall irradiance is memoised per normal. Reuse the same cap for this
    // plaster bin at every distance tier.
    let byStone = limited.get(wall)
    if (!byStone) limited.set(wall, byStone = new WeakMap())
    let bounded = byStone.get(stone)
    if (!bounded) {
      const pane = reflection[0], paneY = linearLuminance(pane)
      const wallY = linearLuminance([stone[0] * wall[0], stone[1] * wall[1], stone[2] * wall[2]])
      const keep = 1 - twilight * Math.max(0, 1 - wallY / Math.max(1e-9, paneY))
      byStone.set(stone, bounded = paneAndBand([pane[0] * keep, pane[1] * keep, pane[2] * keep]))
    }
    return bounded[Number(mullion)]
  }
}

function mixReflection(sky: RGB, fill: RGB, fresnel: number, visibility: number): RGB {
  const channel = (i: 0 | 1 | 2) => visibility * (fresnel * sky[i] + .37 * (1 - fresnel) * fill[i])
  return [channel(0), channel(1), channel(2)]
}
