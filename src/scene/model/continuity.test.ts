import { beforeAll, describe, expect, it } from 'vitest'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { addMinutes } from '../../domain/time'
import type { LocalTime } from '../../domain/types'
import { GROUP } from '../../world/lifeSchedule'
import { makeWorldBuilder } from '../../world/world'
import type { WorldState } from '../../world/types'
import { periodDelta, trackAt } from './anim'
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
const RAD = Math.PI / 180

let places: Map<string, LoadedPlace>
beforeAll(async () => {
  stubPublicFetch()
  places = await loadPlaces(SCENE_PLACES.filter((p) => ['tel-aviv', 'haifa', 'jerusalem'].includes(p.id)))
}, 120_000)

interface Pose { x: number; y: number; scale: number; alpha: number; edge: number; hidden: boolean }
interface Seen extends Pose { kind: LayerDesc['kind']; period: number; bound: number; scaleBound: number; alphaBound: number; end: Pose }

/** The objects of the sky's life drawn at a minute, by their event's id: where, how big, how faint, hidden or not. */
function lifeAt(world: WorldState): Map<string, Seen> {
  const model = sceneModel(world, BOX)
  const geom = skyGeom(world, BOX)
  const top = landTopOf(world, BOX, geom, model.layers.filter((l) => l.surface === 'land'))
  const out = new Map<string, Seen>()
  for (const l of model.layers) {
    if (l.surface !== 'sky' || !l.placed || (l.kind !== 'birds' && l.kind !== 'aircraft')) continue
    const flock = l.kind === 'birds' ? world.life.birds.find((b) => `birds.${b.id}` === l.id)! : null
    const km = flock ? flock.distanceM / 1000 : Infinity
    const poseAt = (phase: number): Pose => {
      const t = trackAt(l.animated?.flight, phase)!
      const x = l.placed!.x + t.x, y = l.placed!.y + t.y
      const scale = l.placed!.scale * t.scale, alpha = l.placed!.alpha * t.alpha
      const left = x + l.bounds.x * scale, right = x + (l.bounds.x + l.bounds.w) * scale
      const bottom = y + (l.bounds.y + l.bounds.h) * scale, upper = y + l.bounds.y * scale
      // How far inside the frame its nearest part is (px): small at an edge.
      const edge = Math.min(right, geom.width - left)
      // Behind the land (its whole sprite under the drawn land's top, and farther than it), it is hidden by that land.
      const hidden = upper > Math.min(top(left), top(x), top(right)) - 1 && !model.layers.some((f) => f.id === `${l.id}.front`)
        && (l.kind !== 'birds' || !inFrontOf(world, geom, x, km))
      return { x, y: bottom, scale, alpha, edge, hidden }
    }
    // A minute moves a flock within its pass's angular sweep (+12 px for the strip's loops), scale and fade within a 60 s step.
    const stepM = flock ? 60 * flock.speedMs : 0
    const bound = flock
      ? Math.min(geom.width, 1.1 * ((2 * Math.atan((30 * flock.speedMs) / flock.nearM)) / RAD) * world.camera.pxPerDeg * geom.s) + 12
      : 200
    const scaleBound = flock ? Math.min(1, (stepM / (flock.nearM + stepM)) * 1.1 + 0.05) : 1
    const reachM = flock ? flock.nearM * GROUP[flock.kind].reach : 0
    const u = flock ? Math.min(1, stepM / (0.45 * reachM)) : 0
    const alphaBound = flock ? Math.min(1, 1.5 * u - 0.5 * u ** 3 + 0.1) : 0.5
    out.set(l.id, { ...poseAt(0), kind: l.kind, period: geom.azimuthRange.period, bound, scaleBound, alphaBound, end: poseAt(60) })
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
const unseen = (s: Pose) => s.alpha <= 0.2 || s.scale <= 0.25 || s.edge <= 60 || s.hidden

describe('the sky\'s life is continuous in time', () => {
  it.each(['tel-aviv', 'haifa', 'jerusalem'])('%s: a scrub minute by minute moves each object a bounded way; none pops in or out in the open sky', (id) => {
    const frames = [...scrub(id, '2026-11-17T06:00', 360), ...scrub(id, '2026-11-17T12:00', 300)]
    let moved = 0, came = 0, maxBirdOpacityStep = 0
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
        // A minute moves a bird within its pass's angular sweep; an airliner or a jet climbing out near the place by its true angular speed.
        expect(Math.hypot(periodDelta(now.x - was.x, now.period), now.y - was.y), `${id} ${key} at minute ${i}`).toBeLessThanOrEqual(now.bound)
        // Flocks stay within their 60 s perspective scale and fade-ramp change; lifeContinuity checks rebuild continuity at the same instant.
        if (now.kind === 'birds') {
          expect(Math.abs(now.scale - was.scale), key).toBeLessThanOrEqual(now.scaleBound)
          const step = Math.abs(now.alpha - was.end.alpha)
          maxBirdOpacityStep = Math.max(maxBirdOpacityStep, step)
          expect(step, `${id} ${key} opacity step at minute ${i}`).toBeLessThanOrEqual(0.05)
        }
        expect(Math.abs(now.alpha - was.alpha), key).toBeLessThanOrEqual(now.alphaBound)
      }
      for (const [key, was] of a) if (!b.has(key)) expect(unseen(was.end), `${id} ${key} vanishes at minute ${i}: ${JSON.stringify(was.end)}`).toBe(true)
    }
    console.log(id, 'max bird opacity step (phase 60 → phase 0)', maxBirdOpacityStep.toFixed(6))
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
