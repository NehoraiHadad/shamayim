import { describe, expect, it } from 'vitest'
import { receiverScene as scene } from '../../test/receiverScene'
import { AFTERGLOW, afterglowColour } from '../../world/afterglow'
import { NORMALS } from '../../world/livingLight'
import type { RGB, WorldState } from '../../world/types'
import { buildingFaces, buildingLight, groundView, reflectedGround } from './buildingLight'
import { facingBin, receiverId, receiverMaterial, STONE, WALL_ALBEDOS } from './buildingMaterial'
import { sunlitGround } from './buildingGround'
import { landIrradiance, skyView } from './landIrradiance'
import { linearLuminance, srgbRgbToLinear } from './landRadiance'
import { hazeAt, hazeOf } from './landVeil'
import { metalLight } from './metalLight'
import { labOf, mixLight } from './tone'

function twilightScene(altitude: number, open = 1): WorldState {
  const world = scene(252, altitude, open)
  const x = 295, y = 390 // Put the ridge glow and solar meridian over the eye-level sample.
  world.relief = { ...world.relief, horizonY: y }
  world.bodies.sun = { ...world.bodies.sun, x, y }
  world.light = { ...world.light, glow: { side: 'west', opacity: .34, x, y },
    afterglow: altitude > AFTERGLOW.to && altitude < AFTERGLOW.from ? { x, altitude, rgb: afterglowColour(altitude, world.air) } : null }
  return world
}

