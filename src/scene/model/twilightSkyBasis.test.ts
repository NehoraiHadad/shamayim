import { describe, expect, it } from 'vitest'
import { receiverScene } from '../../test/receiverScene'
import type { RGB } from '../../world/types'
import { diffuseSky, skyReflection } from './landSkyIrradiance'
import type { RadianceLight } from './landIrradiance'
import { linearLuminance, srgbRgbToLinear } from './landRadiance'
import { rgbOf } from './tone'
import { domeSectors, GOLD_F0 } from './metalLight'
import { solarSkyGlows } from './sky'

const light = {
  ambient: [.36, .29, .63],
  palette: { top: '#303d91', horizon: '#f69d66' },
  diffuse: 0,
  afterglow: { rgb: [1, .17, .0003] },
} as unknown as RadianceLight

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
  it.each([1.4, -5])('uses the same reflected and diffuse chromaticity at %s°', (altitude) => {
    const tau = .099
    const diffuse = diffuseSky(light, altitude, tau).rgb
    const sample = skyReflection(light, altitude, tau, diffuse)
    const integral = [0, 0, 0]
    for (let i = 0; i < 24; i++) {
      const up = (i + .5) / 24
      for (let j = 0; j < 36; j++) {
        const toward = Math.sqrt(1 - up ** 2) * Math.cos((j + .5) * Math.PI / 18)
        sample(up, toward).forEach((channel, k) => { integral[k] += up * channel })
      }
    }
    const [dx, dy] = xy(diffuse), [rx, ry] = xy(integral)
    const dxy = Math.hypot(dx - rx, dy - ry)
    expect(dxy).toBeLessThan(.03)
  })
})

describe('sunward reflected sky lobe', () => {
  it('puts the painted sunward hue on the brightest sector of the conductor', () => {
    // At the solar aura cutoff, only the ridge glow overlays this uniform sky.
    const altitude = -1.5
    const scene = receiverScene(252, altitude, 0)
    const x = 295, y = 390
    const painted = '#aeaa65'
    const horizon = rgbOf(painted)
    const fixture = {
      ...scene,
      relief: { ...scene.relief, horizonY: y },
      bodies: { ...scene.bodies, sun: { ...scene.bodies.sun, x, y } },
      light: { ...scene.light, clear: .85, diffuse: .15, ambient: horizon,
        palette: { ...scene.light.palette, horizon: painted, top: painted },
        glow: { side: 'west' as const, opacity: .34, x, y },
        afterglow: { x, altitude, rgb: [1, .45, .25] as RGB },
      },
    }
    const [glow] = solarSkyGlows(fixture, 0, 0, 1)
    // At the center the gradient has its full painted alpha over the horizon.
    const rgb: RGB = [0, 1, 2].map(i => (1 - glow.alpha) * horizon[i] + glow.alpha * glow.rgb[i]) as [number, number, number]
    const sectors = domeSectors(fixture, 0).flat().map(srgbRgbToLinear)
    const unlit = { ...fixture, light: { ...fixture.light, glow: null } }
    expect(sectors).not.toEqual(domeSectors(unlit, 0).flat().map(srgbRgbToLinear))
    const peak = sectors.reduce((a, b) => linearLuminance(a) > linearLuminance(b) ? a : b)
    const [r, g, b] = srgbRgbToLinear(rgb)
    const delta = hue(peak) - hue([GOLD_F0[0] * r, GOLD_F0[1] * g, GOLD_F0[2] * b])
    expect(Math.abs((delta + 540) % 360 - 180)).toBeLessThan(8)
  })
})
