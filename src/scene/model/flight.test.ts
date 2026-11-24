import { beforeAll, describe, expect, it } from 'vitest'
import { RAY_DISTANCES } from '../../data/terrain/panorama'
import { xOf } from '../../domain/camera'
import { addMinutes } from '../../domain/time'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { BELOW_SEA_PLACES, SCENE_PLACES } from '../../test/scenePlaces'
import { CLEARANCE_M, FINAL_KM, FLIGHT } from '../../world/flightPaths'
import { curveDrop, flightTerrain } from '../../world/flightTerrain'
import { makeWorldBuilder } from '../../world/world'
import type { WorldState } from '../../world/types'
import { sceneModel } from './index'
import { birdLayers } from './birds'
import { inFrontOf, landTopOf, lowPlaneLayers } from './life'
import { skyGeom } from './sky'
import type { LayerDesc, SceneBox } from './types'

/*
 * Where birds and planes fly (the owner's report of 2026-11-20: "pay attention to where they fly, so that they don't
 * suddenly fly into the mountain"). At every harness place (the 8 base places and the places below sea level), every minute of a
 * day, through one world builder as the app's scrub:
 * - every flock keeps its kind's least clearance over the ground under it;
 * - a flock nearer than the land drawn at its x, with no ground truly in its line of sight, is never hidden;
 * - whatever is hidden (a flock or an airport movement) is hidden by land nearer than it: the ground truly in its line of
 *   sight (checked here on the panorama's own profiles, apart from the world's sight lines), or land drawn nearer than it;
 * - the airport traffic clears the ground: by `CLEARANCE_M` before its final, and on the final (and the climb-out) never
 *   under its glide's share of its height.
 */

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 1 }
const PLACES = [...SCENE_PLACES, ...BELOW_SEA_PLACES]
const DAY = '2026-11-17'
/** Doubt (m) between the world's sight lines (heights between the rays) and the panorama's own (angles between them). */
const SLACK_M = 5

let places: Map<string, LoadedPlace>
beforeAll(async () => {
  stubPublicFetch()
  places = await loadPlaces(PLACES)
}, 180_000)

/**
 * Whether the ground stands over the line of sight from the eye to a point (km east, north; m over the eye) by more than
 * `slackM`, on the panorama's own profile inside the view (`groundAt`) or the local grid outside it (`heightNear`).
 */
function groundInSight(loaded: LoadedPlace, world: WorldState, at: { e: number; n: number; up: number }, slackM: number): boolean {
  const { terrain } = loaded
  const km = Math.hypot(at.e, at.n)
  const x = xOf((Math.atan2(at.e, at.n) * 180) / Math.PI, world.camera)
  const slope = (at.up - curveDrop(km)) / km
  if (terrain.groundAt && x >= 0 && x <= 375) {
    for (const d of RAY_DISTANCES) {
      if (d >= km - 0.03) break
      const h = terrain.groundAt(x, d)
      if (h !== null && h - curveDrop(d) > slope * d + slackM) return true
    }
    return false
  }
  if (!terrain.heightNear || terrain.eyeM === undefined || km < 0.05) return false
  const ue = at.e / km, un = at.n / km
  for (let d = 0.25; d < Math.min(km - 0.03, 5.9); d += 0.125) {
    const h = terrain.heightNear(ue * d, un * d)
    if (h !== null && h - terrain.eyeM - curveDrop(d) > slope * d + slackM) return true
  }
  return false
}

interface Laid { id: string; hidden: boolean; x: number }

/** The flocks and airport movements as laid at a minute: hidden is its whole sprite under the land's top, no copy in front. */
function laid(world: WorldState, land: LayerDesc[]): Laid[] {
  const geom = skyGeom(world, BOX)
  const top = landTopOf(world, BOX, geom, land)
  const layers: LayerDesc[] = [...birdLayers(world, BOX, geom), ...lowPlaneLayers(world, BOX, geom)]
  return layers.filter((l) => l.surface === 'sky' && l.placed && l.placed.alpha > 0.05).map((l) => {
    const { x, y, scale } = l.placed!
    const left = x + l.bounds.x * scale, right = x + (l.bounds.x + l.bounds.w) * scale, upper = y + l.bounds.y * scale
    const front = layers.some((f) => f.id === `${l.id}.front`)
    return { id: l.id, hidden: !front && upper > Math.min(top(left), top(x), top(right)) - 1, x }
  })
}

describe('flight over the real land', () => {
  it.each(PLACES.map((p) => p.id))('%s: clearance, depth and the airport traffic, every minute of a day', (id) => {
    const loaded = places.get(id)!
    const build = makeWorldBuilder()
    const input = worldInput(loaded, `${DAY}T00:00`, `${DAY}T00:00`)
    const field = flightTerrain(loaded.terrain, input.forecast.elevation)
    const land = sceneModel(build(input), BOX).layers.filter((l) => l.surface === 'land')
    let flocks = 0, hidden = 0, inFront = 0, movements = 0
    for (let m = 0; m < 24 * 60; m++) {
      const at = addMinutes(`${DAY}T00:00`, m)
      const world = build({ ...input, selected: at })
      const geom = skyGeom(world, BOX)
      for (const b of world.life.birds) {
        const ground = field.heightAt(b.at!.e, b.at!.n)
        if (ground === null) continue
        flocks++
        expect(b.at!.up + field.eyeM - ground, `${id} ${b.id} at ${at}: its clearance`).toBeGreaterThanOrEqual(FLIGHT[b.kind].agl[0])
      }
      for (const p of world.life.aircraft.low) {
        const ground = field.heightAt(p.at.e, p.at.n)
        if (ground === null) continue
        movements++
        const clear = p.at.up + field.eyeM - ground
        const final = FINAL_KM[p.light ? 'light' : 'jet']
        if (p.kind === 'arrive' && p.fieldKm > final + 0.5) expect(clear, `${id} ${p.id} at ${at}: before its final`).toBeGreaterThanOrEqual(CLEARANCE_M - 50)
        else expect(clear, `${id} ${p.id} at ${at}: on its final or climb`).toBeGreaterThanOrEqual(Math.min(CLEARANCE_M, 0.4 * p.overFieldM) - 10)
      }
      for (const l of laid(world, land)) {
        const flock = world.life.birds.find((b) => `birds.${b.id}` === l.id)
        const plane = world.life.aircraft.low.find((p) => `aircraft.low.${p.id}` === l.id)
        const point = flock ? flock.at! : plane ? plane.at : null
        if (!point) continue
        const km = flock ? flock.distanceM / 1000 : Math.hypot(point.e, point.n, point.up / 1000)
        const nearer = inFrontOf(world, geom, l.x, km)
        if (l.hidden) {
          hidden++
          // Hidden only by land nearer than it: the ground in its line of sight, or the land drawn nearer than it there.
          expect(groundInSight(loaded, world, point, -SLACK_M) || !nearer, `${id} ${l.id} at ${at}: hidden in the open`).toBe(true)
        }
        if (flock && nearer && !groundInSight(loaded, world, point, -SLACK_M)) {
          inFront++
          expect(l.hidden, `${id} ${l.id} at ${at}: nearer than the land, hidden by it`).toBe(false)
        }
      }
    }
    expect(flocks + movements).toBeGreaterThan(0)
    console.log(`${id}: ${flocks} flock-minutes, ${movements} movement-minutes, ${hidden} hidden, ${inFront} nearer than the land`)
  }, 180_000)
})