const y = (srgb: RGB) => linearLuminance(srgbRgbToLinear(srgb))
describe('building receiver', () => {
  it('uses complementary ground and open-sky factors for up, horizontal and down normals', () => {
    const irr = landIrradiance(scene())
    for (const [n, sky] of [[NORMALS.top, 1], [NORMALS.front, .5], [[0, 0, -1], 0]] as const) {
      expect(skyView(n, irr.sunDir, 0)).toBe(sky)
      expect(groundView(n)).toBe(1 - sky)
    }
  })
  it('separates ground visibility and sunlit ground from direct visibility at the facade', () => {
    const irr = landIrradiance(scene())
    const open = reflectedGround(STONE, irr, 1, 1)
    const shadow = reflectedGround(STONE, irr, 1, 0)
    expect(reflectedGround(STONE, irr, 0, 1)).toEqual([0, 0, 0])
    expect(linearLuminance(shadow)).toBeGreaterThan(0)
    expect(linearLuminance(open)).toBeGreaterThan(linearLuminance(shadow))
    const receive = buildingLight(scene(), 3)
    expect(receive(STONE, NORMALS.front, 1, 1)).toEqual(receive(STONE, NORMALS.front, 1, 0))
    expect(y(receive(STONE, NORMALS.right, 1, 0))).toBeLessThan(y(receive(STONE, NORMALS.right)))
  })
  it('reduces beam and ground illumination as street and foot exposure close', () => {
    const sunAt = (alt: number) => landIrradiance(scene(190, alt)).sunDir
    expect(sunlitGround(sunAt(-1))).toBe(0)
    expect(sunlitGround(sunAt(3))).toBeLessThan(.12)
    expect(sunlitGround(sunAt(38))).toBeGreaterThan(.55)
    const faces = buildingFaces(scene(), .5, receiverId(50))
    expect(y(faces.right.foot)).toBeLessThan(.8 * y(faces.right.wall))
    expect(y(faces.right.eave)).toBeGreaterThan(y(faces.right.foot))
  })
  it('keeps the upward cap brighter than a sun return and a recessed facade at equal distance', () => {
    const receive = buildingLight(scene(), 3)
    const l = y(receive(STONE, NORMALS.left)), r = y(receive(STONE, NORMALS.right))
    const wall = y(receive(STONE, NORMALS.front))
    expect(y(receive(STONE, NORMALS.top))).toBeGreaterThan(r)
    expect(r).toBeGreaterThan(l)
    expect(y(receive(STONE, NORMALS.front, .25, 0))).toBeLessThan(wall)
  })
  it('uses bounded linear material bins and a fixed projected facing', () => {
    for (const a of WALL_ALBEDOS) {
      expect(linearLuminance(a)).toBeGreaterThanOrEqual(.390)
      expect(linearLuminance(a)).toBeLessThanOrEqual(.581)
    }
    expect(WALL_ALBEDOS).toHaveLength(8)
    const orientations = Array.from({ length: 40 }, (_, seed) => facingBin(seed))
    expect(new Set(orientations).size).toBe(5)
    const left = receiverMaterial(receiverId(orientations.indexOf(0))).facing
    const right = receiverMaterial(receiverId(orientations.indexOf(4))).facing
    expect(left.normals[0][0]).toBeLessThan(0)
    expect(right.normals[0][0]).toBeGreaterThan(0)
    expect(left.leftWidth).toBeLessThan(right.leftWidth)
  })
  it('changes both returns smoothly with solar crossing, deck and twilight', () => {
    const sweep = (a: WorldState, b: WorldState) => {
      const id = receiverId(7)
      const fa = buildingFaces(a, 3, id), fb = buildingFaces(b, 3, id)
      for (const k of ['front', 'left', 'right', 'top'] as const) {
        const rgb = (f: typeof fa) => (k === 'top' ? f.top : f[k].wall)
        expect(Math.abs(y(rgb(fa)) - y(rgb(fb)))).toBeLessThan(.006)
      }
      expect(fa.leftWidth).toBe(fb.leftWidth)
      expect(fa.rightWidth).toBe(fb.rightWidth)
    }
    sweep(scene(179.99), scene(180.01))
    sweep(scene(190, 38, .01), scene(190, 38, .03))
    sweep(scene(246, -.02), scene(246, .02))
    const flat = buildingFaces(scene(190, 38, 0), 3, receiverId(7))
    expect(Math.abs(y(flat.left.wall) - y(flat.right.wall))).toBeLessThan(.001)
    expect(y(flat.top)).toBeGreaterThan(y(flat.front.wall))
  })
  it('keeps broad sky fill on the half of the street facing away from the twilight glow', () => {
    const world = scene(113, .76, 0), receive = buildingLight(world, 2)
    const { across, ahead } = landIrradiance(world).sunDir
    const length = Math.hypot(across, ahead)
    const toward: [number, number, number] = [across / length, ahead / length, 0]
    const away: [number, number, number] = [-toward[0], -toward[1], 0]
    const ratio = y(receive(STONE, away)) / y(receive(STONE, toward))
    expect(ratio).toBeGreaterThan(.9)
    expect(ratio).toBeLessThan(1)
  })
  it('reflects more sky at grazing angles and keeps glass bands softly resolved', () => {
    const world = scene(190, 38, 0), receive = buildingLight(world, 1)
    const front = receive.glass(NORMALS.front)
    const side = receive.glass([.98, -.20, 0])
    expect(y(side)).toBeGreaterThan(1.12 * y(front))
    const ratio = y(receive.glass(NORMALS.front, true)) / y(front)
    expect(ratio).toBeGreaterThan(.55)
    expect(ratio).toBeLessThan(.75)
  })
  it('shows the anti-solar sky in a head-on pane when the glow is behind the facade', () => {
    const sunBehindFacade = buildingLight(scene(180, .76, 0), 0).glass(NORMALS.front)
    const sunBehindViewer = buildingLight(scene(0, .76, 0), 0).glass(NORMALS.front)
    const blueRed = (color: RGB) => {
      const [r, , b] = srgbRgbToLinear(color)
      return b / r
    }
    expect(blueRed(sunBehindFacade)).toBeGreaterThan(blueRed(sunBehindViewer))
    expect(y(sunBehindFacade)).toBeLessThan(y(sunBehindViewer))
  })
  it('uses exactly the land haze pass after exposure', () => {
    const w = scene(), km = 9
    const near = buildingLight(w, 0)(STONE, NORMALS.front)
    const far = buildingLight(w, km)(STONE, NORMALS.front)
    mixLight(near, hazeOf(w), hazeAt(w, km)).forEach((c, i) => expect(far[i]).toBeCloseTo(c, 5))
  })
  it('tapers directional afterglow at the shared sky cutoffs', () => {
    for (const cutoff of [AFTERGLOW.to, AFTERGLOW.from]) {
      const a = twilightScene(cutoff - .001), b = twilightScene(cutoff + .001)
      const normal = [.70, -.71, .05] as const
      const before = metalLight(a, 0)(normal), after = metalLight(b, 0)(normal)
      expect(Math.abs(y(before) - y(after))).toBeLessThan(.012)
      const p = labOf(before), q = labOf(after)
      // This sweep straddles only .002° of sun travel, so require sub-JND chroma continuity.
      expect(Math.hypot(p.a - q.a, p.b - q.b)).toBeLessThan(.001)
    }
  })
})
