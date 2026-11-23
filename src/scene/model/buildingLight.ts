import { NORMALS, type Normal } from '../../world/livingLight'
import type { RGB, WorldState } from '../../world/types'
import { groundLighting } from './buildingGround'
import { PALE_METAL, PANEL, TILE, receiverMaterial } from './buildingMaterial'
import { incidence } from './buildingIncidence'
import { colorOf, exposedColors } from './buildingExposure'
import { hazeAt } from './landVeil'
import { glassIncidence } from './glassLight'

export const buildingSurroundings = (world: WorldState) => groundLighting(world).buildings
export { groundView, reflectedGround } from './buildingGround'

const worlds = new WeakMap<WorldState, ReturnType<typeof worldReceivers>>()

function worldReceivers(world: WorldState) {
  const state = buildingSurroundings(world)
  const incident = incidence(state)
  const normals = new WeakMap<Normal, ReturnType<typeof faceLight>>()
  const roofs = new WeakMap<Normal, RGB>()
  const { front, left, right, top } = NORMALS
  let sky: ReturnType<typeof glassIncidence> | undefined
  const tones = new Map<number, ReturnType<typeof colorOf>>()
  const averages = new Map<number, WeakMap<RGB, RGB>>()
  const tileTones = new Map<number, WeakMap<Normal, readonly [RGB, RGB, RGB]>>()
  const expose = exposedColors(state)
  const projections = [incident(front, .82, .83, .68), incident(left, .82, .83, .68),
    incident(right, .82, .83, .68), incident(top)]
  const average = projections[0].map((v, i) => .92 * v + .03 * (projections[1][i] + projections[2][i]) + .02 * projections[3][i]) as unknown as RGB
  function faceLight(n: Normal) {
    return {
      wall: incident(n, .82, .87, .64),
      foot: incident(n, .48, .48, .34),
      eave: incident(n, .65, .64, .63),
      recess: incident(n, .28, 0, .28),
    }
  }
  const topLight = projections[3]
  function toneAt(km: number) {
    let tone = tones.get(km)
    if (!tone) {
      tones.set(km, tone = expose(hazeAt(world, km)))
    }
    return tone
  }

  return { state, incident, topLight, toneAt,
    unresolved(km: number, rho: RGB) {
      let palette = averages.get(km)
      if (!palette) averages.set(km, palette = new WeakMap())
      let rgb = palette.get(rho)
      if (!rgb) palette.set(rho, rgb = toneAt(km)(rho, average))
      return rgb
    },
    sky: (n: Normal, band?: boolean) => (sky ??= glassIncidence(world, state))(n, band),
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

function receivers(world: WorldState) {
  let set = worlds.get(world)
  if (!set) worlds.set(world, set = worldReceivers(world))
  return set
}

/** Linear material × irradiance, then the land exposure and one air-light blend. */
export function buildingLight(world: WorldState, km: number) {
  const set = receivers(world), shade = colorOf(set.state, hazeAt(world, km))
  const receive = (rho: RGB, n: Normal, open = 1, beam = open) => shade(rho, set.incident(n, open, beam))
  return Object.assign(receive, {
    unresolved: (rho: RGB) => set.unresolved(km, rho),
    glass: (n: Normal, mullion = false) => shade(PALE_METAL, set.sky(n, mullion)),
  })
}

export interface FaceTones { wall: RGB; foot: RGB; eave: RGB }
export interface BuildingFaces {
  front: FaceTones; left: FaceTones; right: FaceTones; top: RGB; recess: RGB; unresolved: RGB
  tile?: readonly [RGB, RGB, RGB]
  band?: RGB
  leftWidth: number; rightWidth: number
}

const flat = (wall: RGB): FaceTones => ({ wall, foot: wall, eave: wall })

export function buildingFaces(world: WorldState, km: number, id: number, tiled = false, plain = false, detail = true): BuildingFaces {
  const set = receivers(world), tone = set.toneAt(km)
  const { stone, glass, facing: { normals, leftWidth, rightWidth } } = receiverMaterial(id)
  const [front, left, right] = normals
  const unresolved = set.unresolved(km, stone)
  if (!detail) {
    const face = flat(unresolved)
    return { front: face, left: face, right: face, top: unresolved, recess: unresolved, unresolved,
      leftWidth, rightWidth, ...(tiled ? { tile: [unresolved, unresolved, unresolved] } : {}) }
  }
  const face = (n: Normal) => {
    const rgb = set.face(n)
    const wall = glass ? tone(PALE_METAL, set.sky(n)) : tone(stone, rgb.wall)
    return plain || glass ? flat(wall) : { wall, foot: tone(stone, rgb.foot), eave: tone(stone, rgb.eave) }
  }
  return { front: face(front), left: face(left), right: face(right), top: tone(stone, set.topLight),
    recess: plain ? unresolved : tone(stone, set.face(front).recess), unresolved, leftWidth, rightWidth,
    ...(glass ? { band: tone(PALE_METAL, set.sky(front, true)) } : {}),
    ...(tiled ? { tile: set.tiles(km, normals) } : {}),
  }
}

const PANEL_NORMAL: Normal = [0, -.56, .83]
export function accessoryTones(world: WorldState, km: number) {
  const receive = buildingLight(world, km)
  return { panel: receive(PANEL, PANEL_NORMAL), heater: receive(PALE_METAL, NORMALS.top) }
}

/** Hipped clay roof, 30° pitch. The three visible planes turn with the footprint. */
export function roofNormal(n: Normal): Normal { return [n[0] * .5, n[1] * .5, Math.sqrt(.75)] }
