import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import type { StoredPanorama } from '../data/terrain/panorama'
import { DATUM_PLACES, SCENE_PLACES, SKYLINE_STUDY_PLACES, STILL_PLACES, VILLAGE_PLACES } from '../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../test/sceneWorld'
import { heightText } from '../text/isolate'
import { heightMark, MARK_WIDTHS, TICK } from './heightMark'
import { boxAround, overlaps, VISIBLE_BOTTOM, type Box } from './layout'
import { heightLabelBox } from './sceneClearance'
import { groundAt } from './sceneLight'
import { SCENE_W } from './sceneBox'
import { buildWorld } from './world'

const records = import.meta.glob<StoredPanorama>('../test/fixtures/scene/*.panorama.json', { eager: true, import: 'default' })
const places = [...SCENE_PLACES, ...DATUM_PLACES, ...STILL_PLACES, ...SKYLINE_STUDY_PLACES, ...VILLAGE_PLACES]
/** The dot as drawn with its rim (px). */
const DOT_DRAWN = 3
/** The slowest a place's mark may be to stand (ms, the best of three on a shared runner). */
const BUDGET_MS = 12
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

function worldOf(id: string) {
  const input = worldInput(loaded.get(id)!, '2026-11-17T12:00')
  const metres = records[`../test/fixtures/scene/${id}.panorama.json`].groundM
  return { metres, world: buildWorld({ ...input, forecast: { ...input.forecast, elevation: metres } }) }
}

it.each(places)('$id: the real height over the spot, clear of every note at every width', ({ id }) => {
  const { metres, world } = worldOf(id)
  const { labels: { height, notes, datum }, place3 } = world
  if (place3.kind !== 'outside') throw new Error(`${id} is not seen from outside`)
  const { dot } = place3
  expect(height.text).toBe(heightText(Math.round(metres)))
  expect(height.below).toBe(metres < 0)
  expect(dot.x).toBeCloseTo(Number.parseFloat(loaded.get(id)!.terrain.centerLeft) / 100 * SCENE_W, 6)
  const { tick } = height
  told.push(JSON.stringify([id, Math.round(height.x - dot.x), Math.round(height.y - dot.y), Math.round(tick.bottom - tick.top), Math.round(dot.y - tick.bottom), height.on]))
  expect(tick.bottom - tick.top, 'a tick').toBeGreaterThanOrEqual(TICK.min - 1e-6)
  expect(dot.y - tick.bottom, 'down to the dot').toBeLessThanOrEqual(DOT_DRAWN + 1.5)
  expect(tick.bottom).toBeLessThan(dot.y - DOT_DRAWN)
  for (const width of MARK_WIDTHS) {
    const sx = width / SCENE_W
    const { x, y, w, h } = heightLabelBox(height, width)
    const letters = { left: x, right: x + w, top: y, bottom: y + h }
    expect(letters.left).toBeGreaterThanOrEqual(2 - 1e-6)
    expect(letters.right).toBeLessThanOrEqual(width - 2 + 1e-6)
    expect(letters.top).toBeGreaterThanOrEqual(2 - 1e-6)
    expect(letters.bottom).toBeLessThanOrEqual(VISIBLE_BOTTOM)
    expect(letters.left, 'the tick under the letters').toBeLessThan(dot.x * sx)
    expect(letters.right, 'the tick under the letters').toBeGreaterThan(dot.x * sx)
    const line: Box = { left: dot.x * sx - TICK.half, right: dot.x * sx + TICK.half, ...tick }
    const spot = boxAround(dot.x * sx, dot.y, DOT_DRAWN)
    for (const n of notes) {
      const note = { left: n.left * sx, right: n.left * sx + n.width, top: n.top, bottom: n.top + n.height }
      for (const [part, box] of Object.entries({ letters, line, spot })) expect(overlaps(box, note), `${part} on ${n.text} at ${width}`).toBe(false)
    }
    for (const s of datum?.segments ?? []) {
      const row = { left: s.x1 * sx, right: s.x2 * sx, top: datum!.y - 1, bottom: datum!.y + 1 }
      expect(overlaps(letters, row), `letters on the sea-level line at ${width}`).toBe(false)
    }
  }
}, 60_000)

it.each(['tel-aviv', 'haifa', 'masada'])('%s: the mark stands within its own budget, the same each time', (id) => {
  const { world: { labels, marks, terrain, place3 } } = worldOf(id)
  if (place3.kind !== 'outside') throw new Error(`${id} is not seen from outside`)
  const landY = (x: number) => Math.min(groundAt(terrain.near.points, x), groundAt(terrain.far.points, x))
  const place = () => heightMark({ text: labels.height.text, dot: place3.dot, view: place3, marks, labels, landY })
  const first = place()
  let best = Infinity
  for (let i = 0; i < 3; i++) {
    const from = performance.now()
    expect(place()).toEqual(first)
    best = Math.min(best, performance.now() - from)
  }
  expect(best).toBeLessThan(BUDGET_MS)
})
