import { beforeAll, expect, it } from 'vitest'
import { addMinutes } from '../../domain/minutes'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import type { WorldState } from '../../world/types'
import { makeWorldBuilder } from '../../world/world'
import { scrubMinuteAt } from '../react/useLifeClock'
import { trackAt } from './anim'
import { sceneModel, skyLayers } from './index'
import {
  cruiseInterpolation, culledAtStart, distance, driftInterpolation, frontChange, legacyCull, localScale, pose, trailContinuity, visible,
} from './lifeContinuityMetrics'
import { skyGeom } from './sky'
import type { LifeClock, Pt, SceneBox } from './types'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 1 }
const IDS = ['haifa', 'tel-aviv', 'shadmot-mehola']
const START = '2026-11-17T05:00', LATE_S = 0.387, FRAME_S = 1 / 30
let places: Map<string, LoadedPlace>
beforeAll(async () => {
  stubPublicFetch()
  places = await loadPlaces(SCENE_PLACES.filter((p) => IDS.includes(p.id)))
}, 120_000)

const peak = () => ({ px: 0, scalePct: 0, framePx: 0, count: 0 })
const kindOf = (key: string) => key.startsWith('birds.') ? 'birds' : key.startsWith('aircraft.low.') ? 'low' : 'high'
function movingLayers(world: WorldState, clock: LifeClock, layers = skyLayers(world, BOX, clock)) {
  return new Map(layers
    .filter((l) => l.kind === 'birds' || l.kind === 'aircraft' || l.kind === 'contrail').map((l) => [l.id, l]))
}

function frameStep(before: Pt, old: Pt, next: Pt, context: string) {
  expect(distance(old, next), context).toBeLessThanOrEqual(1)
  const motion = distance(before, old)
  // A late rebuild occurs between samples in both views. Allow floating point rounding only.
  expect(distance(before, next), context).toBeLessThanOrEqual(motion + 1e-8)
  return motion
}

