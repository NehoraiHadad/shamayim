import { beforeAll, expect, it } from 'vitest'
import { addMinutes } from '../../domain/time'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import type { HighPlane } from '../../world/life'
import { skyDirection } from '../../world/lifeSchedule'
import type { WorldState } from '../../world/types'
import { makeWorldBuilder } from '../../world/world'
import { trackAt } from './anim'
import { contrailFrame, rotateScale } from './contrailFrame'
import { sceneModel } from './index'
import { skyGeom, type SkyGeom } from './sky'
import { gnomonic, tangentFrame, tangentScale } from './tangent'
import type { LayerDesc, LifeClock, Pt, SceneBox } from './types'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 1 }
const IDS = ['haifa', 'tel-aviv', 'shadmot-mehola']
const START = '2026-11-17T05:00'
let places: Map<string, LoadedPlace>
beforeAll(async () => {
  stubPublicFetch()
  places = await loadPlaces(SCENE_PLACES.filter((p) => IDS.includes(p.id)))
}, 120_000)

const distance = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1])
const plus = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]]
const hasPoint = (pts: Pt[], p: Pt) => pts.some((pt) => distance(pt, p) < 1e-6)
const peak = () => ({ px: 0, scalePct: 0, count: 0 })

function pose(layer: LayerDesc, phase: number, head = false) {
  const lay = layer.placed!, flight = trackAt(layer.animated!.flight, phase)!
  const grow = head ? trackAt(layer.animated!.grow!.track, phase)! : { x: 0, y: 0 }
  return { point: [lay.x + flight.x + grow.x, lay.y + flight.y + grow.y] as Pt, scale: lay.scale * flight.scale,
    turn: (lay.turn ?? 0) + flight.turn }
}

function movingLayers(world: WorldState, clock: LifeClock) {
  return new Map(sceneModel(world, BOX, null, clock).layers
    .filter((l) => l.kind === 'birds' || l.kind === 'aircraft' || l.kind === 'contrail')
    .map((l) => [l.id, l]))
}

/** Compare the same dated puffs, excluding off-raster puffs and measuring after the old raster's wind shift. */
function trailMismatch(a: LayerDesc, b: LayerDesc, old: HighPlane, next: HighPlane, world: WorldState, geom: SkyGeom, phase: number) {
  if (a.kind !== 'contrail' || b.kind !== 'contrail') return 0
  const frame = contrailFrame(world, geom, old)
  const from = pose(a, phase), to = pose(b, phase)
  const previous = new Map(old.trail.map((p) => [p.seed, p]))
  let worst = 0
  for (const p of next.trail) {
    const before = previous.get(p.seed)
    if (!before) continue
    const p0 = frame.point(before), p1 = frame.point(p)
    if (p0 && p1 && hasPoint(a.points, p0) && hasPoint(b.points, p1)) {
      const oldAt = plus(from.point, rotateScale(p0, from.turn, from.scale))
      const newAt = plus(to.point, rotateScale(p1, to.turn, to.scale))
      if (newAt[0] >= 0 && newAt[0] <= geom.width && newAt[1] >= 0 && newAt[1] <= geom.horizon) {
        worst = Math.max(worst, distance(oldAt, newAt))
      }
    }
  }
  return worst
}

/** What the old head-centred frame would show for the same plume as the frame moves with the plane. */
function recenteredMismatch(world: WorldState, old: HighPlane, next: HighPlane, geom: SkyGeom) {
  const frame = ({ e, n, up }: NonNullable<HighPlane['plane']>) => {
    const d = skyDirection(e, n, up)
    return tangentFrame(d, [geom.x(d.azimuth), geom.dome(d.altitude)], tangentScale(world, geom, d.altitude), world.camera.handed)
  }
  if (!old.plane || !next.plane) return 0
  const from = frame(old.plane), to = frame(next.plane)
  const puffs = new Map(next.trail.map((p) => [p.seed, p]))
  const project = (f: typeof from, p: NonNullable<HighPlane['plane']>) => gnomonic(f, skyDirection(p.e, p.n, p.up))
  const visible = (p: Pt | null): p is Pt => !!p && p[0] > 0 && p[0] < geom.width && p[1] > 0 && p[1] < geom.horizon
  return Math.max(0, ...old.trail.map((p) => {
    const nextPuff = puffs.get(p.seed)
    if (!nextPuff) return 0
    const before = project(from, p), after = project(to, nextPuff)
    const drifted = project(from, nextPuff)
    return visible(before) && visible(after) && drifted ? distance(drifted, after) : 0
  }))
}

it.each(IDS)('%s continues every flight at the next minute, even when it first laid 37 s late', (id) => {
  const build = makeWorldBuilder()
  const input = worldInput(places.get(id)!, START, START)
  const worst = { birds: peak(), low: peak(), high: peak(), trailHead: peak() }
  let fixedTrailPx = 0, recenteredTrailPx = 0
  let previous = build(input)
  let beforeOnTime = movingLayers(previous, { laidAt: 100, sinceS: 0 })
  // Keep worlds bounded to two minutes; reuse the app's builder and fixture forecast through the entire test.
  for (let minute = 1; minute <= 16 * 60; minute++) {
    const at = addMinutes(START, minute)
    const next = build({ ...input, selected: at })
    const geom = skyGeom(next, BOX)
    const nextPhase = 100 + minute * 60
    const after = movingLayers(next, { laidAt: nextPhase, sinceS: 0 })
    for (const sinceS of [0, 37]) {
      const laidAt = nextPhase - 60 + sinceS
      const phase = laidAt + 60 - sinceS
      const before = sinceS === 0 ? beforeOnTime : movingLayers(previous, { laidAt, sinceS })
      for (const [key, b] of after) {
        const a = before.get(key)
        if (!a) continue
        const head = b.kind === 'contrail'
        if (head && (!a.animated?.grow || !b.animated?.grow)) continue
        const kind = head ? 'trailHead' : b.kind === 'birds' ? 'birds' : key.startsWith('aircraft.low.') ? 'low' : 'high'
        const old = pose(a, phase, head), next = pose(b, phase, head)
        const px = distance(old.point, next.point), scalePct = 100 * Math.abs(old.scale / next.scale - 1)
        const prior = pose(a, phase - 1 / 30, head).point
        const priorFrame = distance(prior, old.point)
        const context = `${id} ${at} ${key} (since ${sinceS}s)`
        expect(px, context).toBeLessThanOrEqual(1)
        expect(distance(prior, next.point), context).toBeLessThanOrEqual(priorFrame + 1)
        expect(scalePct, context).toBeLessThanOrEqual(2)
        worst[kind].px = Math.max(worst[kind].px, px)
        worst[kind].scalePct = Math.max(worst[kind].scalePct, scalePct)
        worst[kind].count++
      }
      if (sinceS !== 0) continue
      for (const plane of next.life.aircraft.high) {
        const key = `contrail.${plane.id}`, a = before.get(key), b = after.get(key)
        const oldPlane = previous.life.aircraft.high.find((p) => p.id === plane.id)
        if (!a || !b || !oldPlane) continue
        fixedTrailPx = Math.max(fixedTrailPx, trailMismatch(a, b, oldPlane, plane, next, geom, phase))
        recenteredTrailPx = Math.max(recenteredTrailPx, recenteredMismatch(next, oldPlane, plane, geom))
      }
    }
    previous = next
    beforeOnTime = after
  }
  console.log(id, JSON.stringify({ worst, fixedTrailPx, recenteredTrailPx }))
  expect(worst.birds.count).toBeGreaterThan(0)
  expect(worst.high.count + worst.low.count).toBeGreaterThan(0)
}, 240_000)
