import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { LocalTime } from '../../domain/types'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { heightText } from '../../text/isolate'
import { DOT_R, LABEL_PX, textWidth } from '../../world/layout'
import { markBox } from '../../world/markGeometry'
import { BACKING_PAD } from '../../world/place'
import { buildWorld, makeWorldBuilder } from '../../world/world'
import { compositeOrder } from '../compose/compositeOrder'
import { layersOn, sceneModel } from '.'
import type { SceneBox } from './types'

/** Stage C1 (docs/design/CANVAS-SCENE-PLAN.md §4): the model's skeleton, the overlay and the scrub split. */
const TIMES: LocalTime[] = ['2026-11-17T06:20', '2026-11-17T12:00', '2026-11-17T16:30', '2026-11-17T21:00']
const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
/** The weather's kinds (C7). */
// The living light: the cloud's shadows on the land come and go with the cloud, as the weather does.
const WEATHER = new Set(['shafts', 'fall', 'mist', 'grains', 'rays', 'smoke', 'sheen', 'edge', 'cloudShadow', 'landDust'])
let loaded: Map<string, LoadedPlace>

beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces()
})
afterAll(() => { vi.unstubAllGlobals() })

it('measures the height label without its bidi isolates', () => {
  expect(textWidth(heightText(-137), LABEL_PX)).toBe(textWidth('−137 מ׳', LABEL_PX))
})

describe.each(SCENE_PLACES)('scene model: $id', ({ id }) => {
  it('places the dot and the notes, the height label clear of the marks', () => {
    const place = loaded.get(id)!
    const input = worldInput(place, TIMES[1])
    const world = buildWorld(input)
    const below = input.forecast.elevation < 0
    const { overlay } = sceneModel(world, BOX)
    // The height label (stage C4; C9: beside the dot, level with it, on its backing, for every place seen from outside):
    // the world's own layout, clear of the marks the canvas draws.
    const height = overlay.find((item) => item.kind === 'height')!
    expect(height).toMatchObject({ x: world.labels.height.x, y: world.labels.height.y, backed: true })
    const w = textWidth(world.labels.height.text, LABEL_PX)
    const dot = world.place3.dot
    expect(Math.abs(height.y + LABEL_PX / 2 - dot.y), 'level with the dot').toBeLessThanOrEqual(15.5)
    // Beside it: its backing 2 px off the dot's ring, or a few px farther out where a mark stands there.
    const gap = Math.abs(height.x - dot.x) - (DOT_R + 2 + BACKING_PAD + w / 2)
    expect(gap, 'beside the dot').toBeGreaterThan(-0.01)
    expect(gap, 'beside the dot').toBeLessThan(14.01)
    // Where the dot is ringed by marks (Tel Aviv: Azrieli, the Reading chimney, a church, a minaret) no spot beside it is
    // free: the label takes the one that covers least, one mark at most, on its backing.
    const covered = world.marks.filter((m) => m.plane !== 'far').filter((mark) => {
      const box = markBox(mark)
      return !(box.right <= height.x - w / 2 - BACKING_PAD || box.left >= height.x + w / 2 + BACKING_PAD
        || box.bottom <= height.y - BACKING_PAD || box.top >= height.y + LABEL_PX + BACKING_PAD)
    })
    expect(covered.length, covered.map((m) => m.id).join()).toBeLessThanOrEqual(id === 'tel-aviv' ? 1 : 0)
    expect(overlay.find((item) => item.kind === 'dot')).toEqual({ kind: 'dot',
      x: Number.parseFloat(place.terrain.centerLeft) / 100 * 375, y: world.place3.dot.y })
    // The datum only below sea level (the SVG scene's rule); the water's names on their water (C9, `notesOnWater`:
    // outside.test.ts).
    expect(overlay.filter((item) => item.kind === 'datum'))
      .toEqual(world.labels.notes.filter((note) => note.kind === 'datum').map((note) => ({ kind: note.kind, text: note.text, x: note.left, y: note.top })))
    // Below sea level only, and only where the picture's land reaches 0 m above the dot (`world/datum.ts`): the fixture's
    // height is below sea level at every place, but the ground of most of them is not.
    expect(overlay.some((item) => item.kind === 'datum')).toBe(below && Boolean(world.labels.datum))
    if (world.labels.datum) expect(below).toBe(true)
    expect(overlay.filter((item) => item.kind === 'water'))
      .toEqual(world.labels.notes.filter((note) => note.kind === 'water').map((note) => ({ kind: note.kind, text: note.text, x: note.left, y: note.top })))
    // Scaled across with the figure, heights as they are.
    const wide = sceneModel(world, { ...BOX, width: 750 }).overlay
    overlay.forEach((item, i) => expect(wide[i]).toMatchObject({ x: item.x * 2, y: item.y }))
  })

  it('is a pure function of the world and the box', () => {
    const world = buildWorld(worldInput(loaded.get(id)!, TIMES[2]))
    expect(JSON.stringify(sceneModel(world, BOX))).toBe(JSON.stringify(sceneModel(world, BOX)))
  })

  it('keeps static land forms through a scrub, including when the forecast wind changes', () => {
    const build = makeWorldBuilder()
    const input = worldInput(loaded.get(id)!, TIMES[0])
    const models = TIMES.map((at) => sceneModel(build({ ...input, selected: at }), BOX))
    // The weather comes and goes with the hour (C7: mist with the humidity, falling rain with the rain), so the scrub's
    // rule is held for the rest of the land.
    // Canopy strips follow the wind forecast while their terrain form stays fixed.
    // A flock's or plane's copy in front of the land comes and goes with the minute.
    const land = models.map((model) =>
      layersOn(model, 'land').filter((layer) => !WEATHER.has(layer.kind) && layer.kind !== 'canopy' && !layer.placed))
    for (const layers of land.slice(1)) {
      expect(layers.map((layer) => layer.key)).toEqual(land[0].map((layer) => layer.key))
    }
    const lightKeys = new Set(land.map((layers) => layers.map((layer) => layer.light?.key).join()))
    expect(lightKeys.size).toBeGreaterThan(1)
    const skyKeys = new Set(models.map((model) => layersOn(model, 'sky')[0].key))
    expect(skyKeys.size).toBe(TIMES.length)
  })
})

