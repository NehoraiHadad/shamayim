import { seeded } from '../../data/landmarks/hash'
import type { Normal } from '../../world/livingLight'
import type { RGB } from '../../world/types'
import { srgbRgbToLinear } from './landRadiance'

const Y = [.44, .446, .46, .49, .52, .55, .57, .58]
export const WALL_ALBEDOS: readonly RGB[] = Y.map((y, i) => {
  const warm = .01 + .005 * (i % 3)
  return [y + warm, y - .17 * warm, y - 1.26 * warm]
})
export const TILE = srgbRgbToLinear([.64, .30, .21])
export const LEAF = srgbRgbToLinear([.19, .28, .21])
export const PANEL = srgbRgbToLinear([.11, .17, .30])
export const GLASS = srgbRgbToLinear([.32, .39, .45])
export const SOOT = srgbRgbToLinear([.25, .22, .20])
export const STONE = WALL_ALBEDOS[6]
export const DISTANT_PLASTER = WALL_ALBEDOS[2]
export const PALE_METAL = srgbRgbToLinear([.72, .73, .73])
export const mixedAlbedo = (a: RGB, b: RGB, k: number): RGB =>
  [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]

const DEGREES = [-32, -16, 0, 16, 32]
export const VIEW_FACING = 2

/** The raster blocks have no surveyed footprint bearing. Bin an observed bearing when one is available. */
export function facingBin(seed: number, relativeBearing?: number): number {
  if (relativeBearing === undefined) return Math.floor(seeded(seed ^ 0x4b1856ad)() * DEGREES.length)
  const turn = ((relativeBearing + 225) % 90 + 90) % 90 - 45
  return Math.max(0, Math.min(4, Math.round(turn / 16) + VIEW_FACING))
}

export const FACINGS = DEGREES.map((degrees) => {
  const a = degrees * Math.PI / 180, c = Math.cos(a), s = Math.sin(a)
  const front: Normal = [s, -c, 0]
  const left: Normal = [-c, -s, 0], right: Normal = [c, s, 0]
  // A small return remains legible in the bas-relief drawing; the turn projects more of one side.
  return { normals: [front, left, right] as const, leftWidth: .22 + .18 * s, rightWidth: .22 - .18 * s }
})

export function materialBin(seed: number, limestone = false): number {
  return Math.floor(seeded(seed)() * 7) + Number(limestone)
}

export function receiverId(seed: number, limestone = false, glass = false, relativeBearing?: number): number {
  return (materialBin(seed, limestone) * FACINGS.length + facingBin(seed, relativeBearing)) * 2 + Number(glass)
}

export function receiverMaterial(id: number) {
  const bin = Math.floor(id / 2)
  const stone = WALL_ALBEDOS[Math.floor(bin / FACINGS.length)]
  return { stone, wall: id % 2 ? mixedAlbedo(stone, GLASS, .60) : stone, facing: FACINGS[bin % FACINGS.length] }
}
