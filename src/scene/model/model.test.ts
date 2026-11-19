import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { seenFromOutside } from '../../data/city/outsideView'
import { portraitReach } from '../../data/landmarks/portrait'
import type { LocalTime } from '../../domain/types'
import { hillScene } from '../../ui/scene/marks/hillScene'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { textWidth } from '../../world/layout'
import { markBox } from '../../world/marks'
import { buildWorld, makeWorldBuilder } from '../../world/world'
import { layersOn, sceneModel } from '.'
import type { SceneBox } from './types'

/** Stage C1 (docs/design/CANVAS-SCENE-PLAN.md §4): the model's skeleton, the overlay and the scrub split. */
const TIMES: LocalTime[] = ['2026-11-17T06:20', '2026-11-17T12:00', '2026-11-17T16:30', '2026-11-17T21:00']
const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
let loaded: Map<string, LoadedPlace>

beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces()
})
afterAll(() => { vi.unstubAllGlobals() })

describe.each(SCENE_PLACES)('scene model: $id', ({ id }) => {
  it('places the dot and the notes where the SVG scene puts them, the height label clear of the marks', () => {
    const place = loaded.get(id)!
    const input = worldInput(place, TIMES[1])
    const world = buildWorld(input)
    const elevation = input.forecast.elevation
    const rounded = Math.round(elevation)
    const towers = place.city?.raster?.towers ?? place.city?.towers ?? []
    const outside = seenFromOutside(place.place, place.landmarks, towers, portraitReach(place.city?.clusters))
    // The same layout the SVG scene runs (`ValleyScene` → `hillScene`), with the world's variant (B for a city seen from
    // outside, the portrait otherwise).
    const hill = hillScene({ place: place.place, terrain: place.terrain, landmarks: place.landmarks, city: place.city, width: 375,
      litShare: 0, datum: elevation < 0, variant: outside ? 'b' : null,
      label: { text: `${rounded < 0 ? `−${Math.abs(rounded)}` : rounded} מ׳`, below: elevation < 0 } })
    const { overlay } = sceneModel(world, BOX)
    // The height label (stage C4): the world's own layout, next to the dot and clear of the marks the canvas draws (the
    // SVG scene placed it against its own houses, which the canvas does not draw).
    const height = overlay.find((item) => item.kind === 'height')!
    expect(height).toMatchObject({ x: world.labels.height.x, y: world.labels.height.y })
    const w = textWidth(world.labels.height.text, 11)
    for (const mark of world.marks.filter((m) => m.plane !== 'far')) {
      const box = markBox(mark)
      const clear = box.right <= height.x - w / 2 || box.left >= height.x + w / 2 || box.bottom <= height.y || box.top >= height.y + 11
      // Where no spot is free the label keeps its own (`placeLabel`'s fallback, as the SVG layout's).
      if (!clear) expect(height.y + 11, mark.id).toBeGreaterThan(110)
    }
    expect(overlay.find((item) => item.kind === 'dot')).toEqual({ kind: 'dot',
      x: Number.parseFloat(place.terrain.centerLeft) / 100 * 375, y: hill.centerY })
    expect(overlay.filter((item) => item.kind === 'datum' || item.kind === 'water'))
      .toEqual(hill.notes.map((note) => ({ kind: note.kind, text: note.text, x: note.left, y: note.top })))
    // Scaled across with the figure, heights as they are.
    const wide = sceneModel(world, { ...BOX, width: 750 }).overlay
    overlay.forEach((item, i) => expect(wide[i]).toMatchObject({ x: item.x * 2, y: item.y }))
  })

  it('is a pure function of the world and the box', () => {
    const world = buildWorld(worldInput(loaded.get(id)!, TIMES[2]))
    expect(JSON.stringify(sceneModel(world, BOX))).toBe(JSON.stringify(sceneModel(world, BOX)))
  })

  it('keeps the land form keys through a scrub; only light and sky keys move', () => {
    const build = makeWorldBuilder()
    const input = worldInput(loaded.get(id)!, TIMES[0])
    const models = TIMES.map((at) => sceneModel(build({ ...input, selected: at }), BOX))
    const land = models.map((model) => layersOn(model, 'land'))
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
    // C3: far water (here only the sea-level datum: the fixture's height is below sea level) and the far towns between
    // the far plane and the near ridge, the sea (within the near band) over the near plane.
    // C4: the marks on the near ridge (the Báb, the Carmel's church and mosque) over it all, with the portrait.
    expect(model.layers.map((layer) => layer.id)).toEqual(['sky', 'plane.far', 'water.far', 'farCities', 'plane.near', 'water.near',
      'portrait'])
    for (const layer of model.layers) {
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
    expect(layersOn(model, 'land').map((layer) => layer.id)).toEqual(layersOn(sceneModel(world, BOX), 'land').map((layer) => layer.id))
  })
})
