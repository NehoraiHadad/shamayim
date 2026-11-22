import { LEGIBLE_PX } from '../../world/neighbourSize'
import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import type { Place } from '../../config/place'
import { loadCity } from '../../data/city/cityData'
import type { BoundsFile } from '../../data/city/bounds'
import { loadLandCover } from '../../data/land/landData'
import { hashId } from '../../data/landmarks/hash'
import { loadIsrael } from '../../data/landmarks/israelData'
import { withPlaceHomes } from '../../data/landmarks/placeMarks'
import type { Landmark } from '../../data/landmarks/types'
import { loadLandmarkSource } from '../../data/landmarks/useLandmarks'
import { computePanorama, LOCAL_REACH_KM, LOCAL_STEP_KM } from '../../data/terrain/panorama'
import { terrainFromPanorama } from '../../data/terrain/panoramaTerrain'
import { stubPublicFetch, worldInput } from '../../test/sceneWorld'
import { beyondMarks } from '../../world/beyondMarks'
import { SCENE_H, SCENE_W } from '../../world/sceneBox'
import type { WorldInput, WorldState } from '../../world/types'
import { buildWorld } from '../../world/world'
import { sceneModel } from '.'
import { tonesAt } from './marks'
import { outsideLayer, outsideMass } from './outside'

const KARMEI: Place = { id: 'osm:way:462664109', lat: 31.6092, lon: 35.1009, nameHe: '×›×¨×ž×™ ×¦×•×¨',
  regionHe: '×”×¨×™ ×™×”×•×“×”', timezone: 'Asia/Jerusalem', usesOsm: true, settlementType: 'village' }
const HALHUL = 'il-minaret-31.58592-35.10681'
const SYNAGOGUE = 'il-synagogue-31.6097-35.10159'
/** Gazetteer rows carry no elevation or panorama for this point. Use the audit's 100 m flat datum. */
const FLAT_M = 100
const BOX = { width: SCENE_W, landHeight: SCENE_H, landTop: 0, skyHeight: 0, dpr: 2 }
const WIDTHS = [375, 1280]
let world: WorldState
let input: WorldInput
let halhul: Landmark

beforeAll(async () => {
  stubPublicFetch()
  const signal = new AbortController().signal
  const [city, cover, raw, bounds] = await Promise.all([loadCity(KARMEI, signal), loadLandCover(KARMEI, signal),
    loadIsrael(KARMEI, signal), fetch('/data/city/bounds.json').then(res => res.json() as Promise<BoundsFile>)])
  // The local raster predates the height tag. Use the production tower's 17 m evidence at the same landmark ID.
  halhul = { ...raw!.find(mark => mark.id === HALHUL)!, heightM: 17 }
  const source = await loadLandmarkSource(KARMEI, signal, {
    israel: async () => raw!.map(mark => mark.id === HALHUL ? halhul : mark), overpass: async () => [],
  })
  const pano = computePanorama(() => FLAT_M, FLAT_M)
  const n = 2 * Math.round(LOCAL_REACH_KM / LOCAL_STEP_KM) + 1
  pano.local = { n, stepKm: LOCAL_STEP_KM, heights: new Array<number>(n * n).fill(FLAT_M) }
  input = worldInput({ place: KARMEI, terrain: terrainFromPanorama(pano), city, cover, bounds, far: null,
    landmarks: withPlaceHomes(KARMEI, source.sceneMarks), seatCandidates: source.seatCandidates }, '2026-11-17T12:00')
  world = buildWorld({ ...input, forecast: { ...input.forecast, elevation: FLAT_M } })
})
afterAll(() => vi.unstubAllGlobals())

const marksOf = (given: WorldState, width: number) => sceneModel(given, { ...BOX, width }).layers
  .flatMap(layer => layer.kind === 'outside' ? layer.items.flatMap(item => item.kind === 'mark' ? [item.glyph.seed] :
    [])
    : layer.kind === 'marks' ? layer.glyphs.map(glyph => glyph.seed) : [])

it.each(WIDTHS)('keeps Shabbat Achim and drops Halhul at the Karmei Tzur production point at %i px', width => {
  expect(halhul.id).toBe(HALHUL)
  expect(marksOf(world, width)).toContain(hashId(SYNAGOGUE))
  expect(marksOf(world, width)).not.toContain(hashId(HALHUL))
})

