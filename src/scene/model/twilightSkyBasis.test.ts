import { describe, expect, it, vi } from 'vitest'
import { receiverScene } from '../../test/receiverScene'
import { NORMALS } from '../../world/livingLight'
import { evenAir } from '../../world/townAir'
import type { RGB } from '../../world/types'
import { buildingLight, buildingSurroundings } from './buildingLight'
import * as skyIrradiance from './landSkyIrradiance'
import { linearLuminance, srgbRgbToLinear } from './landRadiance'
import { domeSectors, metalLight, silverLight } from './metalLight'
import { reflectedSkyLobe } from './reflectedSkyLobe'
import { rgbOf } from './tone'
import { referenceSkyLobe, worldAtHaifaTwilight } from './twilightSkyFixture.testSupport'

const GOLD: RGB = [1, .766, .336]
const SUNWARD = [.63, -.63, .45] as const

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

function checkMetalQuadrature(world: Awaited<ReturnType<typeof worldAtHaifaTwilight>>, fixture: string) {
  const reference = referenceSkyLobe(world)
  const error = (sample: RGB) => Math.max(...sample.map((channel, i) => Math.abs(channel / reference[i] - 1)))
  const production = error(reflectedSkyLobe(world, 'metal'))
  const trial = error(referenceSkyLobe(world, 12, 8))
  console.info(`${fixture} metal lobe maximum relative channel error (24 × 16 / 12 × 8): ${production} / ${trial}`)
  expect(production).toBeLessThan(.02)
}

describe('clear twilight sky', () => {
  it.each([[1.4, '16:27'], [-5, '17:00']] as const)(
    'keeps the glass and gold sky averages close to the diffuse chromaticity near %s°', async (altitude, time) => {
    const world = await worldAtHaifaTwilight(time)
    expect(Math.abs(world.bodies.sun.altitude - altitude)).toBeLessThan(.5)
    expect(world.light.afterglow).not.toBeNull()
    expect(world.light.ambient).toEqual(rgbOf(world.light.palette.mid))
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
  it('resolves a steep elevation colour gradient in the metal lobe', () => {
    const world = receiverScene(252, -1.5)
    world.light = { ...world.light, glow: null,
      palette: { ...world.light.palette, top: '#102bda', mid: '#102bda', horizon: '#dd8020' } }
    checkMetalQuadrature(world, 'steep gradient')
  })

  it.each(['16:27', '16:30', '17:00'] as const)('integrates the painted metal lobe at %s within 2%% per channel', async time => {
    checkMetalQuadrature(await worldAtHaifaTwilight(time), `Haifa ${time}`)
  })

  it('attenuates only the direct conductor return as the disc goes behind the skyline', async () => {
    const world = await worldAtHaifaTwilight('16:27')
    const { irr } = buildingSurroundings(world)
    const { across, ahead, up } = irr.sunDir
    const size = Math.hypot(across, ahead - 1, up)
    const normal = [across / size, (ahead - 1) / size, up / size] as const
    const atVisibility = (visible: number) => ({
      ...world, bodies: { ...world.bodies, sun: { ...world.bodies.sun, visible } },
    })
    const hidden = atVisibility(0), partial = atVisibility(.5), open = atVisibility(1)
    expect(reflectedSkyLobe(hidden, 'metal')).toEqual(reflectedSkyLobe(open, 'metal'))
    const y = (w: typeof world) => linearLuminance(srgbRgbToLinear(metalLight(w, 0)(normal)))
    expect(y(hidden)).toBeGreaterThan(0)
    expect(y(partial)).toBeGreaterThan(y(hidden))
    expect(y(open)).toBeGreaterThan(y(partial))
  })

  it('puts the painted sunward hue on the brightest sector of the conductor', () => {
    // At the solar aura cutoff, only the ridge glow overlays this uniform sky.
    const altitude = -1.5
    const world = receiverScene(252, altitude, 0)
    const painted = '#aeaa65', horizon = rgbOf(painted)
    world.light = { ...world.light, clear: .85, diffuse: .15, ambient: horizon,
      palette: { ...world.light.palette, horizon: painted, mid: painted, top: painted },
      afterglow: { x: world.bodies.sun.x, altitude, rgb: [1, .45, .25] },
    }
    const sectors = domeSectors(world, 0).flat().map(srgbRgbToLinear)
    const unlit = { ...world, light: { ...world.light, glow: null } }
    expect(sectors).not.toEqual(domeSectors(unlit, 0).flat().map(srgbRgbToLinear))
    const peak = sectors.reduce((a, b) => linearLuminance(a) > linearLuminance(b) ? a : b)
    const [r, g, b] = referenceSkyLobe(world)
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
