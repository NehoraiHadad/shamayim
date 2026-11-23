import { STOREY_M } from '../../data/city/skylineHeight'
import { HOUSE_TOP_M } from '../../data/city/outsideView'
import { hashId, seeded } from '../../data/landmarks/hash'
import { outsideItemKm } from '../../world/outsideDepth'
import { hits } from '../../world/sceneClearance'
import { SCENE_W } from '../../world/sceneBox'
import type { OutsideView, WorldState } from '../../world/types'
import { receiversUsed } from './buildingUsage'
import { receiverId } from './buildingMaterial'
import { landBehind } from './landBehind'
import { massAt, type DrawnMass } from './markOcclusion'
import { homeRoofline, type NeighbourBlock } from './neighbourPlacement'
import { neighbourhood } from './outsideNeighbourhood'
import { outsideMarks } from './outsideMarks'
import { boundsOf, clearBody, towerItem } from './outsideBody'
import type { Box, OutsideItem, SceneBox } from './types'
import { townGroundKm, wallStep } from './wallDistance'

/** The haze of the place's rows is quantised to this many km (a scrub reuses the tones of a step). */
export const KM_STEP = .5

interface Shape {
  key: string
  items: OutsideItem[]
  mass: DrawnMass[]
  home: ReturnType<typeof homeRoofline>
  bounds: ReturnType<typeof boundsOf>
  /** The km of each tier the items refer to (their tones are the hour's). */
  kms: number[]
  /** Each tier's distance for its walls (a step of their own; the land's cap for what is beyond), and the town's ground. */
  wallKms: number[]
  groundKm: number
  receivers: Map<number, { detail: boolean; tile: boolean }>[]
  heaters: Set<number>
  /** The marks among the items: where they sit in `items`, and the world mark (its tones are the hour's). */
  marks: { at: number; km: number }[]
}

/** Surviving outside shapes cached by view, width and text zones, independently of the shown hour. */
const shapes = new WeakMap<object, Map<string, Shape>>()

