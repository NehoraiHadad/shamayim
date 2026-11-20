import { beforeAll, describe, expect, it } from 'vitest'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../test/sceneWorld'
import { DATUM_PLACES, SCENE_PLACES } from '../test/scenePlaces'
import { addMinutes } from '../domain/time'
import { sceneModel } from '../scene/model'
import { landTopOf } from '../scene/model/life'
import { rayStrengths } from '../scene/model/rays'
import { skyGeom } from '../scene/model/sky'
import { buildWorld } from './world'

/*
 * The owner's report of 2026-11-20: a low sun drawn over the near hill and the town. The rule: everything in the sky is
 * hidden by the land and structures drawn in front of it, and the light judges the sun on that same drawn line, so the
 * disc sinks behind the drawn land as the light goes, at every place.
 */

const BOX = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 1 }
let places: Map<string, LoadedPlace>
beforeAll(async () => {
  stubPublicFetch()
  places = await loadPlaces([...SCENE_PLACES, ...DATUM_PLACES])
}, 120_000)

describe('the sun and moon set behind the land as drawn', () => {
  it('judges the sun up or behind the land on the drawn land\'s top at sunrise and sunset, at all 12 places', { timeout: 240_000 }, () => {
    let behind = 0, over = 0
    for (const [id, p] of places) {
      const day = worldInput(p, '2026-11-17T12:00').forecast.days.find((d) => d.date === '2026-11-17')!
      for (const [base, from, to] of [[day.sunrise, -10, 50], [day.sunset, -100, 20]] as const) {
        const seen: boolean[] = []
        for (let m = from; m <= to; m += 10) {
          const at = addMinutes(base, m)
          const world = buildWorld(worldInput(p, at))
          const model = sceneModel(world, BOX)
          const geom = skyGeom(world, BOX)
          const top = landTopOf(world, BOX, geom, model.layers.filter((l) => l.surface === 'land'))
          const sun = world.bodies.sun
          // The disc's top (where the world places the sun) against what the model draws in front of it.
          const x = geom.left + sun.x * geom.s, y = BOX.landTop + sun.y
          if (Math.abs(top(x) - y) > 1.5) expect(sun.overLand, `${id} ${at}: disc ${y.toFixed(1)}, land ${top(x).toFixed(1)}`).toBe(y < top(x))
          // The light agrees: no sunlight, glare or disc over the land from a sun behind it.
          if (!sun.overLand) {
            expect(world.light.source, `${id} ${at}`).not.toBe('sun')
            expect(rayStrengths(world).corona).toBe(0)
          }
          expect(model.layers.some((l) => l.id.startsWith('bodies.') && l.surface === 'land'), `${id} ${at}`).toBe(false)
          seen.push(sun.overLand)
          if (sun.overLand) over++
          else behind++
        }
        // Each edge of the day goes from behind the land to over it (or back), once.
        expect(new Set(seen).size, `${id} ${base}`).toBe(2)
      }
    }
    expect(behind).toBeGreaterThan(20)
    expect(over).toBeGreaterThan(20)
  })

  it('hides the moon by the same line', () => {
    const p = places.get('jerusalem')!
    for (const at of ['2026-11-17T09:00', '2026-11-17T14:00', '2026-11-17T20:00'] as const) {
      const world = buildWorld(worldInput(p, at))
      const geom = skyGeom(world, BOX)
      const top = landTopOf(world, BOX, geom, sceneModel(world, BOX).layers.filter((l) => l.surface === 'land'))
      const moon = world.bodies.moon
      const x = geom.left + moon.x * geom.s, y = BOX.landTop + moon.y
      if (Math.abs(top(x) - y) > 1.5) expect(moon.overLand, at).toBe(y < top(x))
    }
  })
})
