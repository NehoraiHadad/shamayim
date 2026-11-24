import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { smoothstep } from '../../domain/smoothstep'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput } from '../../test/sceneWorld'
import { AFTERGLOW, afterglowColour } from '../../world/afterglow'
import { lambert } from '../../world/livingLight'
import type { OutsideView, RGB, WorldState } from '../../world/types'
import { makeWorldBuilder } from '../../world/world'
import { buildingFaces } from './buildingLight'
import { receiverMaterial } from './buildingMaterial'
import { planeSurfaceOf } from './landColour'
import { albedoLinear, FLAT_NORMAL, landIrradiance, linearLuminance, linearRgbToSrgb, litLandRgb, srgbRgbToLinear } from './landRadiance'
import { outsideGroundAlbedo } from './outsideGround'
import { outsideShape } from './outsideShape'

const places = SCENE_PLACES.filter(p => ['tiberias', 'haifa', 'jerusalem', 'tel-aviv', 'rosh-pina'].includes(p.id))
const box = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 1 }
const y = (rgb: RGB) => linearLuminance(srgbRgbToLinear(rgb))
/** B/R of the light on a surface: its colour over its own reflectance (linear). */
const lightHue = (rgb: RGB, rho: readonly number[]) => {
  const [r, , b] = srgbRgbToLinear(rgb)
  return (b / rho[2]) / (r / rho[0])
}
/**
 * The light on a wall turned from the sun against the light on the shaded ground, B/R. Both have the sky's; the wall has the
 * ground's bounce (albedo about .15 in blue, .3 in red) as well, so it lies between 1.15 / 1.3 and 1. Over 1 are 3 % for the
 * warm low sky that the neighbours hide from a wall first. Measured .933-1.010 over the five places.
 */
const HUE = [.88, 1.03] as const
const median = (values: number[]) => values.sort((a, b) => a - b)[values.length >> 1]
let loaded: Awaited<ReturnType<typeof loadPlaces>>
beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces(places)
}, 120_000)
afterAll(() => vi.unstubAllGlobals())

function withSun(world: WorldState, altitude: number, azimuth: number): WorldState {
  const afterglow = altitude > AFTERGLOW.to && altitude < AFTERGLOW.from
    ? { x: 0, altitude, rgb: afterglowColour(altitude, world.air) } : null
  return {
    ...world,
    bodies: { ...world.bodies, sun: { ...world.bodies.sun, altitude, azimuth } },
    light: { ...world.light, afterglow },
    night: { ...world.night, dark: smoothstep(-4, -12, altitude) },
  }
}

it('tells the light on a wall from its paint', () => {
  // Half the ground's blue in the wall, twice the ground's in its light: painted alike, and still a light of another hue.
  const ground = [.3, .3, .3], wall = [.4, .4, .2], painted = linearRgbToSrgb([.4, .4, .4])
  expect(lightHue(painted, wall) / lightHue(linearRgbToSrgb([.3, .3, .3]), ground)).toBeGreaterThan(HUE[1])
})

describe.each(places)('twilight in $id', place => {
  it('keeps viewer-facing masonry in the land light through the solar crossing', () => {
    const build = makeWorldBuilder()
    let least = Infinity, most = 0
    for (const at of ['2026-11-17T06:20', '2026-11-17T16:30'] as const) {
      const fixture = build(worldInput(loaded.get(place.id)!, at))
      const view = fixture.place3 as OutsideView
      const albedo = view.land ? outsideGroundAlbedo(fixture, view.land, view.frame)
        : planeSurfaceOf(fixture, 'near', fixture.terrain.near).mean
      const rho = albedoLinear(albedo)
      const shape = outsideShape(fixture, box, [])
      const ids = [...new Set(shape.items.flatMap(i => i.kind === 'box' && !i.beyond ? [i.receiver] : []))]
      expect(ids.length).toBeGreaterThan(8)
      // Steer around each fixture's sunrise/sunset azimuth with the same facade materials.
      for (const offset of [-15, 0, 15]) {
        const azimuth = fixture.bodies.sun.azimuth + offset
        let prior = new Map<number, RGB>()
        for (let i = -80; i <= 100; i++) {
          const altitude = i / 10
          const world = withSun(fixture, altitude, azimuth)
          const irr = landIrradiance(world)
          const dry = litLandRgb(world, albedo)
          const shade = litLandRgb(world, albedo, FLAT_NORMAL, 0, undefined, 0)
          const ratios: number[] = [], groundHue = lightHue(shade, rho)
          const next = new Map<number, RGB>()
          for (const id of ids) {
            const { stone, glass, facing } = receiverMaterial(id)
            const wall = buildingFaces(world, 0, id).front.wall
            const prev = prior.get(id)
            if (prev) {
              const channelStep = Math.max(...wall.map((c, k) => Math.abs(c - prev[k])))
              if (channelStep > .012) throw Error(`${at}, ${altitude}°, ${azimuth}°: channel step ${channelStep}`)
            }
            next.set(id, wall)
            if (lambert(facing.normals[0], irr.sunDir) > 0) continue
            ratios.push(y(wall) / y(dry))
            if (glass) continue
            // Each wall by itself: no median of the rest may hide one.
            const hue = lightHue(wall, stone) / groundHue
            least = Math.min(least, hue); most = Math.max(most, hue)
            if (!(hue >= HUE[0] && hue <= HUE[1])) throw Error(`${at}, ${altitude}°, ${azimuth}°, wall ${id}: light B/R ${hue}`)
          }
          prior = next
          const ratio = median(ratios)
          if (!(ratio >= .6 && ratio <= 1.35)) {
            throw Error(`${at}, ${altitude}°, ${azimuth}°: wall/ground Y ${ratio}`)
          }
        }
      }
    }
    console.info('twilight wall light, B/R over the ground\'s', place.id, least.toFixed(3), most.toFixed(3))
  }, 30_000)
})
