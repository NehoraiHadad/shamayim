import { readFileSync, readdirSync } from 'node:fs'
import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { unpackPanorama, type StoredPanorama } from '../data/terrain/panorama'
import { noteBoxes } from '../data/terrain/sceneNotes'
import { outsideShape } from '../scene/model/outsideShape'
import type { OutsideItem } from '../scene/model/types'
import { DATUM_PLACES, SCENE_PLACES, SKYLINE_STUDY_PLACES, STILL_PLACES, VILLAGE_PLACES } from '../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../test/sceneWorld'
import { coveredArea, besideDot } from './heightLabel'
import { headHeightSpot } from './heightLabelHead.fixture'
import { portraitLabelObstacles } from './heightLabelObstacles'
import { DOT_R, VISIBLE_BOTTOM, type Box } from './layout'
import { markBox } from './markGeometry'
import { heightLabelBox, hits, sceneClearance, type ScreenBox } from './sceneClearance'
import { SCENE_W } from './sceneBox'
import { buildWorld } from './world'

const BOX = { width: SCENE_W, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const records = new URL('../test/fixtures/scene/', import.meta.url)
const ids = readdirSync(records).filter(file => file.endsWith('.panorama.json')).map(file => file.replace('.panorama.json', ''))
const places = [...SCENE_PLACES, ...DATUM_PLACES, ...STILL_PLACES, ...SKYLINE_STUDY_PLACES, ...VILLAGE_PLACES]
const elevations = new Map(ids.map(id => {
  const raw = JSON.parse(readFileSync(new URL(id + '.panorama.json', records), 'utf8')) as StoredPanorama
  return [id, unpackPanorama(raw)!.groundM]
}))
let loaded: Map<string, LoadedPlace>

beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces(places.filter(place => ids.includes(place.id)))
}, 120_000)
afterAll(() => vi.unstubAllGlobals())

function rect({ x, y, w, h }: ScreenBox): Box {
  return { left: x, right: x + w, top: y, bottom: y + h }
}

// Count a fabric pixel once, including overlapping rows, by sweeping the
// rectangle boundaries and merging the occupied intervals on each strip.
function fabricArea(boxes: readonly Box[], clip: Box) {
  const inside = boxes.filter(b => coveredArea(b, clip) > 0).map(b => ({
    left: Math.max(b.left, clip.left), right: Math.min(b.right, clip.right),
    top: Math.max(b.top, clip.top), bottom: Math.min(b.bottom, clip.bottom),
  }))
  const xs = [...new Set(inside.flatMap(b => [b.left, b.right]))].sort((a, b) => a - b)
  let area = 0
  for (let i = 1; i < xs.length; i++) {
    const intervals = inside.filter(b => b.left < xs[i] && b.right > xs[i - 1]).sort((a, b) => a.top - b.top)
    let y = clip.top, height = 0
    for (const b of intervals) {
      height += Math.max(0, b.bottom - Math.max(b.top, y))
      y = Math.max(y, b.bottom)
    }
    area += height * (xs[i] - xs[i - 1])
  }
  return area
}

