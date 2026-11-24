import fs from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { cellsForStrip, loadIsrael, type IsraelLandmarkIndex, type LandmarkCell } from '../../data/landmarks/israelData'
import { BELOW_SEA_PLACES, SCENE_PLACES, SKYLINE_STUDY_PLACES, STILL_PLACES, VILLAGE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput } from '../../test/sceneWorld'
import { SCENE_H, SCENE_W } from '../../world/sceneBox'
import { buildWorld } from '../../world/world'
import { sceneModel } from '.'

const places = new Map(
  [...SCENE_PLACES, ...SKYLINE_STUDY_PLACES, ...STILL_PLACES, ...BELOW_SEA_PLACES, ...VILLAGE_PLACES]
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

it('loads the bundled minaret rows in Bardala’s landmark strip', async () => {
  const place = places.get('bardala')!
  const dir = path.join(__dirname, '../../../public/data/landmarks/il')
  const read = (file: string) => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
  const bundled = new Set((read('index.json') as IsraelLandmarkIndex).cells)
  const expected = cellsForStrip(place).filter(cell => bundled.has(cell)).flatMap(cell => {
    const payload = read(`${cell}.json`) as LandmarkCell
    return (Array.isArray(payload) ? payload : payload.rows).flatMap(([kind, lat, lon]) =>
      kind === 'minaret' ? [`il-${kind}-${lat}-${lon}`] : [])
  })
  expect(expected.length).toBeGreaterThan(0)
  const raw = await loadIsrael(place, new AbortController().signal)
  expect(raw?.filter(mark => mark.kind === 'minaret').map(mark => mark.id)).toEqual(expected)
  expect(raw?.some(mark => mark.kind === 'minaret' && mark.heightM === 9)).toBe(true)
})

it.each(fixtures)('%s keeps mosques out of both painters’ input', async id => {
  const place = places.get(id)
  if (!place) throw new Error(`Missing place metadata for ${id}`)
  const loaded = (await loadPlaces([place])).get(id)!
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
