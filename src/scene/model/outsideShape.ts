import { N } from '../../data/city/tune.tmp'
import { STOREY_M } from '../../data/city/skylineHeight'
import { rowY } from '../../data/city/fabricCover'
import { HOUSE_TOP_M } from '../../data/city/outsideView'
import { hashId, seeded } from '../../data/landmarks/hash'
import { outsideBodies, roofM } from '../../world/outsideBodies'
import { SCENE_W } from '../../world/sceneBox'
import type { OutsideView, WorldState } from '../../world/types'
import { receiversUsed } from './buildingUsage'
import { COLLECTORS_TO_M, receiverId } from './buildingMaterial'
import { landBehind } from './landBehind'
import { massAt, type DrawnMass } from './markOcclusion'
import { homeRoofline, type NeighbourBlock } from './neighbourPlacement'
import { neighbourhood } from './outsideNeighbourhood'
import { outsideMarks } from './outsideMarks'
import { boundsOf, towerItem } from './outsideBody'
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

/** A block's wall is a draw of its own: its seed's first draw is its roof's height. */
const WALL_DRAW = 0x5bd1e995

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
  const out: OutsideItem[] = []
  const standing = outsideBodies(view, clear, sx)
  // The towers beyond the place: at their true distance, far first, behind the place.
  // C9: with the towns beyond at their feet, far first (a nearer block hides a farther tower's foot).
  const beyond = [...standing.beyond.map((t) => ({ km: t.km, tower: t, block: null })),
    ...standing.towns.map((b) => ({ km: b.km, tower: null, block: b }))].sort((a, b) => b.km - a.km)
  const mass: DrawnMass[] = []
  const drawnBlocks = new Map<string, NeighbourBlock>()
  for (const { tower: t, block: b } of beyond) {
    if (t) {
      mass.push(massAt(t.x * sx, t.w, t.baseY - t.h, t.km))
      out.push(towerItem(t, sx, tier(t.km, t.x, t.baseY)))
    } else if (b) {
      const x = b.x * sx, w = b.w * sx
      const blockTier = tier(b.km, b.x, b.baseY)
      drawnBlocks.set(b.id, { id: b.id, x, w, top: b.baseY - b.h, foot: b.baseY, hazeKm: kms[blockTier] })
      mass.push(massAt(x, w, b.baseY - b.h, b.km, b.id))
      out.push({ kind: 'box', x, w, top: b.baseY - b.h, foot: b.baseY, tier: blockTier, seed: b.seed,
        storeys: Math.max(1, Math.round((b.heightM - 1) / STOREY_M)), folded: false, roof: null, heater: false, beyond: true, receiver: receiverId(b.seed) })
    }
  }
  // The place: its mass, its spires and full towers, its trees, its own marks, back to front by where they stand.
  const own: { y: number; item: OutsideItem; km?: number }[] = []
  for (const { box: b, x, w, km } of standing.boxes) {
    mass.push(massAt(x, w, b.top, km))
    const heightM = roofM(b)
    const seed = b.seed ?? hashId(`${b.x.toFixed(2)}:${b.foot.toFixed(2)}`)
    // The data's continuum: a low roof is a house (its roof by the evidence, mixed half and half), a higher one a block.
    const r = seeded(seed + 7)
    const roof = heightM >= HOUSE_TOP_M ? null : view.roofs === 'mixed' ? (r() < .5 ? 'tile' : 'flat') : view.roofs
    own.push({ y: rowY(b), item: { kind: 'box', x, w, top: b.top, foot: b.foot, tier: tier(km, x / sx, b.foot, true),
      seed, receiver: receiverId(seed, false, false, roof || N('salt') < 0 ? seed : seed ^ [WALL_DRAW, 0x9e3779b9, 0x2545f491, 0x1b873593, 0x7f4a7c15, 0x6a09e667][N('salt')], !roof && heightM <= COLLECTORS_TO_M),
      storeys: Math.max(1, Math.round((heightM - 1) / STOREY_M)), folded: (b.heightM ?? 0) > 60, roof,
      heater: roof === 'flat' && r() < .45 } })
  }
  for (const { tower: t, x, w, km } of standing.towers) {
    mass.push(massAt(x, w, t.baseY - t.h, km))
    own.push({ y: t.baseY, item: towerItem({ ...t, x: x / sx, w }, sx, tier(km, x / sx, t.baseY, true)) })
  }
  for (const t of standing.trees)
    own.push({ y: t.base + .002, item: { kind: 'tree', tree: { kind: t.kind, x: t.x * sx, base: t.base, w: t.w, h: t.h, seed: t.seed }, tier: tier(t.km, t.x, t.base) } })
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
