import { seeded } from '../../data/landmarks/hash'
import type { Normal } from '../../world/livingLight'
import type { RGB } from '../../world/types'
import { srgbRgbToLinear } from './landRadiance'

const Y = [.424, .435, .449, .466, .526, .542, .558, .574]
export const WALL_ALBEDOS: readonly RGB[] = Y.map((y, i) => {
  // Warm mineral plaster. This axis preserves Y, so warmer pigment does
  // not also brighten the blocks or replace the shared sky and path haze.
  const warm = .025 + .0025 * (i % 3)
  return [y + warm, y - .17 * warm, y - 1.26 * warm]
})
export const TILE = srgbRgbToLinear([.43, .275, .185])
// Flat concrete/membrane roofs share an albedo independent of the plaster bins.
export const FLAT_ROOF: RGB = [.55, .532, .494]
export const PANEL = srgbRgbToLinear([.11, .17, .30])
/**
 * The roof of a block of flats, seen whole: the same roof under its solar collectors, one to a flat (the building code's rule
 * up to `COLLECTORS_TO_M`), too small to draw one by one: 2.2 m² of dark panel to each 100 m² of a storey, at the 5.5
 * storeys such blocks have here.
 */
const COLLECTORS = .022 * 5.5
export const COLLECTORS_TO_M = 27
export const BLOCK_ROOF = FLAT_ROOF.map((y, i) => y * (1 - COLLECTORS) + PANEL[i] * COLLECTORS) as unknown as RGB
export const LEAF = srgbRgbToLinear([.19, .28, .21])
export const STACK_CONCRETE: RGB = [.24, .235, .22]
export const SOOT = srgbRgbToLinear([.25, .22, .20])
export const STONE = WALL_ALBEDOS[6]
export const DISTANT_PLASTER = WALL_ALBEDOS[2]
export const PALE_METAL = srgbRgbToLinear([.72, .73, .73])
const DEGREES = [-32, -16, 0, 16, 32]

/** The raster has no footprint bearings. Assign each block a stable facing. */
export function facingBin(seed: number): number {
  return Math.floor(seeded(seed ^ 0x4b1856ad)() * DEGREES.length)
}

const FACINGS = DEGREES.map((degrees) => {
  const a = degrees * Math.PI / 180, c = Math.cos(a), s = Math.sin(a)
  const front: Normal = [s, -c, 0]
  const left: Normal = [-c, -s, 0], right: Normal = [c, s, 0]
  // A small return remains legible in the bas-relief drawing; the turn projects more of one side.
  return { normals: [front, left, right] as const, leftWidth: .22 + .18 * s, rightWidth: .22 - .18 * s }
})

export function materialBin(seed: number): number {
  return Math.floor(seeded(seed)() * WALL_ALBEDOS.length)
}

/**
 * A body's wall and facing, each by its own draw: the facing by `seed`, the plaster by `material`; `collectors` where its
 * roof is a block of flats' (`BLOCK_ROOF`).
 */
export function receiverId(seed: number, glass = false, industrial = false, material = seed, collectors = false): number {
  const wall = materialBin(material) + (collectors ? WALL_ALBEDOS.length : 0)
  const id = (wall * FACINGS.length + facingBin(seed)) * 2 + Number(glass)
  return industrial ? -1 - id : id
}

export function receiverMaterial(id: number) {
  const industrial = id < 0, code = industrial ? -1 - id : id
  const bin = Math.floor(code / 2), wall = Math.floor(bin / FACINGS.length)
  const stone = industrial ? STACK_CONCRETE : WALL_ALBEDOS[wall % WALL_ALBEDOS.length]
  const roof = industrial ? stone : wall < WALL_ALBEDOS.length ? FLAT_ROOF : BLOCK_ROOF
  return { stone, roof, glass: !industrial && code % 2 === 1, facing: FACINGS[bin % FACINGS.length] }
}
