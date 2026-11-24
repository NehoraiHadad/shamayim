import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { StoredPanorama } from '../../data/terrain/panorama'
import { sceneModel } from '../../scene/model'
import { outsideShape } from '../../scene/model/outsideShape'
import { DATUM_PLACES, SCENE_PLACES, SKYLINE_STUDY_PLACES, STILL_PLACES, VILLAGE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { overlaps, VISIBLE_BOTTOM } from '../layout'
import { heightLabelBox, sceneClearance, type ScreenBox } from '../sceneClearance'
import { SCENE_W } from '../sceneBox'
import { buildWorld } from '../world'
import { CAPTION_OPTIONS } from './types'
import { withCaption } from './withCaption'

const BOX = { width: SCENE_W, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const records = import.meta.glob<StoredPanorama>('../../test/fixtures/scene/*.panorama.json', { eager: true, import: 'default' })
const places = [...SCENE_PLACES, ...DATUM_PLACES, ...STILL_PLACES, ...SKYLINE_STUDY_PLACES, ...VILLAGE_PLACES]
let loaded: Map<string, LoadedPlace>
const told: string[] = []

beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces(places)
}, 120_000)
afterAll(() => {
  vi.unstubAllGlobals()
  console.log(told.join('\n'))
})

const rect = ({ x, y, w, h }: ScreenBox) => ({ left: x, right: x + w, top: y, bottom: y + h })

describe.each(CAPTION_OPTIONS)('caption option %s', (option) => {
  it.each(places)('$id: on the figure, clear of every note, no mark dropped', ({ id }) => {
    const input = worldInput(loaded.get(id)!, '2026-11-17T12:00')
    const plain = buildWorld({ ...input, forecast: { ...input.forecast, elevation: records[`../../test/fixtures/scene/${id}.panorama.json`].groundM } })
    const world = withCaption(plain, option)
    const { caption } = world.labels.height
    if (!caption || world.place3.kind !== 'outside') throw new Error(`no caption for ${id}`)
    const { dot } = world.place3
    expect(caption.spot).toEqual(dot)
    expect(withCaption(plain, option).labels).toEqual(world.labels)
    told.push(JSON.stringify([option, id, Math.round(caption.x - dot.x), Math.round(caption.y - dot.y), caption.tick
      ? Math.round(caption.tick.bottom - caption.tick.top) : 0, caption.on, Math.round(caption.slope * 57.3)]))
    for (const width of [320, SCENE_W, 430]) {
      const sx = width / SCENE_W, box = { ...BOX, width }
      const zone = rect(heightLabelBox(world.labels.height, width))
      expect(zone.left).toBeGreaterThanOrEqual(2 - 1e-6)
      expect(zone.right).toBeLessThanOrEqual(width - 2 + 1e-6)
      expect(zone.top).toBeGreaterThanOrEqual(2 - 1e-6)
      expect(zone.bottom).toBeLessThanOrEqual(VISIBLE_BOTTOM - 2 + 1e-6)
      const notes = world.labels.notes.map(n => rect({ x: n.left * sx, y: n.top, w: n.width, h: n.height }))
      expect(notes.filter(n => overlaps(n, zone, -1e-6))).toEqual([])
      const drawn = (w: typeof world) => {
        const clear = sceneClearance(w.labels, dot, width)
        const far = sceneModel(w, box).layers.flatMap(layer => layer.kind === 'marks' ? layer.glyphs : [])
        return [...far, ...outsideShape(w, box, clear).items.flatMap(item => item.kind === 'mark' ? [item.glyph] : [])].map(g => g.sourceId).sort()
      }
      const bare = { ...plain, labels: { ...plain.labels, height: { ...plain.labels.height, x: -SCENE_W, backed: false } } }
      expect(drawn(world)).toEqual(drawn(bare))
    }
  }, 60_000)
})
