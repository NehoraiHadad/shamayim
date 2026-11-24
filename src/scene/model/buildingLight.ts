import { NORMALS, type Normal } from '../../world/livingLight'
import type { RGB, WorldState } from '../../world/types'
import { groundLighting } from './buildingGround'
import { PALE_METAL, PANEL, STONE, TILE, receiverMaterial } from './buildingMaterial'
import { incidence } from './buildingIncidence'
import { exposedColors, facadeTwilight } from './buildingExposure'
import { hazeAt } from './landVeil'
import { glassIncidence } from './glassLight'
import { PLAIN_LIGHT, type StyleLight } from './styleLight'

export const buildingSurroundings = (world: WorldState) => groundLighting(world).buildings
export { groundView, reflectedGround } from './buildingGround'
const UNIT_REFLECTANCE: RGB = [1, 1, 1]

/** A minute's receivers, once per hand's light. */
const receiversOf = new WeakMap<StyleLight, WeakMap<WorldState, ReturnType<typeof worldReceivers>>>()

function worldReceivers(world: WorldState, light: StyleLight) {
  const state = buildingSurroundings(world)
  const screen = light.screen?.(state.irr)
  const incident = incidence(state, screen)
  const normals = new WeakMap<Normal, ReturnType<typeof faceLight>>()
  const roofs = new WeakMap<Normal, RGB>()
  const { front, left, right, top } = NORMALS
  let sky: ReturnType<typeof glassIncidence> | undefined
  const expose = exposedColors(state)
  const tones = new Map<number, ReturnType<typeof expose>>()
  const wallTones = new Map<number, ReturnType<typeof expose>>()
  const compressFacades = !screen && facadeTwilight(state.irr.sunAlt) > 0
  const tileTones = new Map<number, WeakMap<Normal, readonly [RGB, RGB, RGB]>>()
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
  function toneAt(km: number, facade = false) {
    const compress = facade && compressFacades
    const cache = compress ? wallTones : tones
    let tone = cache.get(km)
    if (!tone) {
      cache.set(km, tone = expose(hazeAt(world, km), compress))
    }
    return tone
  }

  return { incident, topLight, toneAt, facades,
    unresolved: (km: number, rho: RGB) => toneAt(km, true)(rho, average),
    unresolvedTile: (km: number) => toneAt(km)(TILE, tileAverage),
    sky: (n: Normal, stone: RGB, wall: RGB, band?: boolean) =>
      (sky ??= glassIncidence(world, state, screen))(n, stone, wall, band),
    tiles(km: number, [front, left, right]: readonly [Normal, Normal, Normal]) {
      let facets = tileTones.get(km)
      if (!facets) tileTones.set(km, facets = new WeakMap())
      let colors = facets.get(front)
      if (!colors) {
        const tone = toneAt(km), pitch = (n: Normal) => {
          let rgb = roofs.get(n)
          if (!rgb) roofs.set(n, rgb = incident(roofNormal(n)))
          return tone(TILE, rgb)
        }
        facets.set(front, colors = [pitch(front), pitch(left), pitch(right)])
      }
      return colors
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
  const shade = set.toneAt(km), facade = set.toneAt(km, true)
  const receive = (rho: RGB, n: Normal, open = 1, beam = open) => (n[2] === 0 ? facade : shade)(rho, set.incident(n, open, beam))
  return Object.assign(receive, {
    unresolved: (rho: RGB) => set.unresolved(km, rho),
    glass: (n: Normal, mullion = false, stone = STONE, open = 1, beam = open) =>
      facade(mullion ? PALE_METAL : UNIT_REFLECTANCE, set.sky(n, stone, set.incident(n, open, beam), mullion)),
  })
}

export interface FaceTones { wall: RGB; foot: RGB; eave: RGB }
export interface BuildingFaces {
  front: FaceTones; left: FaceTones; right: FaceTones; top: RGB; recess: RGB; unresolved: RGB
  tile?: readonly [RGB, RGB, RGB]
  tileBase?: RGB
  band?: RGB
  leftWidth: number; rightWidth: number
}

const flat = (wall: RGB): FaceTones => ({ wall, foot: wall, eave: wall })

export function buildingFaces(world: WorldState, km: number, id: number, tiled = false, plain = false, detail = true,
  light: StyleLight = PLAIN_LIGHT): BuildingFaces {
  const set = receivers(world, light)
  let byMaterial = set.facades.get(km)
  if (!byMaterial) set.facades.set(km, byMaterial = new Map())
  const key = id * 8 + Number(tiled) + Number(plain) * 2 + Number(detail) * 4
  let faces = byMaterial.get(key)
  if (!faces) byMaterial.set(key, faces = makeBuildingFaces(set, km, id, tiled, plain, detail))
  return faces
}

function makeBuildingFaces(set: ReturnType<typeof worldReceivers>, km: number, id: number, tiled: boolean, plain: boolean,
  detail: boolean): BuildingFaces {
  const tone = set.toneAt(km)
  const tint = set.toneAt(km, true)
  const { stone, roof, glass, facing: { normals, leftWidth, rightWidth } } = receiverMaterial(id)
  const [front, left, right] = normals
  const unresolved = set.unresolved(km, stone)
  const tileBase = tiled ? set.unresolvedTile(km) : undefined
  if (!detail) {
    const face = flat(unresolved)
    return { front: face, left: face, right: face, top: unresolved, recess: unresolved, unresolved,
      leftWidth, rightWidth, ...(tileBase ? { tile: [tileBase, tileBase, tileBase], tileBase } : {}) }
  }
  const face = (n: Normal) => {
    const rgb = set.face(n)
    if (glass) return flat(tint(UNIT_REFLECTANCE, set.sky(n, stone, rgb.wall)))
    const wall = tint(stone, rgb.wall)
    return plain ? flat(wall) : { wall, foot: tint(stone, rgb.foot), eave: tint(stone, rgb.eave) }
  }
  return { front: face(front), left: face(left), right: face(right), top: tone(roof, set.topLight),
    recess: plain ? unresolved : tint(stone, set.face(front).recess), unresolved, leftWidth, rightWidth,
    ...(glass ? { band: tint(PALE_METAL, set.sky(front, stone, set.face(front).wall, true)) } : {}),
    ...(tileBase ? { tile: set.tiles(km, normals), tileBase } : {}),
  }
}

const PANEL_NORMAL: Normal = [0, -.56, .83]
export function accessoryTones(world: WorldState, km: number) {
  const receive = buildingLight(world, km)
  return { panel: receive(PANEL, PANEL_NORMAL), heater: receive(PALE_METAL, NORMALS.top) }
}

/** Hipped clay roof, 30° pitch. The three visible planes turn with the footprint. */
export function roofNormal(n: Normal): Normal { return [n[0] * .5, n[1] * .5, Math.sqrt(.75)] }