/** The observed phone-width box spans and foot at the production point, with a flat backdrop behind the boxes. */
function measuredScene(roof: boolean, ridge = false): WorldState {
  if (world.place3.kind !== 'outside') throw new Error('Karmei Tzur has no drawn outside view')
  const view = world.place3
  const block = { id: '315_351:5:41', x: 168.2, baseY: .782 * SCENE_H, w: 8, h: 1, km: 6.46, heightM: 11, seed: 841 }
  // The 17 m tower subtends 0.151Â° at 6.46 km, i.e. 1.48 px before occlusion.
  const { seated, seatPool } = beyondMarks(KARMEI, [halhul], SCENE_W, () =>
    ({ x: block.x, base: block.baseY, hPx: 2.5, km: block.km, blockId: block.id }), view.dot, [])
  expect(seatPool.map(mark => mark.id)).toEqual([HALHUL])
  const near = { points: [[0, 110], [168, ridge ? 98 : 110], [SCENE_W, 110]] as [number, number][], distanceKm: [2, 2,
    2] }
  // The roof section at the glyph, inside the measured own span of x 156.8â€“221.2 px.
  const box = { x: 168.2, w: 20, top: .773 * SCENE_H, foot: 100, near: 0, kind: 'fabric' as const }
  return { ...world, terrain: { ...world.terrain, near, far: near, back: undefined }, marks: [...world.marks,
    ...seated], seatPool,
    place3: { ...view, baseKm: 3.85, land: null, beyond: [], beyondTowns: [block], skyline: { ...view.skyline, towers:
      [], boxes: roof ? [box] : [] } } }
}

it.each(WIDTHS)('tests a legible synthetic tower foot against the observed foreground at %i px', width => {
  expect(marksOf(measuredScene(false), width)).toContain(hashId(HALHUL))
  const withRoof = measuredScene(true)
  const model = sceneModel(withRoof, { ...BOX, width })
  const roof = outsideMass(withRoof, { ...BOX, width }, model.clear).find(mass => mass.top === .773 * SCENE_H)
  expect(roof, JSON.stringify(model.clear)).toBeDefined()
  expect(roof!.km).toBeLessThan(6.46)
  expect(marksOf(withRoof, width)).not.toContain(hashId(HALHUL))
  expect(marksOf(measuredScene(false, true), width)).not.toContain(hashId(HALHUL))
})

it('uses far-town haze at true distance independently of its enlarged size', () => {
  const given = measuredScene(false)
  const layer = outsideLayer(given, BOX)!
  const block = layer.items.find(item => item.kind === 'box' && item.beyond && item.seed === 841)
  const mark = layer.items.find(item => item.kind === 'mark' && item.glyph.seed === hashId(HALHUL))
  expect(block?.kind).toBe('box')
  expect(mark?.kind).toBe('mark')
  if (block?.kind !== 'box' || mark?.kind !== 'mark') return
  expect(layer.tiers[block.tier]).toEqual(tonesAt(given, 6.5))
  const tier = Math.floor(Math.log(6.46 / 2) / Math.log(1.22))
  expect(mark.glyph.tones).toEqual(tonesAt(given, 2 * 1.22 ** tier * 1.1))
  expect(mark.glyph.factor).toBeCloseTo(LEGIBLE_PX / 2.5, 6)
})

it('keeps an outside seat over a far-city block painted beneath its layer', () => {
  const given = measuredScene(false)
  const farCities = { ...given.farCities, patches: [{ left: 167, right: 170, top: 98, bottom: 101, km: 5, built: 1,
    level: 3, area: 1 }],
    shapes: { mass: [], blocks: [{ x: 167, w: 3, base: 101, h: 3, km: 5 }], lights: [] } }
  const model = sceneModel({ ...given, farCities }, BOX)
  expect(model.layers.find(layer => layer.kind === 'farCities')?.tiers.flatMap(tier => tier.blocks)).toHaveLength(1)
  expect(marksOf({ ...given, farCities }, 375)).toContain(hashId(HALHUL))
})

it('backfills from the visible seats after the foreground hides a top-ranked glyph', () => {
  const given = measuredScene(true)
  if (given.place3.kind !== 'outside') throw new Error('Missing outside view')
  const support = given.place3.beyondTowns![0]
  const blocked = given.seatPool[0]
  const replacements = [65, 110].map((x, i) => {
    const id = `visible-${i}`
    const block = { ...support, id, x, seed: support.seed + i + 1 }
    return { mark: { ...blocked, id, x, seatBlockId: id, seatRank: blocked.seatRank - i - 1 }, block }
  })
  const world = { ...given, seatPool: [blocked, ...replacements.map(({ mark }) => mark)],
    place3: { ...given.place3, beyondTowns: [support, ...replacements.map(({ block }) => block)] } }
  const seeds = outsideLayer(world, BOX)!.items.flatMap(item => item.kind === 'mark' ? [item.glyph.seed] : [])
  expect(seeds).not.toContain(hashId(HALHUL))
  expect(seeds).toEqual(expect.arrayContaining(replacements.map(({ mark }) => hashId(mark.id))))
})

