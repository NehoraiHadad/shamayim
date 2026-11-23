import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { buildingFaces } from '../scene/model/buildingLight'
import { illustratedTonesAt } from '../scene/model/illustratedTones'
import { linearLuminance, srgbRgbToLinear } from '../scene/model/landRadiance'
import { hazeAt } from '../scene/model/landVeil'
import { TEXEL } from '../scene/model/planeBands'
import { outsideLayer } from '../scene/model/outside'
import { outsideShape } from '../scene/model/outsideShape'
import { planeLayer } from '../scene/model/planes'
import { receiverKm } from '../scene/model/receiverKm'
import { mixRgb } from '../scene/model/tone'
import type { OutsideLandDesc, SceneBox } from '../scene/model/types'
import { preparePlaneTexels, samplePlaneTexel, shadeTexelSrgb } from '../scene/paint/shared/land/planeTexel'
import { STYLES } from '../scene/paint/styles'
import { halfDepthLightOf } from '../world/halfDepthLight'
import { SCENE_H, SCENE_W } from '../world/sceneBox'
import { groundAt } from '../world/sceneLight'
import type { RGB, WorldState } from '../world/types'
import { makeWorldBuilder } from '../world/world'
import { DATUM_PLACES, SCENE_PLACES } from './scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput } from './sceneWorld'

const places = [...SCENE_PLACES, ...DATUM_PLACES].filter(({ id }) =>
  !['ramon-crater', 'tiberias', 'jericho', 'kalya'].includes(id))
const box: SceneBox = { width: SCENE_W, skyHeight: 428, landTop: 300, landHeight: SCENE_H, dpr: 1 }
const hands = Object.values(STYLES)
const cases = [
  ['fog', '2026-11-17T07:00'],
  ['dust', '2026-11-17T12:00'],
  ['day', '2026-11-17T15:30'],
  ['late day', '2026-11-17T16:30'],
] as const
let loaded: Awaited<ReturnType<typeof loadPlaces>>
beforeAll(async () => { stubPublicFetch(); loaded = await loadPlaces(places) }, 120_000)
afterAll(() => vi.unstubAllGlobals())

const percentile = (values: number[], p: number) => values.sort((a, b) => a - b)[Math.ceil(values.length * p) - 1]
const labL = (rgb: RGB) => {
  const y = linearLuminance(srgbRgbToLinear(rgb))
  return y > (6 / 29) ** 3 ? 116 * Math.cbrt(y) - 16 : (29 / 3) ** 3 * y
}

function groundSampler(world: WorldState) {
  const layer = planeLayer(world, box, 'near', world.terrain.near, [])!
  const texels = preparePlaneTexels(layer.outline, layer.bounds, layer.surfaceTone, layer.light.litField,
    layer.grain.seed, layer.grain.amount)
  return (x: number, y: number) => {
    const sample = samplePlaneTexel(texels, Math.min(texels.wPx - 1, Math.floor(x / TEXEL)), x, y)
    return { haze: sample.haze, rgb: shadeTexelSrgb(texels, sample) }
  }
}

function overlayColor(land: OutsideLandDesc, x: number): RGB {
  const left = land.top[0][0], right = land.top.at(-1)![0]
  const t = (x - left) / Math.max(1, right - left)
  const hi = land.stops.findIndex(([at]) => at >= t)
  if (hi <= 0) return land.stops.at(hi)?.[1] ?? land.tone
  const [a, from] = land.stops[hi - 1], [b, to] = land.stops[hi]
  return mixRgb(from, to, (t - a) / Math.max(1e-6, b - a))
}

function visibleFeet(world: WorldState) {
  const shape = outsideShape(world, box, [])
  const ground = groundSampler(world)
  const kmAt = receiverKm(world, box)
  const layers = hands.map(style => outsideLayer(world, box, [], style.light)!)
  const overlay = world.place3.kind === 'outside' ? world.place3.land : null
  return shape.items.flatMap(item => {
    if (item.kind !== 'box' || item.beyond || item.x < 0 || item.x >= SCENE_W || item.foot > SCENE_H) return []
    const { x, foot } = item
    const overlaid = overlay && x >= overlay.top[0][0] && x <= overlay.top.at(-1)![0] &&
      foot >= groundAt(overlay.top, x) && foot <= groundAt(overlay.base, x)
    if (!overlaid && foot < groundAt(world.terrain.near.points, x)) return []
    const land = layers[0].land
    const painted = overlaid && land ? { haze: hazeAt(world, overlay.km), rgb: overlayColor(land, x) } : ground(x, foot)
    return [{ item, painted, layers, km: shape.wallKms[item.tier], groundKm: kmAt(x, foot) }]
  })
}

