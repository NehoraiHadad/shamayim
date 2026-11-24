import { expect, it } from 'vitest'
import { BLOCK_ROOF, FLAT_ROOF, receiverId, receiverMaterial, WALL_ALBEDOS } from './buildingMaterial'

const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1)

it('draws a wall by its named material seed, and its facing by the body\'s own', () => {
  for (const seed of SEEDS) {
    const own = receiverMaterial(receiverId(seed)), named = receiverMaterial(receiverId(seed, false, false, 1000 + seed, true))
    expect(named.facing).toBe(own.facing)
    expect(named.stone).toBe(receiverMaterial(receiverId(1000 + seed)).stone)
  }
  const walls = (facingOf: number) => new Set(SEEDS.map(seed => receiverMaterial(receiverId(facingOf, false, false, seed)).stone))
  expect(walls(1).size).toBe(WALL_ALBEDOS.length)
})

it('darkens only the roof of a block under its collectors', () => {
  for (const seed of SEEDS) {
    expect(receiverMaterial(receiverId(seed)).roof).toBe(FLAT_ROOF)
    expect(receiverMaterial(receiverId(seed, false, false, seed, true))).toEqual({ ...receiverMaterial(receiverId(seed)), roof: BLOCK_ROOF })
  }
  BLOCK_ROOF.forEach((y, i) => { expect(y).toBeLessThan(FLAT_ROOF[i]); expect(y).toBeGreaterThan(.85 * FLAT_ROOF[i]) })
})
