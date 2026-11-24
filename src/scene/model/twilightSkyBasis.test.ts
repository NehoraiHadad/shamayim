import { describe, expect, it, vi } from 'vitest'
import { receiverScene } from '../../test/receiverScene'
import { NORMALS } from '../../world/livingLight'
import { evenAir } from '../../world/townAir'
import type { RGB } from '../../world/types'
import { buildingLight, buildingSurroundings } from './buildingLight'
import * as skyIrradiance from './landSkyIrradiance'
import { linearLuminance, srgbRgbToLinear } from './landRadiance'
import { domeSectors, metalLight, silverLight } from './metalLight'
import { skyLayer } from './sky'
import { rgbOf } from './tone'

const GOLD: RGB = [1, .766, .336]
const SUNWARD = [.63, -.63, .45] as const
const skyBox = { width: 375, skyHeight: 180, landTop: 0, landHeight: 128, dpr: 1 }

function xy([r, g, b]: readonly number[]) {
  const x = .4124 * r + .3576 * g + .1805 * b
  const y = .2126 * r + .7152 * g + .0722 * b
  const z = .0193 * r + .1192 * g + .9505 * b
  return [x / (x + y + z), y / (x + y + z)]
}

function hue([r, g, b]: RGB) {
  // CIELAB's reference is D65. Normalize both samples to equal luminance.
  const scale = .2 / linearLuminance([r, g, b])
  const x = Math.cbrt(scale * (.4124 * r + .3576 * g + .1805 * b) / .95047)
  const y = Math.cbrt(.2)
  const z = Math.cbrt(scale * (.0193 * r + .1192 * g + .9505 * b) / 1.08883)
  return Math.atan2(200 * (y - z), 500 * (x - y)) * 180 / Math.PI
}

describe('clear twilight sky', () => {
  it.each([1.4, -5])('keeps the glass and gold sky averages close to the diffuse chromaticity at %s°', altitude => {
    const world = receiverScene(252, altitude)
    world.light.palette = { ...world.light.palette, top: '#303d91', mid: '#9d8baf', horizon: '#f69d66' }
    world.light.ambient = [.36, .29, .63]
    world.light.afterglow = { x: world.bodies.sun.x, altitude, rgb: [1, .17, .0003] }
    // Integrate the sampler returned to each production receiver, before
    // Fresnel, metal F0, ground bounce or exposure changes its spectrum.
    const reflection = vi.spyOn(skyIrradiance, 'skyReflection')
    try {
      buildingLight(world, 0).glass(NORMALS.front)
      metalLight(world, 0)(SUNWARD)
      expect(reflection.mock.results).toHaveLength(2)
      const [dx, dy] = xy(buildingSurroundings(world).irr.eSkyVec)
      for (const { value } of reflection.mock.results) {
        const sample = value as ReturnType<typeof skyIrradiance.skyReflection>
        const integral = [0, 0, 0]
        for (let i = 0; i < 24; i++) {
          const up = (i + .5) / 24
          for (let j = 0; j < 36; j++) {
            const toward = Math.sqrt(1 - up ** 2) * Math.cos((j + .5) * Math.PI / 18)
            sample(up, toward).forEach((channel, k) => { integral[k] += up * channel })
          }
        }
        const [rx, ry] = xy(integral)
        expect(Math.hypot(dx - rx, dy - ry)).toBeLessThan(.03)
      }
    } finally {
      reflection.mockRestore()
    }
  })
})

describe('sunward reflected sky lobe', () => {
  it('puts the painted sunward hue on the brightest sector of the conductor', () => {
    // At the solar aura cutoff, only the ridge glow overlays this uniform sky.
    const altitude = -1.5
    const world = receiverScene(252, altitude, 0)
    const painted = '#aeaa65', horizon = rgbOf(painted)
    world.light = { ...world.light, clear: .85, diffuse: .15, ambient: horizon,
      palette: { ...world.light.palette, horizon: painted, mid: painted, top: painted },
      afterglow: { x: world.bodies.sun.x, altitude, rgb: [1, .45, .25] },
    }
    const [glow] = skyLayer(world, skyBox)!.glow
    const sectors = domeSectors(world, 0).flat().map(srgbRgbToLinear)
    const unlit = { ...world, light: { ...world.light, glow: null } }
    expect(sectors).not.toEqual(domeSectors(unlit, 0).flat().map(srgbRgbToLinear))
    const peak = sectors.reduce((a, b) => linearLuminance(a) > linearLuminance(b) ? a : b)
    // Read the ridge paint independently at two heights and three bearings
    // spread across the reflector's low forward lobe.
    const sum = [0, 0, 0]
    for (const [up, measure] of [[0, .25], [.38 * 2 / 3, .75]]) {
      const y = world.relief.y(Math.asin(up) * 180 / Math.PI)
      for (const azimuth of [-44, 0, 44]) {
        const x = world.bodies.sun.x + azimuth * world.camera.pxPerDeg
        const radius = Math.hypot((x - glow.x) / glow.r, (y - glow.y) / glow.ry!)
        const alpha = glow.alpha * Math.max(0, 1 - radius)
        const paintedRgb = horizon.map((channel, i) => (1 - alpha) * channel + alpha * glow.rgb[i]) as [number, number, number]
        const rgb = srgbRgbToLinear(paintedRgb)
        const dot = Math.sqrt(1 - up ** 2) * Math.cos(azimuth * Math.PI / 180)
        const weight = measure * Math.exp(-up / .38) * ((1 + dot) / 2) ** 2
        rgb.forEach((channel, i) => { sum[i] += weight * channel })
      }
    }
    const [r, g, b] = sum
    const delta = hue(peak) - hue([GOLD[0] * r, GOLD[1] * g, GOLD[2] * b])
    expect(Math.abs((delta + 540) % 360 - 180)).toBeLessThan(8)
  })

  it('keeps the incident sky independent of the identity of the conductor F0', () => {
    const world = receiverScene(252, -1.5, 0)
    const anotherGold: RGB = [...GOLD]
    expect(metalLight(world, 0, anotherGold)(SUNWARD)).toEqual(metalLight(world, 0)(SUNWARD))
  })

  it('reflects the painted haze band and city light in gold, silver and glass', () => {
    const world = receiverScene(252, -4, 0)
    world.night.dark = .5
    const band = { ...world, air: { ...world.air, horizonBand: { ...world.air.horizonBand, alpha: .6 } } }
    const city = { ...world, townLights: { ...world.townLights, air: () => ({
      ...evenAir(0), domes: [{ azimuth: 296, glow: 12, width: 12, height: 15 }],
    }) } }
    const colors = (w: typeof world) =>
      [metalLight(w, 0)(SUNWARD), silverLight(w, 0)(SUNWARD), buildingLight(w, 0).glass(SUNWARD)]
    const baseline = colors(world)
    for (const lit of [band, city]) colors(lit).forEach((rgb, i) => expect(rgb).not.toEqual(baseline[i]))
  })
})
