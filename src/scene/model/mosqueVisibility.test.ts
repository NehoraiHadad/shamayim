import fs from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { loadIsrael } from '../../data/landmarks/israelData'
import { withPlaceHomes } from '../../data/landmarks/placeMarks'
import { DATUM_PLACES, SCENE_PLACES, SKYLINE_STUDY_PLACES, STILL_PLACES, VILLAGE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput } from '../../test/sceneWorld'
import { portraitStyle } from '../../world/place'
import { SCENE_H, SCENE_W } from '../../world/sceneBox'
import { buildWorld } from '../../world/world'
import { sceneModel } from '.'

const places = new Map(
  [...SCENE_PLACES, ...SKYLINE_STUDY_PLACES, ...STILL_PLACES, ...DATUM_PLACES, ...VILLAGE_PLACES]
    .map(place => [place.id, place]),
)
const suffix = '.panorama.json'
const fixtures = fs.readdirSync(path.join(__dirname, '../../test/fixtures/scene'))
  .filter(file => file.endsWith(suffix)).map(file => file.slice(0, -suffix.length))
const mosque = /minaret|mosque|masjid/i

beforeAll(stubPublicFetch)
afterAll(() => vi.unstubAllGlobals())

it('covers the recorded Bardala panorama', () => {
  expect(fixtures).toContain('bardala')
})

it.each(fixtures)('%s keeps mosques out of both painters’ input', async id => {
  const place = places.get(id)
  if (!place) throw new Error(`Missing place metadata for ${id}`)
  const loaded = (await loadPlaces([place])).get(id)!
  const raw = await loadIsrael(place, new AbortController().signal)
  if (id === 'bardala') expect(raw?.some(mark => mark.kind === 'minaret' && mark.heightM === 9)).toBe(true)
  // Compare the evidence input before and after narrowing it to the scene pool.
  expect(portraitStyle(place, loaded.landmarks, loaded.city))
    .toEqual(portraitStyle(place, withPlaceHomes(place, raw ?? []), loaded.city))

  const world = buildWorld(worldInput(loaded, '2026-11-17T12:00'))
  for (const mark of [...world.marks, ...world.seatPool]) {
    expect(mark.kind).not.toMatch(mosque)
    expect(mark.glyphKind).not.toMatch(mosque)
  }
  const model = sceneModel(world, { width: SCENE_W, landHeight: SCENE_H, landTop: 0, skyHeight: 0, dpr: 2 })
  for (const layer of model.layers) {
    if (layer.kind === 'marks') for (const glyph of layer.glyphs) expect(glyph.kind).not.toMatch(mosque)
    if (layer.kind === 'outside') {
      for (const item of layer.items) if (item.kind === 'mark') expect(item.glyph.kind).not.toMatch(mosque)
    }
  }
})
