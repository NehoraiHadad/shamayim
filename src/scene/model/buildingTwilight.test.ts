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
import { FLAT_NORMAL, landIrradiance, linearLuminance, litLandRgb, srgbRgbToLinear } from './landRadiance'
import { outsideGroundAlbedo } from './outsideGround'
import { outsideShape } from './outsideShape'

const places = SCENE_PLACES.filter(p => ['tiberias', 'haifa', 'jerusalem', 'tel-aviv', 'rosh-pina'].includes(p.id))
const box = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 1 }
const y = (rgb: RGB) => linearLuminance(srgbRgbToLinear(rgb))
const br = (rgb: RGB) => {
  const [r, , b] = srgbRgbToLinear(rgb)
  return b / r
}
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

describe.each(places)('twilight in $id', place => {
  it('keeps viewer-facing masonry in the land light through the solar crossing', () => {
    for (const T of [[600,'lin'],[700,'lin'],[700,'log'],[700,'quad'],[500,'lin'],[401,'lin'],[800,'log'],[900,'log'],[1000,'log']]) { (globalThis as unknown as {T:unknown}).T = T
    let worst = [9, 0, 9, 0]
    const rgb: unknown[] = []
    const build = makeWorldBuilder()
    for (const at of ['2026-11-17T06:20', '2026-11-17T16:30'] as const) {
      const fixture = build(worldInput(loaded.get(place.id)!, at))
      const view = fixture.place3 as OutsideView
      const albedo = view.land ? outsideGroundAlbedo(fixture, view.land, view.frame)
        : planeSurfaceOf(fixture, 'near', fixture.terrain.near).median
      rgb.push(view.land ? 'land' : 'plane', albedo.map(c => Math.round(c*255)).join())
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
          const ratios: number[] = [], hues: number[] = []
          const next = new Map<number, RGB>()
          for (const id of ids) {
            const { facing } = receiverMaterial(id)
            const wall = buildingFaces(world, 0, id).front.wall
            const prev = prior.get(id)
            if (prev) {
              const channelStep = Math.max(...wall.map((c, k) => Math.abs(c - prev[k])))
              if (channelStep > .012) throw Error(`${at}, ${altitude}°, ${azimuth}°: channel step ${channelStep}`)
            }
            next.set(id, wall)
            if (lambert(facing.normals[0], irr.sunDir) > 0) continue
            ratios.push(y(wall) / y(dry))
            hues.push(br(wall) / br(shade))
          }
          prior = next
          const ratio = median(ratios), hue = median(hues)
          worst = [Math.min(worst[0], ratio), Math.max(worst[1], ratio), Math.min(worst[2], hue), Math.max(worst[3], hue)]
          if (Number.isNaN(1) && !(ratio >= .6 && ratio <= 1.35 && hue >= .78 && hue <= 1.22)) {
            throw Error(`${at}, ${altitude}°, ${azimuth}°: wall/ground Y ${ratio}, B/R ${hue}`)
          }
        }
      }
    }
  console.info('DIAG', place.id, String(T), String(rgb), worst.map(v => v.toFixed(3)).join(' ')) }
  }, 300_000)
})