describe.each(places)('portrait veil in $id', place => {
  it.each(cases)('matches the painted ground at visible feet in %s', (label, at) => {
    const input = worldInput(loaded.get(place.id)!, at)
    const fixture = makeWorldBuilder()({ ...input, forced: label === 'dust'
      ? { pm10: 430, opticalPm10: 430, dustConcentration: 430, visibilityKm: 30 }
      : label === 'fog' ? { visibilityKm: 2, humidity: 100 } : null })
    if (label === 'dust') expect(fixture.air.dustWeight).toBeGreaterThan(.9)
    const world = label === 'fog' ? { ...fixture, air: { ...fixture.air, mist: { ...fixture.air.mist, fog: 1 } } } : fixture
    expect(world.place3.kind).toBe('outside')
    const feet = visibleFeet(world)
    expect(feet.length).toBeGreaterThan(0)
    const physical = feet.map(({ painted, km }) => Math.abs(hazeAt(world, km) - painted.haze))
    const illustratedWorld = { ...world, light: halfDepthLightOf(world.light) }
    const shape = outsideShape(world, box, [])
    for (const { layers, item, km } of feet) {
      expect(layers[1].tiers[item.tier].wall).toEqual(illustratedTonesAt(illustratedWorld, km, hazeAt(world, km)).wall)
      const { detail, tile } = shape.receivers[item.tier].get(item.receiver)!
      expect(layers[0].receivers[item.tier][item.receiver].front.wall)
        .toEqual(buildingFaces(world, km, item.receiver, tile, false, detail).front.wall)
    }
    expect(percentile(physical, .9)).toBeLessThanOrEqual(.15)

    const ground = groundSampler(world)
    let step = 0
    for (let x = 0; x + 3 < SCENE_W; x += 3) {
      const top = Math.max(groundAt(world.terrain.near.points, x), groundAt(world.terrain.near.points, x + 3))
      for (let y = top; y + 3 <= SCENE_H; y += 3) {
        const h = ground(x, y).haze
        step = Math.max(step, Math.abs(h - ground(x + 3, y).haze), Math.abs(h - ground(x, y + 3).haze))
      }
    }
    expect(step).toBeLessThanOrEqual(.12)
  }, 30_000)
})

describe.each(['haifa', 'jerusalem'])('wall–ground twilight contrast in %s', id => {
  it('keeps the median contrast within 1 L* of sharing the foot distance in both hands', () => {
    const build = makeWorldBuilder()
    const angles: number[] = []
    for (const time of ['04:40', '05:05', '05:30', '05:55', '06:20', '06:45', '07:10', '07:35', '08:00'] as const) {
      const world = build(worldInput(loaded.get(id)!, `2026-11-17T${time}`))
      angles.push(world.bodies.sun.altitude)
      const illustrated = { ...world, light: halfDepthLightOf(world.light) }
      const feet = visibleFeet(world).filter(({ groundKm }) => Number.isFinite(groundKm))
      expect(feet.length).toBeGreaterThan(0)
      for (const hand of [0, 1]) {
        const contrast = feet.map(({ item, painted, layers }) => labL(hand
          ? layers[hand].tiers[item.tier].wall : layers[hand].receivers[item.tier][item.receiver].front.wall) - labL(painted.rgb))
        const shared = feet.map(({ item, groundKm, painted }) => labL(hand
          ? illustratedTonesAt(illustrated, groundKm, hazeAt(world, groundKm)).wall
          : buildingFaces(world, groundKm, item.receiver, item.roof === 'tile').front.wall) - labL(painted.rgb))
        expect(Math.abs(percentile(contrast, .5) - percentile(shared, .5)), time).toBeLessThanOrEqual(1)
      }
    }
    expect(Math.min(...angles)).toBeLessThanOrEqual(-18)
    expect(Math.max(...angles)).toBeGreaterThanOrEqual(15)
  }, 30_000)
})
