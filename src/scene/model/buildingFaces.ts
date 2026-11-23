//# allFunctionsCalledOnLoad
import type { Normal } from '../../world/livingLight'
import type { RGB } from '../../world/types'
import { FLAT_ROOF, PALE_METAL, receiverMaterial } from './buildingMaterial'

export const UNIT_REFLECTANCE: RGB = [1, 1, 1]

interface FaceReceivers {
  topLight: RGB
  unresolved(rho: RGB): RGB
  unresolvedTile(): RGB
  face(n: Normal): { wall: RGB; foot: RGB; eave: RGB; recess: RGB }
  sky(n: Normal, stone: RGB, wall: RGB, band?: boolean): RGB
  surface(rho: RGB, light: RGB): RGB
  wall(rho: RGB, light: RGB): RGB
  tile(n: Normal): RGB
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

/** The same faces seen through their path of air. */
export function facesThrough(show: (surface: RGB) => RGB, s: BuildingFaces): BuildingFaces {
  const face = (f: FaceTones): FaceTones => f.foot === f.wall && f.eave === f.wall ? flat(show(f.wall))
    : { wall: show(f.wall), foot: show(f.foot), eave: show(f.eave) }
  const front = face(s.front)
  const shared = s.left === s.front
  return { front, left: shared ? front : face(s.left), right: shared ? front : face(s.right), top: show(s.top),
    recess: show(s.recess), unresolved: show(s.unresolved), leftWidth: s.leftWidth, rightWidth: s.rightWidth,
    ...(s.band ? { band: show(s.band) } : {}),
    ...(s.tile ? { tile: [show(s.tile[0]), show(s.tile[1]), show(s.tile[2])] } : {}),
    ...(s.tileBase ? { tileBase: show(s.tileBase) } : {}) }
}

/** A building's faces before any air: shared by every distance it stands at. */
export function surfaceFaces(set: FaceReceivers, id: number, tiled: boolean, plain: boolean, detail: boolean): BuildingFaces {
  const { stone, glass, facing: { normals, leftWidth, rightWidth } } = receiverMaterial(id)
  const [front, left, right] = normals
  const unresolved = set.unresolved(stone)
  const tileBase = tiled ? set.unresolvedTile() : undefined
  if (!detail) {
    const face = flat(unresolved)
    return { front: face, left: face, right: face, top: unresolved, recess: unresolved, unresolved,
      leftWidth, rightWidth, ...(tileBase ? { tile: [tileBase, tileBase, tileBase], tileBase } : {}) }
  }
  const face = (n: Normal) => {
    const rgb = set.face(n)
    if (glass) return flat(set.wall(UNIT_REFLECTANCE, set.sky(n, stone, rgb.wall)))
    const wall = set.wall(stone, rgb.wall)
    return plain ? flat(wall) : { wall, foot: set.wall(stone, rgb.foot), eave: set.wall(stone, rgb.eave) }
  }
  return { front: face(front), left: face(left), right: face(right), top: set.surface(id < 0 ? stone : FLAT_ROOF, set.topLight),
    recess: plain ? unresolved : set.wall(stone, set.face(front).recess), unresolved, leftWidth, rightWidth,
    ...(glass ? { band: set.wall(PALE_METAL, set.sky(front, stone, set.face(front).wall, true)) } : {}),
    ...(tileBase ? { tile: [set.tile(front), set.tile(left), set.tile(right)] as const, tileBase } : {}),
  }
}

/** Hipped clay roof, 30° pitch. The three visible planes turn with the footprint. */
export function roofNormal(n: Normal): Normal { return [n[0] * .5, n[1] * .5, Math.sqrt(.75)] }
