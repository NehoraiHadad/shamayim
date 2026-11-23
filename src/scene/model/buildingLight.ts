import { lambert, NORMALS, type Normal } from '../../world/livingLight'
import type { RGB, WorldState } from '../../world/types'
import { PALE_METAL, PANEL, TILE, receiverMaterial } from './buildingMaterial'
import { nearGroundAlbedo } from './landColour'
import { landIrradiance, skyView } from './landIrradiance'
import { albedoLinear, linearRgbToSrgb, shadeLinearRgb, srgbRgbToLinear } from './landRadiance'
import { outsideGroundStops } from './outsideGround'
import { hazeAt, hazeOf } from './landVeil'

interface Surroundings { irr: ReturnType<typeof landIrradiance>; ground: RGB; air: RGB }
const surroundings = new WeakMap<WorldState, Surroundings>()

/** The first factor covers open terrain in the ground hemisphere, the second the share outside cast shadows. */
export const GROUND_VISIBLE = .92
export const GROUND_SUNLIT = .70

export function reflectedGround(rho: RGB, irr: ReturnType<typeof landIrradiance>, visible: number, sunlit: number): RGB {
  const sun = sunlit * Math.max(0, irr.sunDir.up), moon = Math.max(0, irr.moonDir.up)
  const channel = (i: 0 | 1 | 2) => visible * rho[i] * (irr.eSkyVec[i] + sun * irr.eSunVec[i] + moon * irr.eMoonVec[i])
  return [channel(0), channel(1), channel(2)]
}

export function groundView(n: Normal) { return (1 - n[2]) * .5 }

export function buildingSurroundings(world: WorldState): Surroundings {
  const known = surroundings.get(world)
  if (known) return known
  const irr = landIrradiance(world)
  const view = world.place3
  const albedo = view?.kind === 'outside' && view.land ? outsideGroundStops(world, view.land, view.frame).median : nearGroundAlbedo(world)
  const ground = reflectedGround(albedoLinear(albedo), irr, GROUND_VISIBLE, GROUND_SUNLIT)
  const state = { irr, ground, air: srgbRgbToLinear(hazeOf(world)) }
  surroundings.set(world, state)
  return state
}

/** Linear material, incident beam and fill, then the land's exposure and a single air light blend. */
export function buildingLight(world: WorldState, km: number) {
  return surfaceReceiver(buildingSurroundings(world), hazeAt(world, km))
}

export function surfaceReceiver({ irr, ground, air }: Surroundings, share: number) {
  const evaluate = (rho: RGB, view: number, bounce: number, sun: number, moon: number): RGB => {
    const sky: RGB = [
      irr.eSkyVec[0] * view + ground[0] * bounce,
      irr.eSkyVec[1] * view + ground[1] * bounce,
      irr.eSkyVec[2] * view + ground[2] * bounce,
    ]
    return linearRgbToSrgb(shadeLinearRgb(rho, irr.eSunVec, irr.eMoonVec, sky,
      sun, moon, 1, irr.yHorizon, share, air))
  }
  const receive = (rho: RGB, n: Normal, open = 1, beam = 1) => evaluate(rho,
    skyView(n, irr.sunDir, irr.skyBias) * open, groundView(n), beam * lambert(n, irr.sunDir), beam * lambert(n, irr.moonDir))
  return Object.assign(receive, {
    unresolved(rho: RGB) {
      // Projected fractions of front, returns and top for fabric below a pixel.
      const normals = [NORMALS.front, NORMALS.left, NORMALS.right, NORMALS.top]
      const sum = (f: (n: Normal) => number) => .78 * f(normals[0]) + .07 * (f(normals[1]) + f(normals[2])) + .08 * f(normals[3])
      return evaluate(rho, sum(n => skyView(n, irr.sunDir, irr.skyBias)), sum(groundView),
        sum(n => lambert(n, irr.sunDir)), sum(n => lambert(n, irr.moonDir)))
    },
  })
}

export interface FaceTones { wall: RGB; foot: RGB; eave: RGB }
export interface BuildingFaces {
  front: FaceTones; left: FaceTones; right: FaceTones; top: RGB; recess: RGB
  tile: readonly [RGB, RGB, RGB]
  leftWidth: number; rightWidth: number
}

export function buildingFaces(world: WorldState, km: number, id: number): BuildingFaces {
  const receive = buildingLight(world, km)
  const { wall, stone, facing: { normals: [front, left, right], leftWidth, rightWidth } } = receiverMaterial(id)
  const face = (n: Normal): FaceTones => ({
    wall: receive(wall, n),
    foot: receive(wall, n, .22),
    eave: receive(wall, n, .55),
  })
  return { front: face(front), left: face(left), right: face(right), top: receive(stone, NORMALS.top),
    recess: receive(wall, front, .25, 0), tile: [front, left, right].map(n => receive(TILE, roofNormal(n))) as [RGB, RGB, RGB],
    leftWidth, rightWidth }
}

export function accessoryTones(world: WorldState, km: number) {
  const receive = buildingLight(world, km)
  return { panel: receive(PANEL, [0, -.56, .83]), heater: receive(PALE_METAL, NORMALS.top) }
}

/** Hipped clay roof, 30° pitch. The three visible planes turn with the footprint. */
export function roofNormal(n: Normal): Normal { return [n[0] * .5, n[1] * .5, Math.sqrt(.75)] }
