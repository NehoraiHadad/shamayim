import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { DATUM_PLACES, SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput } from '../../test/sceneWorld'
import { groundAt } from '../../world/sceneLight'
import { halfDepthLightOf } from '../../world/halfDepthLight'
import { SCENE_H, SCENE_W } from '../../world/sceneBox'
import type { WorldState } from '../../world/types'
import { makeWorldBuilder } from '../../world/world'
import { ALBEDO_CHROMA_BOOST, albedoLinear, linearLuminance, shadeLinearRgb, srgbRgbToLinear } from './landRadiance'
import { hazeAt, illustratedHazeAt } from './landVeil'
import { faceAtY } from './faceProjection'
import { buildingFaces } from './buildingLight'
import { illustratedTonesAt } from './illustratedTones'
import { planeSurfaceOf } from './landColour'
import { outsideLayer } from './outside'
import { outsideShape } from './outsideShape'
import { fieldSample, samplePlaneField } from './planeField'
import { planeLight } from './planeLight'
import { DRAWN_LIGHT } from '../paint/drawn/light/index'

const places = [...SCENE_PLACES, ...DATUM_PLACES].filter(({ id }) =>
  !['ramon-crater', 'tiberias', 'jericho', 'kalya'].includes(id))
const box = { width: SCENE_W, skyHeight: 428, landTop: 300, landHeight: SCENE_H, dpr: 1 }
const cases = [
  ['fog', '2026-11-17T07:00', 2],
  ['dust', '2026-11-17T12:00', 3],
  ['15:30', '2026-11-17T15:30', 0],
  ['16:30', '2026-11-17T16:30', 0],
] as const
let loaded: Awaited<ReturnType<typeof loadPlaces>>
beforeAll(async () => { stubPublicFetch(); loaded = await loadPlaces(places) }, 120_000)
afterAll(() => vi.unstubAllGlobals())

const percentile = (values: number[], p: number) => values.sort((a, b) => a - b)[Math.ceil(values.length * p) - 1]
const luminance = (rgb: Parameters<typeof srgbRgbToLinear>[0]) => linearLuminance(srgbRgbToLinear(rgb))
// CIE 1976 L*, relative to the display white.
const labL = (y: number) => y > (6 / 29) ** 3 ? 116 * Math.cbrt(y) - 16 : (29 / 3) ** 3 * y

function nearReceiver(world: WorldState) {
  const field = planeLight(world, box, 'near', world.terrain.near).litField
  const { palette } = planeSurfaceOf(world, 'near', world.terrain.near)
  const out = fieldSample()
  return (x: number, y: number, color = true) => {
    const top = groundAt(world.terrain.near.points, x)
    const u = x / SCENE_W, v = Math.max(0, Math.min(1, (y - top) / Math.max(1, SCENE_H - top)))
    samplePlaneField(field, u, v, out)
    if (!color) return { haze: out.haze, l: 0 }
    const index = Math.round(u * (palette.cols - 1)) + Math.round(v * (palette.rows - 1)) * palette.cols
    const rho = albedoLinear(palette.palette[palette.cells[index]], ALBEDO_CHROMA_BOOST)
    const ground = shadeLinearRgb(rho, field.eSun, field.eMoon, field.eSky,
      out.sVis, out.mVis, out.vSky, field.yHorizon, out.haze, field.hazeLin)
    return { haze: out.haze, l: labL(linearLuminance(ground)) }
  }
}

