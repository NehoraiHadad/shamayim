import { expect, it, vi } from 'vitest'
import { receiverScene } from '../../test/receiverScene'
import { NORMALS } from '../../world/livingLight'
import { aerosolDepth } from '../../world/sceneLight'
import { buildingLight, buildingSurroundings } from './buildingLight'
import { linearLuminance, srgbRgbToLinear } from './landRadiance'
import * as skyIrradiance from './landSkyIrradiance'
import { domeSectors } from './metalLight'
import { reflectedSkyLobe } from './reflectedSkyLobe'
import { worldAtHaifaTwilight } from './twilightSkyFixture.testSupport'

it('increases the Haifa 16:30 dome red-blue separation without changing reflected sky luminance', async () => {
  const world = await worldAtHaifaTwilight('16:30')
  const original = skyIrradiance.skyReflection
  const reflected = vi.spyOn(skyIrradiance, 'skyReflection')
  const render = (w: typeof world) => {
    buildingLight(w, 0).glass(NORMALS.front)
    const sectors = domeSectors(w, 0).flat().map(srgbRgbToLinear)
    // The still uses linear red minus blue as its gilding chroma measure.
    const chroma = sectors.map(([r, , b]) => r - b).sort((a, b) => a - b)
    return chroma[Math.floor(chroma.length / 2)]
  }
  try {
    const actual = render(world)
    const samples = reflected.mock.results.map(({ value }) => value(.25, .5))
    reflected.mockClear()
    // Omit the final cloud-colour argument, leaving all other round-5 inputs in place.
    reflected.mockImplementation((...args) => Reflect.apply(original, undefined, args.slice(0, 7)))
    const baseline = render({ ...world })
    expect(actual).toBeGreaterThan(baseline)
    expect(samples).toHaveLength(2)
    reflected.mock.results.forEach(({ value }, i) => {
      const neutral = value(.25, .5)
      expect(samples[i]).not.toEqual(neutral)
      expect(linearLuminance(samples[i])).toBeCloseTo(linearLuminance(neutral), 12)
    })
  } finally {
    reflected.mockRestore()
  }
})

it.each([[2, 1], [38, 0]])('keeps reflection identical at altitude %s with open share %s', (altitude, open) => {
  const world = receiverScene(252, altitude, open)
  const { irr } = buildingSurroundings(world)
  const tau = .099 + aerosolDepth(world.air)[1]
  const basis = reflectedSkyLobe(world)
  const neutral = skyIrradiance.skyReflection(world.light, altitude, tau, irr.eSkyVec, basis)
  const colored = skyIrradiance.skyReflection(world.light, altitude, tau, irr.eSkyVec, basis, 0, 'rough', [1, .2, .3])
  expect(colored(.25, .5)).toEqual(neutral(.25, .5))
})
