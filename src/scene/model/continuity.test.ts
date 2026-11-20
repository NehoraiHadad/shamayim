import { beforeAll, describe, expect, it } from 'vitest'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { addMinutes } from '../../domain/time'
import type { LocalTime } from '../../domain/types'
import { makeWorldBuilder } from '../../world/world'
import type { WorldState } from '../../world/types'
import { sceneModel } from './index'
import { inFrontOf, landTopOf } from './life'
import { skyGeom } from './sky'
import type { LayerDesc, SceneBox } from './types'

/*
 * The owner's report of 2026-11-20: life popped in and out as the hour was scrubbed. The rule: the sky's life is a process
 * in time, so a scrub moves each object a bounded way per minute, and nothing appears or vanishes in the open sky inside
 * the frame: only beyond its edge, far off (faded into the haze, shrunk), behind the land, or on the runway.
 */

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 1 }

let places: Map<string, LoadedPlace>
beforeAll(async () => {
  stubPublicFetch()
  places = await loadPlaces(SCENE_PLACES.filter((p) => ['tel-aviv', 'haifa', 'jerusalem'].includes(p.id)))
}, 120_000)

interface Seen { x: number; y: number; scale: number; alpha: number; edge: number; hidden: boolean; kind: LayerDesc['kind'] }

/** The objects of the sky's life drawn at a minute, by their event's id: where, how big, how faint, hidden or not. */
function lifeAt(world: WorldState): Map<string, Seen> {
  const model = sceneModel(world, BOX)
  const geom = skyGeom(world, BOX)
  const top = landTopOf(world, BOX, geom, model.layers.filter((l) => l.surface === 'land'))
  const out = new Map<string, Seen>()
  for (const l of model.layers) {
    if (l.surface !== 'sky' || !l.placed || (l.kind !== 'birds' && l.kind !== 'aircraft')) continue
    const { x, y, scale, alpha } = l.placed
    const left = x + l.bounds.x * scale, right = x + (l.bounds.x + l.bounds.w) * scale
    const bottom = y + (l.bounds.y + l.bounds.h) * scale, upper = y + l.bounds.y * scale
    // How far inside the frame its nearest part is (px): small at an edge.
    const edge = Math.min(right, geom.width - left)
    const km = l.kind === 'birds' ? world.life.birds.find((b) => `birds.${b.id}` === l.id)!.distanceM / 1000 : Infinity
    // Behind the land (its whole sprite under the drawn land's top, and farther than it), it is hidden by that land.
    const hidden = upper > Math.min(top(left), top(x), top(right)) - 1 && !model.layers.some((f) => f.id === `${l.id}.front`)
      && (l.kind !== 'birds' || !inFrontOf(world, geom, x, km))
    out.set(l.id, { x, y: bottom, scale, alpha, edge, hidden, kind: l.kind })
  }
  return out
}

/** A scrub: every minute between `from` and `to`, through one world builder (as the app's). */
function scrub(id: string, from: LocalTime, minutes: number) {
  const build = makeWorldBuilder()
  // One forecast object for the whole scrub, as the app holds it.
  const input = worldInput(places.get(id)!, from, from)
  return Array.from({ length: minutes + 1 }, (_, m) => lifeAt(build({ ...input, selected: addMinutes(from, m) })))
}

/** Arrived (or gone) unseen: faint, at the frame's edge, or hidden by the land. */
const unseen = (s: Seen) => s.alpha <= 0.2 || s.scale <= 0.25 || s.edge <= 60 || s.hidden

describe('the sky\'s life is continuous in time', () => {
  it.each(['tel-aviv', 'haifa', 'jerusalem'])('%s: a scrub minute by minute moves each object a bounded way; none pops in or out in the open sky', (id) => {
    const frames = [...scrub(id, '2026-11-17T06:00', 360), ...scrub(id, '2026-11-17T12:00', 300)]
    let moved = 0, came = 0
    for (let i = 1; i < frames.length; i++) {
      if (i === 361) continue
      const a = frames[i - 1], b = frames[i]
      for (const [key, now] of b) {
        const was = a.get(key)
        if (!was) {
          came++
          expect(unseen(now), `${id} ${key} appears at minute ${i}: ${JSON.stringify(now)}`).toBe(true)
          continue
        }
        moved++
        // A minute moves a bird by tens of px at most; an airliner or a jet climbing out near the place by its true angular speed.
        const bound = now.kind === 'birds' ? 45 : 200
        expect(Math.hypot(now.x - was.x, now.y - was.y), `${id} ${key} at minute ${i}`).toBeLessThan(bound)
        expect(Math.abs(now.scale - was.scale), key).toBeLessThan(0.25)
        // Fading by distance and the ground's haze: a bird slowly, a jet as fast as it climbs away (km a minute).
        expect(Math.abs(now.alpha - was.alpha), key).toBeLessThan(now.kind === 'birds' ? 0.3 : 0.5)
      }
      for (const [key, was] of a) if (!b.has(key)) expect(unseen(was), `${id} ${key} vanishes at minute ${i}: ${JSON.stringify(was)}`).toBe(true)
    }
    expect(moved).toBeGreaterThan(50)
    expect(came).toBeGreaterThan(2)
  }, 120_000)

  it('shows the same sky at a moment however it is reached (a jump of hours or a minute\'s step)', () => {
    const p = places.get('haifa')!
    const build = makeWorldBuilder()
    build(worldInput(p, '2026-11-17T06:00', '2026-11-17T06:00'))
    const jumped = build(worldInput(p, '2026-11-17T06:00', '2026-11-17T14:37'))
    const fresh = makeWorldBuilder()(worldInput(p, '2026-11-17T06:00', '2026-11-17T14:37'))
    expect(jumped.life).toEqual(fresh.life)
  })
})