describe.each(places)('portrait veil in $id', place => {
  it('samples both town receivers and ground directly under their visible feet', () => {
    const build = makeWorldBuilder()
    const results = []
    for (const [label, at, visibilityKm] of cases) {
      const fixture = build(worldInput(loaded.get(place.id)!, at))
      expect(fixture.place3.kind).toBe('outside')
      if (fixture.place3.kind !== 'outside') continue
      // Koschmieder visibility is the distance to 2% residual contrast.
      const world = visibilityKm ? { ...fixture, air: { ...fixture.air, visibilityKm,
        fade: (km: number) => 1 - .02 ** (Math.max(0, km) / visibilityKm),
        mist: { ...fixture.air.mist, fog: Number(label === 'fog') },
      } } as WorldState : fixture
      const shape = outsideShape(world, box, [])
      const real = outsideLayer(world, box, [])
      const drawn = outsideLayer(world, box, [], DRAWN_LIGHT)
      const illustratedWorld = { ...world, light: halfDepthLightOf(world.light) }
      let receiverMismatches = 0
      for (const [tier, ids] of shape.receivers.entries()) {
        const km = shape.wallKms[tier]
        for (const [id, { detail, tile }] of ids) {
          const actual = real?.receivers[tier]?.[id].front.wall
          const expected = buildingFaces(world, km, id, tile, false, detail).front.wall
          if (!actual || expected.some((value, i) => value !== actual[i])) receiverMismatches++
        }
        const actual = drawn?.tiers[tier]?.wall
        if (!actual || illustratedTonesAt(illustratedWorld, km).wall.some((value, i) => value !== actual[i])) receiverMismatches++
      }
      const groundAtFoot = nearReceiver(world)
      const veil = (x: number, y: number) => groundAtFoot(x, y, false).haze
      const realError: number[] = [], drawnError: number[] = [], realContrast: number[] = [], drawnContrast: number[] = []
      let outsidePlane = 0, overlaid = 0
      for (const item of shape.items) {
        if (item.kind !== 'box' || item.beyond) continue
        if (item.x < 0 || item.x > SCENE_W || item.foot > SCENE_H ||
          item.foot < groundAt(world.terrain.near.points, item.x)) {
          outsidePlane++
          continue
        }
        const overlay = real?.land
        if (overlay && item.x >= overlay.top[0][0] && item.x <= overlay.top.at(-1)![0] &&
          item.foot >= groundAt(overlay.top, item.x) && item.foot <= groundAt(overlay.base, item.x)) {
          overlaid++
          continue
        }
        const ground = groundAtFoot(item.x, item.foot)
        realError.push(Math.abs(hazeAt(world, shape.wallKms[item.tier]) - ground.haze))
        drawnError.push(Math.abs(illustratedHazeAt(world, shape.wallKms[item.tier]) - ground.haze))
        const face = real?.receivers[item.tier]?.[item.receiver]
        const tint = drawn?.tiers[item.tier]
        if (face) realContrast.push(labL(luminance(face.front.wall)) - ground.l)
        if (tint) drawnContrast.push(labL(luminance(tint.wall)) - ground.l)
      }
      expect(realError.length).toBeGreaterThan(0)
      let stepAcross = 0, stepDown = 0
      for (let x = 0; x + 3 <= SCENE_W; x += 3) {
        const top = Math.max(groundAt(world.terrain.near.points, x), groundAt(world.terrain.near.points, x + 3))
        for (let y = top; y <= SCENE_H; y += 3) {
          const here = veil(x, y)
          stepAcross = Math.max(stepAcross, Math.abs(here - veil(x + 3, y)))
          if (y + 3 <= SCENE_H) stepDown = Math.max(stepDown, Math.abs(here - veil(x, y + 3)))
        }
      }
      results.push({ label, real: percentile(realError, .9), drawn: percentile(drawnError, .9),
        stepAcross, stepDown, feet: realError.length, outsidePlane, overlaid, receiverMismatches, sun: world.bodies.sun.altitude,
        realDeltaL: percentile(realContrast, .5), drawnDeltaL: percentile(drawnContrast, .5) })
    }
    const world = build(worldInput(loaded.get(place.id)!, cases[2][1]))
    const plane = world.terrain.near, columns = world.terrain.faces.near.columns
    const empty = columns.filter(({ points }) => !points.length).length
    const feet = columns.map(({ x, crest }) => faceAtY(world, 'near', plane, x, crest, SCENE_H, SCENE_H).km)
    const maxFootStep = Math.max(...feet.slice(1).map((km, i) => Math.max(km / feet[i], feet[i] / km)))
    console.log(JSON.stringify({ place: place.id, results, columns: columns.length, empty, maxFootStep }))
    expect(columns.length).toBeGreaterThan(0)
    expect(empty).toBe(0)
    expect(maxFootStep).toBeLessThan(1.3)
    for (const result of results) {
      expect(result.real, result.label).toBeLessThanOrEqual(.15)
      expect(result.drawn, result.label).toBeLessThanOrEqual(.15)
      expect(Math.max(result.stepAcross, result.stepDown), result.label).toBeLessThanOrEqual(.12)
      expect(result.receiverMismatches, result.label).toBe(0)
    }
  }, 30_000)
})
