import { STOREY_M } from '../../data/city/skylineHeight'
import { HOUSE_TOP_M } from '../../data/city/outsideView'
import { hashId, seeded } from '../../data/landmarks/hash'
import { outsideItemKm } from '../../world/outsideDepth'
import { hits } from '../../world/sceneClearance'
import { SCENE_W } from '../../world/sceneBox'
import type { OutsideView, WorldState } from '../../world/types'
import { landBehind } from './landBehind'
import { massAt, type DrawnMass } from './markOcclusion'
import { homeRoofline, type NeighbourBlock } from './neighbourPlacement'
import { outsideMarks } from './outsideMarks'
import type { Box, OutsideItem, SceneBox } from './types'

/** The haze of the place's rows is quantised to this many km (a scrub reuses the tones of a step). */
export const KM_STEP = .5

/** A full tower or a spire as a glyph-like item (screen px), its seed from its spot. */
function towerItem(t: { x: number; baseY: number; w: number; h: number; heightM: number; seed: number; crown: 0 | 1 | 2;
  lod: string; famous: boolean }, sx: number, tier: number): OutsideItem {
  return { kind: 'tower', x: t.x * sx, base: t.baseY, w: t.w, h: t.h, tier, seed: t.seed, crown: t.crown,
    full: t.lod === 'glyph', famous: t.famous, storeys: Math.max(1, Math.round(t.heightM / STOREY_M)) }
}

function boundsOf(items: OutsideItem[]) {
  // The layer's box: everything with the longest cast shadow either side, independent of the light (a scrub never resizes it).
  const reach = (left: number, top: number, right: number, bottom: number, height: number) => {
    const cast = Math.min(14, 2.5 * height * .6 + 1)
    return { left: left - cast - 2, top: top - 4, right: right + cast + 2, bottom: bottom + 2 }
  }
  const boxes = items.map((item) => item.kind === 'box' ? reach(item.x - item.w / 2, item.top - 2.5, item.x + item.w / 2, item.foot, item.foot - item.top)
    : item.kind === 'tree' ? reach(item.tree.x - item.tree.w, item.tree.base - item.tree.h - 1, item.tree.x + item.tree.w, item.tree.base, 0)
    : item.kind === 'tower' ? reach(item.x - item.w / 2, item.base - item.h - 4, item.x + item.w / 2, item.base, item.h)
      : reach(item.glyph.x - item.glyph.w / 2, item.glyph.base - item.glyph.h * item.glyph.scale, item.glyph.x + item.glyph.w / 2,
        item.glyph.base, item.glyph.h * item.glyph.scale))
  if (!boxes.length) return
  return { left: Math.min(...boxes.map(b => b.left)), right: Math.max(...boxes.map(b => b.right)),
    top: Math.min(...boxes.map(b => b.top)), bottom: Math.max(...boxes.map(b => b.bottom)) }
}
interface Shape {
  key: string
  items: OutsideItem[]
  mass: DrawnMass[]
  home: ReturnType<typeof homeRoofline>
  bounds: ReturnType<typeof boundsOf>
  /** The km of each tier the items refer to (their tones are the hour's). */
  kms: number[]
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
  const kms: number[] = []
  const index = new Map<number, number>()
  const behind = landBehind(world)
  const tier = (km: number, x?: number, foot?: number) => {
    const q = Math.round(Math.min(km, x === undefined ? Infinity : behind(x, foot!)) / KM_STEP) * KM_STEP
    let i = index.get(q)
    if (i === undefined) { i = kms.length; index.set(q, i); kms.push(q) }
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
        storeys: Math.max(1, Math.round((b.heightM - 1) / STOREY_M)), folded: false, roof: null, heater: false, beyond: true })
    }
  }
  // The place: its mass, its spires and full towers, its trees, its own marks, back to front by where they stand.
  const own: { y: number; item: OutsideItem; km?: number }[] = []
  for (const b of skyline.boxes) {
    const x = b.x * sx, w = b.w * sx
    if (!free(x - w / 2, b.top, x + w / 2, b.foot)) continue
    mass.push(massAt(x, w, b.top, outsideItemKm(frame, baseKm, b)))
    const seed = b.seed ?? hashId(`${b.x.toFixed(2)}:${b.foot.toFixed(2)}`)
    const heightM = b.heightM ?? 3 * STOREY_M
    // The data's continuum: a low roof is a house (its roof by the evidence, mixed half and half), a higher one a block.
    const r = seeded(seed + 7)
    const roof = heightM >= HOUSE_TOP_M ? null : view.roofs === 'mixed' ? (r() < .5 ? 'tile' : 'flat') : view.roofs
    own.push({ y: b.foot - .001 * b.near, item: { kind: 'box', x, w, top: b.top, foot: b.foot, tier: tier(outsideItemKm(frame, baseKm, b), b.x, b.foot),
      seed, storeys: Math.max(1, Math.round((heightM - 1) / STOREY_M)), folded: (b.heightM ?? 0) > 60, roof,
      heater: roof === 'flat' && r() < .45 } })
  }
  for (const t of skyline.towers) {
    const x = t.x * sx
    if (!free(x - t.w / 2, t.baseY - t.h, x + t.w / 2, t.baseY)) continue
    mass.push(massAt(x, t.w, t.baseY - t.h, outsideItemKm(frame, baseKm, t)))
    own.push({ y: t.baseY, item: towerItem(t, sx, tier(outsideItemKm(frame, baseKm, t), t.x, t.baseY)) })
  }
  for (const t of view.trees) {
    const x = t.x * sx
    if (!free(x - t.w, t.base - t.h, x + t.w, t.base)) continue
    own.push({ y: t.base + .002, item: { kind: 'tree', tree: { kind: t.kind, x, base: t.base, w: t.w, h: t.h, seed: t.seed }, tier: tier(t.km, t.x, t.base) } })
  }
  const home = homeRoofline(own.map(o => o.item), kms)
  own.push(...outsideMarks(world, box.width, drawnBlocks, clear, behind, mass, home))
  own.sort((a, b) => a.y - b.y)
  const marks: Shape['marks'] = []
  for (const o of own) {
    if (o.km !== undefined) marks.push({ at: out.length, km: o.km })
    out.push(o.item)
  }
  const formKey = `${key}|${out.flatMap(item => item.kind === 'mark' ? [item.glyph.seed] : []).join(',')}`
  const shape = { key: formKey, items: out, bounds: boundsOf(out), kms, marks, mass, home }
  if (byKey.size > 8) byKey.clear()
  byKey.set(key, shape)
  return shape
}
