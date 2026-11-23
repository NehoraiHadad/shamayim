import { expect, it } from 'vitest'
import { receiverScene as scene } from '../../test/receiverScene'
import { NORMALS } from '../../world/livingLight'
import type { RGB, WorldState } from '../../world/types'
import { accessoryTones, buildingFaces, buildingLight } from '../model/buildingLight'
import { receiverId, STONE } from '../model/buildingMaterial'
import { srgbRgbToLinear } from '../model/landRadiance'
import { hazeAt, hazeOf, toneAt } from '../model/landVeil'
import { metalLight } from '../model/metalLight'
import { SCENE_STYLES, STYLES } from './styles'

it.each(SCENE_STYLES)('fades %s building receivers and the ground by one transmission', style => {
  const { light } = STYLES[style]
  const colours = (w: WorldState, km: number): RGB[] => {
    const faces = buildingFaces(w, km, receiverId(7), true, false, true, light)
    const glass = buildingFaces(w, km, receiverId(7, true), false, false, true, light)
    const receive = buildingLight(w, km, light)
    const { panel, heater } = accessoryTones(w, km)
    return [faces.front.wall, faces.left.wall, faces.right.wall, faces.front.foot, faces.front.eave,
      faces.top, faces.recess, faces.unresolved, ...faces.tile!, faces.tileBase!, glass.front.wall, glass.band!,
      receive(STONE, NORMALS.front, .25, 0), receive.glass(NORMALS.front), panel, heater,
      metalLight(w, km)([.7, -.71, .05])]
  }
  for (const altitude of [9, 38, -22]) {
    for (const visibilityKm of [32, 12, 6, 3, 1.5, 1, .1]) {
      const w = scene(252, altitude, .28)
      w.air = { ...w.air, visibilityKm, mist: { fog: 1, radiation: 0, persistent: 0, amount: 1 },
        fade: km => 1 - Math.exp(-3.912 * km / visibilityKm) }
      const clearGround = srgbRgbToLinear(toneAt(w, 0))
      const clearColours = colours(w, 0).map(srgbRgbToLinear)
      const air = srgbRgbToLinear(hazeOf(w))
      for (const km of [.5, 1.5, 4, 12]) {
        const share = hazeAt(w, km), transmission = 1 - share
        const ground = srgbRgbToLinear(toneAt(w, km))
        expect(share).toBeCloseTo(w.air.fade(km) ** 2, 12)
        colours(w, km).map(srgbRgbToLinear).forEach((colour, i) => colour.forEach((c, k) => {
          expect(c).toBeCloseTo(clearColours[i][k] * transmission + air[k] * share, 5)
          expect(c - ground[k]).toBeCloseTo((clearColours[i][k] - clearGround[k]) * transmission, 5)
        }))
      }
    }
  }
})
