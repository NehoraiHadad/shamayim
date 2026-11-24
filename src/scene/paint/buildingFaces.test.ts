import { expect, it, vi } from 'vitest'
import { receiverScene } from '../../test/receiverScene'
import { buildingFaces } from '../model/buildingLight'
import * as materials from '../model/buildingMaterial'
import { SCENE_STYLES } from './painters'
import { STYLES } from './styles'

it.each(SCENE_STYLES)('reuses the %s surface across three distance tiers', style => {
  const { light } = STYLES[style]
  const world = receiverScene(190, 5)
  const distances = [.5, 3, 12]
  const variants: [number, boolean, boolean, boolean][] = [
    [materials.receiverId(50), true, false, true],
    [materials.receiverId(50, true), false, true, true],
    [materials.receiverId(50, false, true), false, false, true],
    [materials.receiverId(50), true, false, false],
  ]
  const material = vi.spyOn(materials, 'receiverMaterial')
  try {
    for (const variant of variants) {
      const fresh = distances.map(km => buildingFaces(receiverScene(190, 5), km, ...variant, light))
      material.mockClear()
      const shared = distances.map(km => buildingFaces(world, km, ...variant, light))
      expect(shared).toEqual(fresh)
      expect(shared[0]).not.toEqual(shared[2])
      expect(material).toHaveBeenCalledTimes(1)
    }
  } finally {
    material.mockRestore()
  }
})
