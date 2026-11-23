import { describe, expect, it } from 'vitest'
import { SCENE_CAMERA } from '../../domain/camera'
import { NORMALS } from '../../world/livingLight'
import type { RGB, WorldState } from '../../world/types'
import { buildingFaces, buildingLight, groundView, reflectedGround } from './buildingLight'
import { FACINGS, receiverId, STONE, WALL_ALBEDOS } from './buildingMaterial'
import { landIrradiance, skyView } from './landIrradiance'
import { linearLuminance, srgbRgbToLinear } from './landRadiance'
import { hazeAt, hazeOf } from './landVeil'
import { metalLight } from './metalLight'
import { mixLight } from './tone'

function scene(azimuth = 190, altitude = 38, open = 1) {
  return {
    camera: SCENE_CAMERA, ground: { wet: 0 }, night: { dark: 0 },
    light: { palette: { horizon: '#b4c3d0', mid: '#6f88b0', top: '#56769d' }, ambient: [.57, .62, .71],
      afterglow: { x: 187, altitude, rgb: [1, .68, .29] }, diffuse: 1 - open,
      shares: { sun: open, moon: 0 } },
    bodies: { sun: { azimuth, altitude }, moon: { azimuth: 30, altitude: -8 } },
    air: { haze: [.61, .68, .78], visibilityKm: 25, dustWeight: 0, fade: (km: number) => 1 - Math.exp(-3.912 * km / 25) },
    land: { local: [{ sample: { cover: 30, albedo: [.45, .41, .37] } }] },
  } as unknown as WorldState
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
      expect(linearLuminance(a)).toBeGreaterThanOrEqual(.439)
      expect(linearLuminance(a)).toBeLessThanOrEqual(.581)
    }
    expect(WALL_ALBEDOS).toHaveLength(8)
    expect(receiverId(49, true) - receiverId(49)).toBe(2 * FACINGS.length)
    expect(FACINGS[0].leftWidth).toBeLessThan(FACINGS[0].rightWidth)
    const surveyed = new Set([1, 2, 3].map(seed => receiverId(seed, false, false, 18) % (2 * FACINGS.length)))
    expect(surveyed.size).toBe(1)
  })

  it('changes both returns smoothly with solar crossing, deck and twilight', () => {
    const sweep = (a: WorldState, b: WorldState) => {
      const id = receiverId(7, false, false, 0)
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

  it('uses exactly the land haze pass after exposure', () => {
    const w = scene(), km = 9
    const near = buildingLight(w, 0)(STONE, NORMALS.front)
    const far = buildingLight(w, km)(STONE, NORMALS.front)
    mixLight(near, hazeOf(w), hazeAt(w, km)).forEach((c, i) => expect(far[i]).toBeCloseTo(c, 12))
  })

  it('puts gold chroma on the reflected twilight side even with the beam absent', () => {
    const gold = metalLight(scene(252, -1, .82), 0)
    const left = gold([-.70, -.71, .05]), right = gold([.70, -.71, .05])
    expect(right[0] - right[2]).toBeGreaterThan(left[0] - left[2])
    expect(y(right)).toBeGreaterThan(y(left))
  })

  it('tapers directional afterglow at the shared sky cutoffs', () => {
    for (const cutoff of [-7, 3]) {
      const a = scene(252, cutoff - .001), b = scene(252, cutoff + .001)
      if (cutoff < 0) a.light.afterglow = null
      else b.light.afterglow = null
      const normal = [.70, -.71, .05] as const
      const difference = Math.abs(y(metalLight(a, 0)(normal)) - y(metalLight(b, 0)(normal)))
      expect(difference).toBeLessThan(.012)
    }
  })
})
