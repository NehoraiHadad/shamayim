import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { HOUSE_TOP_M } from '../../data/city/outsideView'
import { STOREY_M } from '../../data/city/skylineHeight'
import { SCENE_PLACES, SKYLINE_STUDY_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import type { OutsideView, WorldState } from '../../world/types'
import { buildWorld } from '../../world/world'
import { sceneModel } from '.'
import { receiverMaterial } from './buildingMaterial'
import { outsideShape } from './outsideShape'
import type { LayerOf, SceneBox } from './types'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const NOON = '2026-11-17T12:00'
let loaded: Map<string, LoadedPlace>
const worlds = new Map<string, WorldState>()

beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces([...SCENE_PLACES, ...SKYLINE_STUDY_PLACES].filter((p) => ['tel-aviv', 'haifa', 'jerusalem'].includes(p.id)))
}, 120_000)
afterAll(() => { vi.unstubAllGlobals() })

function worldAt(id: string) {
  let world = worlds.get(id)
  if (!world) worlds.set(id, world = buildWorld(worldInput(loaded.get(id)!, NOON)))
  return world
}
const viewOf = (id: string) => worldAt(id).place3 as OutsideView
const layerOf = (world: WorldState) => sceneModel(world, BOX).layers.find((l) => l.kind === 'outside') as LayerOf<'outside'> | undefined

describe('mapped town frontage and roof heights', () => {
  it.each([['tel-aviv', 26], ['haifa', 10], ['jerusalem', 9]] as const)('%s keeps the base tower count', (id, count) => {
    const seeds = viewOf(id).skyline.towers.map(t => t.seed)
    expect(seeds).toHaveLength(count)
    expect(new Set(seeds).size).toBe(count)
  })

  // As many as stand in view: leaving the narrow ones out would not put the rest in proportion.
  it.each([['haifa', 480], ['tel-aviv', 170], ['jerusalem', 435]] as const)('%s keeps ordinary blocks in proportion', (id, count) => {
    const blocks = viewOf(id).skyline.boxes.filter(b => b.seed !== undefined &&
      b.heightM !== undefined && b.heightM >= HOUSE_TOP_M && b.heightM < 60)
    const ratios = blocks.map(b => (b.foot - b.top) / b.w).sort((a, b) => a - b)
    expect(ratios.length).toBeGreaterThanOrEqual(count)
    expect(ratios[Math.floor(ratios.length / 2)]).toBeLessThanOrEqual(1.6)
  })

  it.each([
    ['a block of 5 storeys', 5, 0, [5 * STOREY_M + 1]],
    ['a block beside one tall stack', 5, 60, [5 * STOREY_M + 1]],
    ['a house of 3 storeys', 3, 0, [STOREY_M + 1.5, 2 * STOREY_M + 1.5]],
    ['a house beside one tall stack', 0, 60, [STOREY_M + 1.5, 2 * STOREY_M + 1.5]],
  ])('gives a sparse square its typical roof: %s', (_, levels, p90, roofs) => {
    const fixture = loaded.get('haifa')!
    const city = { ...fixture.city!, towers: [], raster: { at: () => ({ built: 2 / 15, levels, p90 }) } }
    const world = buildWorld(worldInput({ ...fixture, city }, NOON))
    const boxes = (world.place3 as OutsideView).skyline.boxes.filter(b => b.seed !== undefined)
    expect(boxes.length).toBeGreaterThan(50)
    expect(new Set(boxes.map(b => b.heightM))).toEqual(new Set(roofs))
  })

  it('gives a sparse square its houses where a mapped tower stands, which is drawn as itself', () => {
    const fixture = loaded.get('haifa')!
    const boxesWith = (towers: NonNullable<typeof fixture.city>['towers'], levels = 15) => {
      const raster = { at: () => ({ built: 2 / 15, levels, p90: 60 }) }
      const world = buildWorld(worldInput({ ...fixture, city: { ...fixture.city!, towers, raster } }, NOON))
      return (world.place3 as OutsideView).skyline.boxes.filter(b => b.seed !== undefined)
    }
    expect(boxesWith([]).every(b => b.heightM! >= HOUSE_TOP_M)).toBe(true)
    expect(boxesWith(fixture.city!.towers).some(b => b.heightM! < HOUSE_TOP_M)).toBe(true)
    // A lower typical building is another one beside the tower.
    expect(boxesWith(fixture.city!.towers, 5).every(b => b.heightM! >= HOUSE_TOP_M)).toBe(true)
  })

  it('draws a block\'s wall apart from its roof: the tallest stand in every plaster', () => {
    const fixture = loaded.get('haifa')!
    const city = { ...fixture.city!, towers: [], raster: { at: () => ({ built: .5, levels: 5, p90: 60 }) } }
    const layer = layerOf(buildWorld(worldInput({ ...fixture, city }, NOON)))!
    const tall = layer.items.flatMap(i => i.kind === 'box' && !i.beyond && i.storeys >= 17 ? [receiverMaterial(i.receiver).stone] : [])
    expect(tall.length).toBeGreaterThan(20)
    expect(new Set(tall).size).toBeGreaterThanOrEqual(5)
  })

  it('still gives dense squares without height data their raster default roof', () => {
    const fixture = loaded.get('haifa')!
    const city = { ...fixture.city!, raster: { at: () => ({ built: .2, levels: 0, p90: 0 }) } }
    const world = buildWorld(worldInput({ ...fixture, city }, NOON))
    expect((world.place3 as OutsideView).skyline.boxes.some(b => b.heightM === 10)).toBe(true)
  })

  it('keeps the mapped industrial stack in the Haifa scene', () => {
    expect(layerOf(worldAt('haifa'))?.items.some(i =>
      (i.kind === 'tower' && i.industrial) || (i.kind === 'mark' && i.glyph.kind === 'chimney'))).toBe(true)
  })

  it('keeps the clear side of a wide body alongside text', () => {
    const world = worldAt('haifa')
    const view = viewOf('haifa')
    const body = view.skyline.boxes.find(b => b.seed !== undefined && b.heightM! >= HOUSE_TOP_M)!
    const clear = [{ x: body.x + .35 * body.w, y: body.top, w: body.w, h: body.foot - body.top }]
    const shape = outsideShape({ ...world, place3: { ...view, skyline: { ...view.skyline, boxes: [body], towers: [] } } }, BOX, clear)
    const item = shape.items.find(i => i.kind === 'box' && !i.beyond)
    expect(item?.kind === 'box' && item.w).toBeCloseTo(.8 * body.w)
    expect(item?.kind === 'box' && item.x).toBeCloseTo(body.x - .1 * body.w)
  })
})