it.each(ids)('%s keeps its own fabric visible and its height stable through the day', id => {
  const loadedPlace = loaded.get(id)!
  const at = (time: '12:00' | '21:00') => {
    const input = worldInput(loadedPlace, `2026-11-17T${time}`)
    return buildWorld({ ...input, forecast: { ...input.forecast, elevation: elevations.get(id)! } })
  }
  const world = at('12:00')
  const view = world.place3
  if (view.kind !== 'outside') throw new Error(`Missing outside view for ${id}`)
  const { dot } = view
  const { height, notes, datum } = world.labels
  const clear = sceneClearance(world.labels, dot, BOX.width)
  const placed = outsideShape(world, BOX, clear).items
  const own = placed.filter((item): item is Extract<OutsideItem, { kind: 'box' }> => item.kind === 'box' && !item.beyond)
  const expected = view.skyline.boxes.filter(b => !hits(clear.filter(zone => !zone.overFabric),
    b.x - b.w / 2, b.top, b.x + b.w / 2, b.foot))
  const geometry = ({ x, w, top, foot }: Pick<(typeof expected)[number], 'x' | 'w' | 'top' | 'foot'>) => [x, w, top, foot].join()
  expect(own.map(geometry).sort()).toEqual(expected.map(geometry).sort())

  const line = (datum?.segments ?? []).map(seg => ({ left: seg.x1, right: seg.x2, top: datum!.y - 1, bottom: datum!.y + 1 }))
  const oldMarks = world.marks.filter(mark => mark.plane !== 'far').map(markBox)
  const noteZones = noteBoxes(notes)
  const oldObstacles = [...oldMarks, ...line, ...noteZones]
  const newObstacles = [...portraitLabelObstacles(view, dot, BOX.width), ...world.marks.map(markBox), ...line, ...noteZones]
  const old = () => headHeightSpot(dot, height.text, BOX.width, oldObstacles)
  const next = () => besideDot(dot, height.text, BOX.width, newObstacles)
  const before = old()
  expect(next()).toMatchObject({ x: height.x, y: height.y, leader: height.leader })

  // Use the wall and roof envelope in both styles. Shadows are outside the fabric.
  const fabric = own.map(b => {
    const eave = b.roof === 'tile' ? .5 : 0
    return { left: b.x - b.w / 2 - eave, right: b.x + b.w / 2 + eave,
      top: b.top - (b.roof === 'tile' ? 3 : b.heater ? 1 : 0), bottom: b.foot }
  })
  const area = fabricArea(fabric, { left: 0, right: BOX.width, top: 0, bottom: BOX.landHeight })
  const badge = rect(heightLabelBox(height, BOX.width))
  const previous = rect(heightLabelBox({ ...height, ...before }, BOX.width))
  const share = (clip: Box) => area === 0 ? 0 : fabricArea(fabric, clip) / area
  const dx = Math.max(badge.left - dot.x, dot.x - badge.right, 0)
  const dy = Math.max(badge.top - dot.y, dot.y - badge.bottom, 0)
  const distance = Math.hypot(dx, dy) - DOT_R
  const side = badge.bottom <= dot.y ? 'above' : badge.top >= dot.y ? 'below' : height.x < dot.x ? 'left' : 'right'
  // Alternate order to reduce systematic warm-up bias; report timings without a pass/fail threshold.
  const samples: [number[], number[]] = [[], []]
  for (let round = 0; round < 7; round++) {
    for (const index of round % 2 === 0 ? [0, 1] : [1, 0]) {
      const run = [old, next][index]
      const start = performance.now()
      run()
      samples[index].push(performance.now() - start)
    }
  }
  const medianMs = samples.map(times => times.sort((a, b) => a - b)[Math.floor(times.length / 2)])
  console.log(JSON.stringify({ place: id, side, distance, before: share(previous), after: share(badge), medianMs }))

  expect(share(badge)).toBeLessThanOrEqual(loadedPlace.place.settlementType === 'city' ? share(previous) + 1e-9 : .01)
  expect(badge.left).toBeGreaterThanOrEqual(2 - 1e-9)
  expect(badge.right).toBeLessThanOrEqual(BOX.width - 2 + 1e-9)
  expect(badge.top).toBeGreaterThanOrEqual(2 - 1e-9)
  expect(badge.bottom).toBeLessThanOrEqual(VISIBLE_BOTTOM - 2 + 1e-9)
  expect(distance).toBeGreaterThanOrEqual(2 - 1e-9)
  expect(distance).toBeLessThanOrEqual(34 + 1e-9)
  expect(Boolean(height.leader)).toBe(distance > 12)
  expect(at('21:00').labels.height).toEqual(height)
}, 120_000)