export function outsideShape(world: WorldState, box: SceneBox, clear: readonly Box[]): Shape {
  const view = world.place3 as OutsideView
  let byKey = shapes.get(view)
  if (!byKey) shapes.set(view, byKey = new Map())
  const key = `${box.width}|${JSON.stringify([clear, world.labels.height.backed && world.labels.height, world.keys.marks])}`
  const cached = byKey.get(key)
  if (cached) return cached
  const sx = box.width / SCENE_W
  const kms: number[] = [], wallKms: number[] = []
  const index = new Map<string, number>()
  const behind = landBehind(world)
  const tier = (km: number, x: number, foot: number, own = false) => {
    const q = Math.round(Math.min(km, behind(x, foot)) / KM_STEP) * KM_STEP
    const wall = own ? wallStep(Math.min(km, view.land?.km ?? Infinity)) : q
    const key = `${q}:${wall}`
    let i = index.get(key)
    if (i === undefined) { i = kms.length; index.set(key, i); kms.push(q); wallKms.push(wall) }
    return i
  }
  const { frame, skyline, baseKm } = view
  const out: OutsideItem[] = []
  const free = (left: number, top: number, right: number, bottom: number) => !hits(clear, left, top, right, bottom)
  // The towers beyond the place: at their true distance, far first, behind the place.
  // C9: with the towns beyond at their feet, far first (a nearer block hides a farther tower's foot).
  const beyond = [...view.beyond.map((t) => ({ km: t.km, tower: t, block: null })),
    ...(view.beyondTowns ?? []).map((b) => ({ km: b.km, tower: null, block: b }))].sort((a, b) => b.km - a.km)
  const mass: DrawnMass[] = []
  const drawnBlocks = new Map<string, NeighbourBlock>()
  for (const { tower: t, block: b } of beyond) {
    if (t) {
      const x = t.x * sx
      if (!free(x - t.w / 2, t.baseY - t.h, x + t.w / 2, t.baseY)) continue
      mass.push(massAt(x, t.w, t.baseY - t.h, t.km))
      out.push(towerItem(t, sx, tier(t.km, t.x, t.baseY)))
    } else if (b) {
      const x = b.x * sx, w = b.w * sx
      if (!free(x - w / 2, b.baseY - b.h, x + w / 2, b.baseY)) continue
      const blockTier = tier(b.km, b.x, b.baseY)
      drawnBlocks.set(b.id, { id: b.id, x, w, top: b.baseY - b.h, foot: b.baseY, hazeKm: kms[blockTier] })
      mass.push(massAt(x, w, b.baseY - b.h, b.km, b.id))
      out.push({ kind: 'box', x, w, top: b.baseY - b.h, foot: b.baseY, tier: blockTier, seed: b.seed,
        storeys: Math.max(1, Math.round((b.heightM - 1) / STOREY_M)), folded: false, roof: null, heater: false, beyond: true, receiver: receiverId(b.seed) })
    }
  }
  // The place: its mass, its spires and full towers, its trees, its own marks, back to front by where they stand.
  const own: { y: number; item: OutsideItem; km?: number }[] = []
  const stacks = skyline.towers.filter(t => t.industrial && free(t.x * sx - t.w / 2, t.baseY - t.h, t.x * sx + t.w / 2, t.baseY))
    .map(t => ({ x: t.x * sx - t.w / 2, y: t.baseY - t.h, w: t.w, h: t.h, base: t.baseY,
      km: outsideItemKm(frame, baseKm, t) }))
  for (const b of skyline.boxes) {
    const km = outsideItemKm(frame, baseKm, b)
    // A widened foreground body must leave the separately mapped industrial shaft readable.
    const stacksAheadOfBody = stacks.filter(stack => stack.km > km && stack.base <= b.foot)
    const zones = stacksAheadOfBody.length ? [...clear, ...stacksAheadOfBody] : clear
    const body = clearBody(zones, b.x * sx, b.w * sx, b.top, b.foot)
    if (!body) continue
    const { x, w } = body
    mass.push(massAt(x, w, b.top, km))
    const seed = b.seed ?? hashId(`${b.x.toFixed(2)}:${b.foot.toFixed(2)}`)
    const heightM = b.heightM ?? 3 * STOREY_M
    // The data's continuum: a low roof is a house (its roof by the evidence, mixed half and half), a higher one a block.
    const r = seeded(seed + 7)
    const roof = heightM >= HOUSE_TOP_M ? null : view.roofs === 'mixed' ? (r() < .5 ? 'tile' : 'flat') : view.roofs
    own.push({ y: b.foot - .001 * b.near, item: { kind: 'box', x, w, top: b.top, foot: b.foot, tier: tier(outsideItemKm(frame, baseKm, b), x / sx, b.foot, true),
      seed, receiver: receiverId(seed),
      storeys: Math.max(1, Math.round((heightM - 1) / STOREY_M)), folded: (b.heightM ?? 0) > 60, roof,
      heater: roof === 'flat' && r() < .45 } })
  }
  for (const t of skyline.towers) {
    const body = t.industrial
      ? (free(t.x * sx - t.w / 2, t.baseY - t.h, t.x * sx + t.w / 2, t.baseY) ? { x: t.x * sx, w: t.w } : null)
      : clearBody(clear, t.x * sx, t.w, t.baseY - t.h, t.baseY)
    if (!body) continue
    mass.push(massAt(body.x, body.w, t.baseY - t.h, outsideItemKm(frame, baseKm, t)))
    own.push({ y: t.baseY, item: towerItem({ ...t, x: body.x / sx, w: body.w }, sx, tier(outsideItemKm(frame, baseKm, t), body.x / sx, t.baseY, true)) })
  }
  for (const t of view.trees) {
    const x = t.x * sx
    if (!free(x - t.w, t.base - t.h, x + t.w, t.base)) continue
    own.push({ y: t.base + .002, item: { kind: 'tree', tree: { kind: t.kind, x, base: t.base, w: t.w, h: t.h, seed: t.seed }, tier: tier(t.km, t.x, t.base) } })
  }
  const localItems = own.map(o => o.item)
  neighbourhood(localItems, sx)
  const home = homeRoofline(localItems, kms)
  own.push(...outsideMarks(world, box.width, drawnBlocks, clear, behind, mass, home))
  own.sort((a, b) => a.y - b.y)
  const marks: Shape['marks'] = []
  for (const o of own) {
    if (o.km !== undefined) marks.push({ at: out.length, km: o.km })
    out.push(o.item)
  }
  const formKey = `${key}|${out.flatMap(item => item.kind === 'mark' ? [item.glyph.seed] : []).join(',')}`
  const { receivers, heaters } = receiversUsed(out, kms.length)
  const shape = { key: formKey, items: out, bounds: boundsOf(out), kms, wallKms, groundKm: townGroundKm(world, view), receivers, heaters, marks, mass, home }
  if (byKey.size > 8) byKey.clear()
  byKey.set(key, shape)
  return shape
}
