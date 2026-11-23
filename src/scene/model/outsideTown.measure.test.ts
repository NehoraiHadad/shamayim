import { afterAll, beforeAll, it, vi } from 'vitest'
import { DATUM_PLACES, SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import type { OutsideView } from '../../world/types'
import { buildWorld } from '../../world/world'

const places = [...SCENE_PLACES.filter(p => p.id !== 'ramon-crater' && p.id !== 'tiberias'),
  ...DATUM_PLACES.filter(p => p.id === 'beit-shean' || p.id === 'neve-zohar')]
let loaded: Map<string, LoadedPlace>

beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces(places)
}, 120_000)
afterAll(() => { vi.unstubAllGlobals() })

function measure(fixture: LoadedPlace) {
  const input = worldInput(fixture, '2026-11-17T12:00')
  const start = performance.now()
  const { skyline } = buildWorld(input).place3 as OutsideView
  return { skyline, ms: performance.now() - start }
}

function oldHeightInput(fixture: LoadedPlace): LoadedPlace {
  const { city } = fixture
  const raster = city?.raster
  if (!city || !raster) return fixture
  return { ...fixture, city: { ...city, raster: { ...raster, at(lat, lon) {
    const square = raster.at(lat, lon)
    if (square.built < .2) return { ...square, levels: 0, p90: 0 }
    // The old gate used roofHeight(0, 0, u) for dense cells without height data.
    return square.levels || square.p90 ? square : { ...square, p90: 10 }
  } } } }
}

type Boxes = OutsideView['skyline']['boxes']

function countChanges(before: Boxes, after: Boxes) {
  const bySite = (boxes: Boxes) => new Map(boxes.map(box => [`${box.seed}:${box.dx}:${box.dy}`, box]))
  const old = bySite(before), current = bySite(after)
  let added = 0, removed = 0, changed = 0
  for (const key of old.keys()) if (!current.has(key)) removed++
  for (const [key, box] of current) {
    const prior = old.get(key)
    if (!prior) added++
    else if (prior.heightM !== box.heightM || prior.top !== box.top || prior.foot !== box.foot || prior.w !== box.w) changed++
  }
  return { added, removed, changed }
}

it('reports town proportions, visible box changes and world build cost', () => {
  const rows = places.map(({ id }) => {
    const fixture = loaded.get(id)!
    const { skyline } = measure(fixture) // Warm up and keep an untimed comparison sample.
    const { skyline: old } = measure(oldHeightInput(fixture))
    const ms = Array.from({ length: 5 }, () => measure(fixture).ms)
    const ratios = skyline.boxes.map(b => (b.foot - b.top) / b.w).sort((a, b) => a - b)
    const middle = Math.floor(ratios.length / 2)
    const median = ratios.length ? (ratios[middle] + ratios[Math.floor((ratios.length - 1) / 2)]) / 2 : null
    return { id, boxes: ratios.length, median, over3: ratios.filter(r => r > 3).length,
      heightBoxes: countChanges(old.boxes, skyline.boxes), towers: skyline.towers.map(t => t.seed).sort((a, b) => a - b), ms }
  })
  console.log(JSON.stringify({ town: rows }))
}, 120_000)