it.each(IDS)('%s hands off moving layers at a nonzero offset inside the next minute', (id) => {
  const build = makeWorldBuilder(), input = worldInput(places.get(id)!, START, START)
  const worst = { birds: peak(), low: peak(), high: peak(), trailHead: peak() }
  const depth = { pairs: 0, changes: 0, visibleChanges: 0, extentPx: 0, alpha: 0 }
  const entrances = { birds: 0, low: 0, high: 0, maxAheadS: 0, legacyMisses: 0, legacyInsidePx: 0 }
  const scale = { samples: 0, errorPct: 0, minPxKm: Infinity, maxPxKm: 0, truthMin: Infinity, truthMax: 0 }
  const trailWorst = { px: 0, pairs: 0, tipSeamPx: 0, driftInterpolationPx: 0, youngW: 0, youngA: 0, oldW: 0, oldA: 0,
    youngFrameW: 0, youngFrameA: 0, oldFrameW: 0, oldFrameA: 0 }
  let cruiseMidpointPx = 0
  const startWorld = build(input), startClock = { laidAt: 137, sinceS: 37 }
  // The full model stitches these same moving layers into its land and sky surfaces.
  let before = movingLayers(startWorld, startClock, sceneModel(startWorld, BOX, null, startClock).layers)
  for (let minute = 1; minute <= 16 * 60; minute++) {
    const at = addMinutes(START, minute), next = build({ ...input, selected: at }), geom = skyGeom(next, BOX)
    const boundary = 100 + minute * 60, phase = boundary + LATE_S
    const after = movingLayers(next, { laidAt: phase, sinceS: LATE_S })
    for (const [key, b] of after) {
      const a = before.get(key), kind = kindOf(key), context = `${id} ${at} ${key}`
      if (b.kind === 'contrail') {
        if (a?.kind !== 'contrail') continue
        const w = trailContinuity(a, b, phase, geom)
        trailWorst.px = Math.max(trailWorst.px, w.px)
        trailWorst.pairs += w.count
        trailWorst.youngW = Math.max(trailWorst.youngW, w.young.width); trailWorst.youngA = Math.max(trailWorst.youngA, w.young.alpha)
        trailWorst.oldW = Math.max(trailWorst.oldW, w.old.width); trailWorst.oldA = Math.max(trailWorst.oldA, w.old.alpha)
        trailWorst.youngFrameW = Math.max(trailWorst.youngFrameW, w.young.frameWidth); trailWorst.youngFrameA = Math.max(trailWorst.youngFrameA, w.young.frameAlpha)
        trailWorst.oldFrameW = Math.max(trailWorst.oldFrameW, w.old.frameWidth); trailWorst.oldFrameA = Math.max(trailWorst.oldFrameA, w.old.frameAlpha)
        const oldHead = a.trail.head, newHead = b.trail.head
        if (!oldHead || !newHead) continue
        const head = (track: typeof oldHead, p: number): Pt => { const { x, y } = trackAt(track, p)!; return [x, y] }
        const old = head(oldHead, phase), fresh = head(newHead, phase)
        if (!visible(fresh, geom)) continue
        const aircraft = after.get(key.replace('contrail.', 'aircraft.high.'))
        if (aircraft) {
          const seam = distance(pose(aircraft, phase).point, fresh)
          expect(seam, context).toBeLessThanOrEqual(1)
          trailWorst.tipSeamPx = Math.max(trailWorst.tipSeamPx, seam)
        }
        worst.trailHead.framePx = Math.max(worst.trailHead.framePx, frameStep(head(oldHead, phase - FRAME_S), old, fresh, context))
        worst.trailHead.px = Math.max(worst.trailHead.px, distance(old, fresh))
        worst.trailHead.count++
        continue
      }
      const entry = !key.endsWith('.front') && culledAtStart(b, boundary, geom, BOX)
      if (entry) {
        entrances[kind]++; entrances.maxAheadS = Math.max(entrances.maxAheadS, 60 - entry.time)
        if (legacyCull(b, entry.first, geom)) {
          entrances.legacyMisses++
          const [x] = entry.first.point, [nextX] = pose(b, boundary + 60).point
          if (x < 0 || x > geom.width) entrances.legacyInsidePx = Math.max(entrances.legacyInsidePx, Math.min(nextX, geom.width - nextX))
        }
      }
      if (!a) continue
      expect(a.surface, context).toBe(b.surface)
      const old = pose(a, phase), fresh = pose(b, phase)
      const jump = distance(old.point, fresh.point), size = 100 * Math.abs(old.scale / fresh.scale - 1)
      const motion = frameStep(pose(a, phase - FRAME_S).point, old.point, fresh.point, context)
      expect(size, context).toBeLessThanOrEqual(2)
      worst[kind].px = Math.max(worst[kind].px, jump)
      worst[kind].scalePct = Math.max(worst[kind].scalePct, size)
      worst[kind].framePx = Math.max(worst[kind].framePx, motion)
      worst[kind].count++
      if (kind === 'high' || key.endsWith('.front')) continue
      depth.pairs++
      if (before.get(key + '.front')?.z === after.get(key + '.front')?.z) continue
      depth.changes++
      const extent = frontChange(a, b, geom, next, phase, BOX)
      if (extent > 0) { depth.visibleChanges++; depth.extentPx = Math.max(depth.extentPx, extent); depth.alpha = Math.max(depth.alpha, fresh.alpha) }
    }
    for (const plane of next.life.aircraft.high) {
      const aircraft = after.get(`aircraft.high.${plane.id}`)
      if (aircraft) cruiseMidpointPx = Math.max(cruiseMidpointPx, cruiseInterpolation(aircraft, plane, geom, boundary))
      const layer = after.get(`contrail.${plane.id}`)
      if (layer?.kind !== 'contrail') continue
      trailWorst.driftInterpolationPx = Math.max(trailWorst.driftInterpolationPx, driftInterpolation(layer, plane, next, geom, boundary))
      const value = plane.plane && localScale(layer, plane, next, geom, boundary)
      if (!value) continue
      scale.samples++
      scale.errorPct = Math.max(scale.errorPct, 100 * Math.abs(value.actual / value.expected - 1))
      scale.minPxKm = Math.min(scale.minPxKm, value.actual); scale.maxPxKm = Math.max(scale.maxPxKm, value.actual)
      scale.truthMin = Math.min(scale.truthMin, value.expected); scale.truthMax = Math.max(scale.truthMax, value.expected)
    }
    before = after
  }
  console.log(id, JSON.stringify({ worst, scale, trailWorst, depth, entrances, cruiseMidpointPx }))
  expect(scale.samples).toBeGreaterThan(0)
  expect(scale.errorPct).toBeLessThanOrEqual(5)
  expect(trailWorst.pairs).toBeGreaterThan(0)
  expect(worst.birds.count).toBeGreaterThan(0)
  expect(worst.high.count + worst.low.count).toBeGreaterThan(0)
})

it('advances a selected minute for 65 real minutes, keeping the shown environment and matching the live path samples', () => {
  const build = makeWorldBuilder(), selected = '2026-11-17T09:00'
  const input = worldInput(places.get('tel-aviv')!, selected, selected)
  const first = build(input), start = 100, phase = start + 65 * 60 + LATE_S
  const clock = scrubMinuteAt(start, phase), at = addMinutes(selected, clock.offsetMinutes)
  const advanced = build({ ...input, lifeOffsetMinutes: clock.offsetMinutes })
  const expected = build({ ...input, selected: at })
  expect(advanced.at).toBe(selected)
  for (const field of ['bodies', 'light', 'clouds'] as const) expect(advanced[field]).toEqual(first[field])
  expect(advanced.life.birds).toEqual(expected.life.birds)
  expect(advanced.life.aircraft.low).toEqual(expected.life.aircraft.low)
  expect(advanced.life.aircraft.high).toEqual(expected.life.aircraft.high)
  const fullModel = sceneModel(advanced, BOX, null, clock)
  const movers = [...movingLayers(advanced, clock, fullModel.layers).values()].filter((l) => l.kind === 'aircraft' || l.kind === 'birds')
  const motions = movers.map((layer) => distance(pose(layer, phase).point, pose(layer, phase + 1).point))
  console.log('scrub motion after 65 real minutes (CSS px/s)', Math.max(...motions))
  expect(Math.max(...motions)).toBeGreaterThan(0.01)
})
