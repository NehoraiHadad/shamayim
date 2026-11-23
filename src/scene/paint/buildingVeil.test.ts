import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import type { AirInput } from '../../atmo/airTypes'
import type { LocalTime } from '../../domain/types'
import { DATUM_PLACES, SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput } from '../../test/sceneWorld'
import { groundAt } from '../../world/sceneLight'
import type { WorldState } from '../../world/types'
import { buildWorld } from '../../world/world'
import { buildingFaces } from '../model/buildingLight'
import { buildingRowVeil } from '../model/buildingRowVeil'
import { illustratedTonesAt } from '../model/illustratedTones'
import { HAZE_SLOPE, hazeAt } from '../model/landVeil'
import { outsideLayer } from '../model/outside'
import { outsideShape } from '../model/outsideShape'
import { TEXEL } from '../model/planeBands'
import { fieldSample, vegetationField } from '../model/planeField'
import { planeLayers } from '../model/planes'
import { PLAIN_LIGHT } from '../model/styleLight'
import type { LayerOf, SceneBox } from '../model/types'
import { wallAir } from '../model/wallDistance'
import { halfDepthLightOf } from '../../world/halfDepthLight'
import { STYLES } from './styles'

const BOX: SceneBox = { width: 375, landTop: 300, landHeight: 128, skyHeight: 428, dpr: 2 }
const CLEAR = { cloudCover: 0, weatherCode: 0, humidity: 35, visibilityKm: 30, pm10: 0, precipitation: 0 }
// The app still harness's fog and dust inputs.
const FOG = { humidity: 99, visibilityKm: 1.5, cloudCover: 60, precipitation: 0, weatherCode: 45, windSpeed: 6, windGusts: 10 }
const DUST = { pm10: 400, visibilityKm: 3 }
const places = ['jerusalem', 'haifa', 'tel-aviv', 'beit-shean', 'shadmot-mehola']
let loaded: Awaited<ReturnType<typeof loadPlaces>>
beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces([...SCENE_PLACES, ...DATUM_PLACES].filter(place => places.includes(place.id)))
})
afterAll(() => vi.unstubAllGlobals())

const worldAt = (id: string, minute: LocalTime, forced: Partial<AirInput>) =>
  buildWorld({ ...worldInput(loaded.get(id)!, minute), forced })
const p90 = (values: number[]) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * .9) - 1]

function footHaze(world: WorldState, near: LayerOf<'plane'>) {
  const town = world.place3.kind === 'outside' ? world.place3.land : null
  const read = vegetationField(near.light.litField, near.outline, near.bounds)
  const out = fieldSample()
  return (x: number, y: number) => {
    if (town && x >= town.top[0][0] && x <= town.top.at(-1)![0] &&
        y >= groundAt(town.top, x) && y <= groundAt(town.base, x)) return hazeAt(world, town.km)
    read(x, y, out)
    return out.haze
  }
}

it.each([['2026-11-17T07:00', FOG], ['2026-11-17T15:00', DUST]] as const)(
  'matches the far-right Jerusalem rows to the painted ground at %s',
  (minute, forced) => {
    const world = worldAt('jerusalem', minute, forced)
    const planes = planeLayers(world, BOX)
    const sample = footHaze(world, planes.find(plane => plane.plane === 'near')!)
    const shape = outsideShape(world, BOX, [])
    const corrected = buildingRowVeil(world, BOX, shape, planes)!
    const physical = outsideLayer(world, BOX, [], PLAIN_LIGHT, planes)!
    const hand = Object.values(STYLES).find(style => style.light.outside)!.light
    const illustrated = outsideLayer(world, BOX, [], hand, planes)!
    const litWorld = { ...world, light: halfDepthLightOf(world.light) }
    const legacy = wallAir(world, shape.groundKm)
    const before: number[] = [], after: number[] = []
    for (const [index, item] of shape.items.entries()) {
      // The still's x 510–640, y 815–850 at DPR 2, translated into land coordinates.
      if (item.kind !== 'box' || item.beyond || item.x < 255 || item.x > 320 || item.foot < 107.5 || item.foot > 125) continue
      const wall = physical.items[index]
      if (wall.kind !== 'box') throw new Error('Wall order changed')
      const km = shape.wallKms[item.tier], prior = hazeAt(world, legacy(km))
      const share = corrected.shares[wall.tier]
      const ground = sample(item.x, item.foot)
      before.push(Math.abs(prior - ground))
      after.push(Math.abs((share ?? prior) - ground))
      if (share === undefined) continue
      expect(share).toBeLessThanOrEqual(ground)
      const { tile, detail } = corrected.shape.receivers[wall.tier].get(wall.receiver)!
      expect(physical.receivers[wall.tier][wall.receiver]).toEqual(
        buildingFaces(world, km, wall.receiver, tile, false, detail, PLAIN_LIGHT, share))
      expect(illustrated.tiers[wall.tier]).toEqual(illustratedTonesAt(litWorld, shape.kms[item.tier], share))
    }
    expect(before.length).toBeGreaterThan(0)
    expect(p90(before)).toBeGreaterThan(.15)
    expect(p90(after)).toBeLessThanOrEqual(.15)
  },
)

it.each(places.slice(1))('keeps the baseline tiers and eases adjoining corrected rows in %s at clear noon', id => {
  const world = worldAt(id, '2026-11-17T12:00', CLEAR)
  const shape = outsideShape(world, BOX, [])
  const kms = [...shape.kms], wallKms = [...shape.wallKms]
  const correction = buildingRowVeil(world, BOX, shape, planeLayers(world, BOX))
  expect(shape.kms).toEqual(kms)
  expect(shape.wallKms).toEqual(wallKms)
  if (!correction) return
  expect(correction.shape.kms.slice(0, kms.length)).toEqual(kms)
  expect(correction.shape.wallKms.slice(0, wallKms.length)).toEqual(wallKms)
  const rows = new Map<string, number>()
  for (const [i, item] of correction.shape.items.entries()) {
    if (item.kind !== 'box' || item.beyond) {
      expect(item).toBe(shape.items[i])
      continue
    }
    const share = correction.shares[item.tier]
    if (share === undefined) continue
    const column = Math.floor(item.x / (.1 / HAZE_SLOPE)), row = Math.floor(item.foot / TEXEL)
    const key = `${column}:${row}`
    expect(share).toBe(rows.get(key) ?? share)
    rows.set(key, share)
    for (const next of [row - 1, row + 1]) {
      const neighbour = rows.get(`${column}:${next}`)
      if (neighbour !== undefined) expect(Math.abs(share - neighbour)).toBeLessThanOrEqual(.1)
    }
  }
})

it('keys a change in the sampled terrain veil in both hands without resizing the outside form', () => {
  const world = worldAt('jerusalem', '2026-11-17T15:00', DUST)
  const planes = planeLayers(world, BOX)
  const withVeil = (byte: number) => planes.map(plane => {
    const field = plane.light.litField
    const grid = field.grid.slice()
    for (let i = 3; i < grid.length; i += 4) grid[i] = byte
    return { ...plane, light: { ...plane.light, litField: { ...field, grid } } }
  })
  const clear = withVeil(32), hazy = withVeil(192)
  for (const { light } of Object.values(STYLES)) {
    const before = outsideLayer(world, BOX, [], light, clear)!
    const after = outsideLayer(world, BOX, [], light, hazy)!
    expect(before.key).toBe(after.key)
    expect(before.bounds).toEqual(after.bounds)
    expect(before.light!.key).not.toBe(after.light!.key)
    expect(before.land).toEqual(after.land)
  }
})
