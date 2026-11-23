import { describe, expect, it } from 'vitest'
import { receiverScene } from '../../test/receiverScene'
import type { RGB } from '../../world/types'
import { diffuseSky, skyReflection } from './landSkyIrradiance'
import type { RadianceLight } from './landIrradiance'
import { linearLuminance, srgbRgbToLinear } from './landRadiance'
import { rgbOf } from './tone'
import { domeSectors } from './metalLight'

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
    const scene = receiverScene(252, -.78, 0)
    const painted = '#f69d66'
    const fixture = { ...scene, light: { ...scene.light, diffuse: .15, palette: {
      ...scene.light.palette, horizon: painted, top: painted,
    }, ambient: rgbOf(painted) } }
    const sectors = domeSectors(fixture, 0).flat().map(srgbRgbToLinear)
    const peak = sectors.reduce((a, b) => linearLuminance(a) > linearLuminance(b) ? a : b)
    const [r, g, b] = srgbRgbToLinear(rgbOf(painted))
    const delta = hue(peak) - hue([r, .766 * g, .336 * b])
    expect(Math.abs((delta + 540) % 360 - 180)).toBeLessThan(8)
  })
})