describe('scene model: layers', () => {
  it('orders the surfaces and keeps every layer inside its box', () => {
    const world = buildWorld(worldInput(loaded.get('haifa')!, TIMES[2]))
    const model = sceneModel(world, BOX)
    // C3: the far towns between the far plane and the near ridge, the sea (within the near band) over the near plane. (No
    // far water: the fixture's height is below sea level, but Haifa's ground, from the Carmel to the bay, is not, so the
    // picture has no 0 m above its dot and no datum, `world/datum.ts`.)
    // C4–C5: the place seen from outside over it all, its marks (the Báb, the Carmel's church and mosque) among its mass;
    // C7: the weather the hour has over them. (What flies in front of the land, laid where it is, comes and goes.)
    const land = layersOn(model, 'land')
    expect(land.filter((layer) => !layer.placed && layer.kind !== 'canopy').map((layer) => layer.id))
      .toEqual(['plane.far', 'farCities', 'plane.near', 'water.near', 'outside', 'smoke.near'])
    const passes = compositeOrder(land).map(({ desc, part }) => `${desc.id}:${part}`)
    for (const canopy of land.filter((layer) => layer.kind === 'canopy')) {
      const plane = land.find((l) => l.kind === 'plane' && l.canopyId === canopy.id)!
      const at = passes.indexOf(`${plane.id}:form`)
      expect(passes.slice(at, at + 4))
        .toEqual([`${plane.id}:form`, `${canopy.id}:form`, `${plane.id}:light`, `${canopy.id}:light`])
    }
    // C6: the sky's base first, then the stars, the bodies, the clouds high to low (lightning, shimmer).
    const sky = layersOn(model, 'sky')
    expect(sky[0].id).toBe('sky')
    expect(model.layers.slice(0, sky.length)).toEqual(sky)
    expect(sky.map((layer) => layer.z)).toEqual([...sky.map((layer) => layer.z)].sort((a, b) => a - b))
    // A drifting band repeats round the horizon (wider than the box, laid every `period`); a disc may stand at the edge.
    for (const layer of model.layers.filter((l) => !l.animated && l.kind !== 'bodies' && !l.placed)) {
      const height = layer.surface === 'sky' ? BOX.skyHeight : BOX.landHeight
      expect(layer.bounds.x).toBeGreaterThanOrEqual(0)
      expect(layer.bounds.y).toBeGreaterThanOrEqual(0)
      expect(layer.bounds.x + layer.bounds.w).toBeLessThanOrEqual(BOX.width)
      expect(layer.bounds.y + layer.bounds.h).toBeLessThanOrEqual(height)
    }
  })

  it('changes a key with the box and the pixel ratio', () => {
    const world = buildWorld(worldInput(loaded.get('jerusalem')!, TIMES[1]))
    const at = (box: Partial<SceneBox>) => Object.fromEntries(sceneModel(world, { ...BOX, ...box }).layers.map((l) => [l.id, l.key]))
    const base = at({})
    expect(at({ width: 400 })['plane.near']).not.toBe(base['plane.near'])
    expect(at({ dpr: 3 })['plane.near']).not.toBe(base['plane.near'])
    expect(at({ dpr: 3 }).sky).not.toBe(base.sky)
    expect(at({ landTop: 280 }).sky).not.toBe(base.sky)
  })

  it('leaves the sky out when there is no sky box (the app’s land figure)', () => {
    const world = buildWorld(worldInput(loaded.get('jerusalem')!, TIMES[1]))
    const model = sceneModel(world, { ...BOX, skyHeight: 0, landTop: 0 })
    expect(layersOn(model, 'sky')).toEqual([])
    // Airborne overlays need a sky box. Land lighting, including cloud shadows, belongs to both views.
    expect(layersOn(model, 'land').map((layer) => layer.id)).toEqual(
      layersOn(sceneModel(world, BOX), 'land').filter((layer) => !layer.placed).map((layer) => layer.id))
  })
})
