import { describe, expect, it } from 'vitest'
import { receiverScene } from '../../test/receiverScene'
import type { RGB, WorldState } from '../../world/types'
import { skyReflection } from './landSkyIrradiance'
import { linearLuminance, srgbRgbToLinear } from './landRadiance'
import { rgbOf } from './tone'
import { buildingLight, buildingSurroundings } from './buildingLight'
import { metalHorizon } from './buildingGround'
import { glassIncidence } from './glassLight'
import { domeSectors, metalLight, silverLight } from './metalLight'
import { AFTERGLOW, afterglowColour } from '../../world/afterglow'
import { aerosolDepth } from '../../world/sceneLight'
import { NORMALS } from '../../world/livingLight'
import { skyGlows, type SkyGeom } from './sky'
import type { SceneBox } from './types'

const referenceGlows = (world: Parameters<typeof skyGlows>[0]) =>
  skyGlows({ ...world, night: { ...world.night, litShare: 0 } },
    { landTop: 0 } as SceneBox, { left: 0, s: 1 } as SkyGeom)

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

describe('sunward reflected sky lobe', () => {
  it('keeps the aerosol tint in glazing and puts the painted sunward hue on gold', () => {
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
    const surroundings = buildingSurroundings(fixture)
    const noAfterglow = { ...fixture, light: { ...fixture.light, afterglow: null } }
    const pane = (world: WorldState) =>
      glassIncidence(world, surroundings)(NORMALS.front, [1, 1, 1], [1, 1, 1])
    expect(pane(fixture)).not.toEqual(pane(noAfterglow))

    const [glow] = referenceGlows(fixture)
    // At the center the gradient has its full painted alpha over the horizon.
    const rgb: RGB = [0, 1, 2].map(i => (1 - glow.alpha) * horizon[i] + glow.alpha * glow.rgb[i]) as [number, number, number]
    const sectors = domeSectors(fixture, 0).flat().map(srgbRgbToLinear)
    const unlit = { ...fixture, light: { ...fixture.light, glow: null } }
    expect(metalHorizon(fixture)).toBe(metalHorizon(fixture))
    expect(metalHorizon(fixture)).not.toEqual(metalHorizon(unlit))
    expect(pane(fixture)).toEqual(pane(unlit))
    expect(sectors).not.toEqual(domeSectors(unlit, 0).flat().map(srgbRgbToLinear))
    const peak = sectors.reduce((a, b) => linearLuminance(a) > linearLuminance(b) ? a : b)
    const [r, g, b] = srgbRgbToLinear(rgb)
    // Measured gold reflectance at normal incidence (Epic Games' metal table).
    const gold: RGB = [1, .766, .336]
    const delta = hue(peak) - hue([gold[0] * r, gold[1] * g, gold[2] * b])
    const normal = [.7, -.71, .05] as const
    expect(metalLight(fixture, 0, gold)(normal)).toEqual(metalLight(fixture, 0)(normal))
    expect(silverLight(fixture, 0)(normal)).not.toEqual(silverLight(unlit, 0)(normal))
    expect(Math.abs((delta + 540) % 360 - 180)).toBeLessThan(8)
  })
})

describe('clear twilight sky', () => {
  it.each([-1.5, 1.4, -6])('keeps the front pane and neutral wall within .04 in CIE xy at %s°', altitude => {
    const world = receiverScene(252, altitude)
    const receive = buildingLight(world, 0)
    const [wx, wy] = xy(srgbRgbToLinear(receive([1, 1, 1], NORMALS.front, 1, 0)))
    const [px, py] = xy(srgbRgbToLinear(receive.glass(NORMALS.front, false, [1, 1, 1], 1, 0)))
    // The pane samples near the horizon and the wall also sees the ground.
    expect(Math.hypot(wx - px, wy - py)).toBeLessThan(.04)
  })

  // Smoothstep's midpoint is .5 in the 2° lower and 2.3° upper fade windows.
  it.each([-6, 1.85])('blends the pane lobe halfway in linear RGB at %s°', altitude => {
    const world = receiverScene(252, altitude)
    const surroundings = buildingSurroundings(world)
    const { irr } = surroundings
    const horizon = srgbRgbToLinear(rgbOf(world.light.palette.horizon))
    const glow = srgbRgbToLinear(world.light.afterglow!.rgb)
    const lobe: RGB = [(horizon[0] + glow[0]) / 2, (horizon[1] + glow[1]) / 2, (horizon[2] + glow[2]) / 2]
    const sky = skyReflection(world.light, altitude, .099 + aerosolDepth(world.air)[1], irr.eSkyVec, lobe)
    const { across, ahead } = irr.sunDir
    const reflected = sky(.14, -ahead / Math.hypot(across, ahead))
    // Four glass surfaces at 4% normal-incidence reflectance, plus 37% interior fill.
    const f = .16 / 1.12
    const pane = glassIncidence(world, surroundings)(NORMALS.front, [1, 1, 1], [1, 1, 1])
    reflected.forEach((channel, i) => expect(pane[i]).toBeCloseTo(f * channel + .37 * (1 - f) * irr.eSkyVec[i], 10))
  })
})

it.each([AFTERGLOW.from, AFTERGLOW.to])('keeps painted ridge glow continuous at %s°', cutoff => {
  const ridgeColour = (altitude: number) => {
    const world = receiverScene(252, altitude)
    const x = 295, y = 390
    world.bodies.sun = { ...world.bodies.sun, x, y }
    world.light.glow = { side: 'west', opacity: .34, x, y }
    world.light.afterglow = altitude > AFTERGLOW.to && altitude < AFTERGLOW.from
      ? { x, altitude, rgb: afterglowColour(altitude, world.air) } : null
    return referenceGlows(world).at(-1)!.rgb
  }
  const before = ridgeColour(cutoff - .001), after = ridgeColour(cutoff + .001)
  before.forEach((channel, i) => expect(Math.abs(channel - after[i])).toBeLessThan(1 / 255))
})
