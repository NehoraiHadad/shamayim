//# allFunctionsCalledOnLoad
import { NORMALS, type Normal } from '../../world/livingLight'
import type { RGB, WorldState } from '../../world/types'
import { groundLighting } from './buildingGround'
import { PALE_METAL, PANEL, STONE, TILE } from './buildingMaterial'
import { incidence } from './buildingIncidence'
import { exposedColors } from './buildingExposure'
import { hazeAt } from './landVeil'
import { glassIncidence } from './glassLight'
import { PLAIN_LIGHT, type StyleLight } from './styleLight'
import { facesThrough, roofNormal, surfaceFaces, UNIT_REFLECTANCE, type BuildingFaces } from './buildingFaces'

export { roofNormal } from './buildingFaces'
export type { BuildingFaces, FaceTones } from './buildingFaces'

export const buildingSurroundings = (world: WorldState) => groundLighting(world).buildings
export { groundView, reflectedGround } from './buildingGround'

/** A minute's receivers, once per hand's light. */
const receiversOf = new WeakMap<StyleLight, WeakMap<WorldState, ReturnType<typeof worldReceivers>>>()

function worldReceivers(world: WorldState, light: StyleLight) {
  const state = buildingSurroundings(world)
  const screen = light.screen?.(state.irr)
  const incident = incidence(state, screen)
  const normals = new WeakMap<Normal, ReturnType<typeof faceLight>>()
  const { front, left, right, top } = NORMALS
  let sky: ReturnType<typeof glassIncidence> | undefined
  const { surface, facade, through } = exposedColors(state)
  const shown = new Map<number, ReturnType<typeof through>>()
  const roofs = new WeakMap<Normal, RGB>()
  const surfaces = new Map<number, BuildingFaces>()
  const facades = new Map<number, Map<number, BuildingFaces>>()
  const sides = [incident(front, .82, .83, .92), incident(left, .82, .83, .92),
    incident(right, .82, .83, .92)]
  // The painter resolves the roof separately. Its sky view and beam must
  // not leak into the wall average, especially in the dim half of twilight.
  const average = sides[0].map((v, i) => .94 * v + .03 * (sides[1][i] + sides[2][i])) as unknown as RGB
  function faceLight(n: Normal) {
    let wall: RGB | undefined, foot: RGB | undefined, eave: RGB | undefined, recess: RGB | undefined
    return {
      // The street foot loses some sky and ground view. The upper wall
      // still receives the full bounce from its visible ground hemisphere.
      get wall() { return wall ??= incident(n, .82, .87, 1) },
      get foot() { return foot ??= incident(n, .48, .48, .34) },
      get eave() { return eave ??= incident(n, .65, .64, .63) },
      get recess() { return recess ??= incident(n, .28, 0, .28) },
    }
  }
  const topLight = incident(top)
  const tileAverage = average.map((v, i) => .5 * (v + topLight[i])) as unknown as RGB
  const wall = screen ? surface : (rho: RGB, irradiance: RGB) => facade(surface(rho, irradiance))
  function showAt(km: number) {
    let show = shown.get(km)
    if (!show) shown.set(km, show = through(hazeAt(world, km)))
    return show
  }

  return { incident, topLight, showAt, facades, surfaces, surface, wall,
    unresolved: (rho: RGB) => wall(rho, average),
    unresolvedTile: () => surface(TILE, tileAverage),
    sky: (n: Normal, stone: RGB, wall: RGB, band?: boolean) =>
      (sky ??= glassIncidence(world, state, screen))(n, stone, wall, band),
    tile(n: Normal) {
      let color = roofs.get(n)
      if (!color) roofs.set(n, color = surface(TILE, incident(roofNormal(n))))
      return color
    },
    face(n: Normal) {
      let face = normals.get(n)
      if (!face) normals.set(n, face = faceLight(n))
      return face
    },
  }
}

function receivers(world: WorldState, light: StyleLight) {
  let worlds = receiversOf.get(light)
  if (!worlds) receiversOf.set(light, worlds = new WeakMap())
  let set = worlds.get(world)
  if (!set) worlds.set(world, set = worldReceivers(world, light))
  return set
}

/** Linear material × irradiance, then the land exposure and one air-light blend. */
export function buildingLight(world: WorldState, km: number, light: StyleLight = PLAIN_LIGHT) {
  const set = receivers(world, light)
  const show = set.showAt(km)
  const receive = (rho: RGB, n: Normal, open = 1, beam = open) => show((n[2] === 0 ? set.wall : set.surface)(rho, set.incident(n, open, beam)))
  return Object.assign(receive, {
    unresolved: (rho: RGB) => show(set.unresolved(rho)),
    glass: (n: Normal, mullion = false, stone = STONE, open = 1, beam = open) =>
      show(set.wall(mullion ? PALE_METAL : UNIT_REFLECTANCE, set.sky(n, stone, set.incident(n, open, beam), mullion))),
  })
}

export function buildingFaces(world: WorldState, km: number, id: number, tiled = false, plain = false, detail = true,
  light: StyleLight = PLAIN_LIGHT): BuildingFaces {
  const set = receivers(world, light)
  let byMaterial = set.facades.get(km)
  if (!byMaterial) set.facades.set(km, byMaterial = new Map())
  const key = id * 8 + Number(tiled) + Number(plain) * 2 + Number(detail) * 4
  let faces = byMaterial.get(key)
  if (!faces) {
    let surface = set.surfaces.get(key)
    if (!surface) set.surfaces.set(key, surface = surfaceFaces(set, id, tiled, plain, detail))
    byMaterial.set(key, faces = facesThrough(set.showAt(km), surface))
  }
  return faces
}

const PANEL_NORMAL: Normal = [0, -.56, .83]
export function accessoryTones(world: WorldState, km: number) {
  const receive = buildingLight(world, km)
  return { panel: receive(PANEL, PANEL_NORMAL), heater: receive(PALE_METAL, NORMALS.top) }
}
