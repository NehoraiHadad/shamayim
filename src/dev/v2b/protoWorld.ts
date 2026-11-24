import type { OutsideBox, OutsideTower } from '../../data/city/outsideView'
import { roofHeight, STOREY_M } from '../../data/city/skylineHeight'
import { seeded } from '../../data/landmarks/hash'
import { heightLabelBox } from '../../world/sceneClearance'
import { SCENE_W } from '../../world/sceneBox'
import type { OutsideTreeSite, OutsideView, WorldInput, WorldState } from '../../world/types'
import { chooseCells } from './chooseCells'
import { chooseFootprints } from './chooseFootprints'
import { protoFrame, type ProtoFrame } from './frame'
import { troddenGround } from './ground'
import { ownGroup } from './group'
import { protoMarks } from './protoMarks'
import { HOUSE_M, type Footprint, type ProtoHouse, type Spot } from './types'

/** A built cell's roof where the raster knows nothing (as `world/outside.ts`): one storey or two. */
const ROOF_M = [STOREY_M + 1.5, 2 * STOREY_M + 1.5]
/** The contact shade's carrier: a tower this high (px), whose own contact the painter draws and whose body is nothing. */
const CONTACT_PX = .01
/** The label stands this far over the roofs under it (px). */
const LABEL_GAP = 3

export interface Proto { world: WorldState; dot: { x: number; y: number }; report: object }

function boxesOf(houses: readonly ProtoHouse[], input: WorldInput, proto: ProtoFrame): OutsideBox[] {
  const { place, city } = input
  const cos = Math.cos(place.lat * Math.PI / 180)
  return houses.map((h): OutsideBox => {
    const u = seeded(h.seed)()
    const at = city?.raster?.at(place.lat + h.dy / 111.32, place.lon + h.dx / (111.32 * cos))
    const heightM = at && at.built >= .2 ? roofHeight(at.levels, at.p90, u) : ROOF_M[u < .6 ? 0 : 1]
    const p = proto.at(h)
    const px = proto.housePx / HOUSE_M * p.scale
    return { x: p.x, w: h.frontM * px, foot: p.foot, top: p.foot - Math.max(1.8, heightM * px), near: p.near, kind: 'mass',
      heightM, seed: h.seed, dx: h.dx, dy: h.dy }
  }).sort((a, b) => a.near - b.near)
}

const contactOf = (b: OutsideBox): OutsideTower => ({ x: b.x, baseY: b.foot, w: b.w, h: CONTACT_PX, near: b.near, heightM: 1, seed: b.seed!,
  famous: false, lod: 'silhouette', crown: 0, dx: b.dx, dy: b.dy })

function treesOf(spots: readonly Spot[], proto: ProtoFrame, km: number): OutsideTreeSite[] {
  return spots.map(({ dx, dy }): OutsideTreeSite => {
    const seed = Math.round(dx * 1e5) * 31 + Math.round(dy * 1e5)
    const u = seeded(seed)(), p = proto.at({ dx, dy })
    const h = (6 + 3 * u) * proto.ppm * proto.enlarge * p.scale
    return { x: p.x, base: p.foot, h, w: h * .75, near: p.near, kind: u < .2 ? 'cypress' : 'tree', seed, km }
  })
}

/** The label over the roofs that stand under it, centred on the dot. */
function labelOver(world: WorldState, boxes: readonly OutsideBox[], dot: { x: number; y: number }) {
  const at = { ...world.labels.height, x: dot.x }
  const box = heightLabelBox(at, SCENE_W)
  const roofs = boxes.filter(b => Math.abs(b.x - dot.x) < box.w / 2 + b.w / 2).map(b => b.top - 2.2)
  const y = Math.min(dot.y - 8, ...roofs) - LABEL_GAP - box.h
  return { ...at, y: y + (at.y - box.y) }
}

/** The world with the place's houses, trees and marks replaced; the dot is taken off it so it erases nothing (`dot`). */
export function protoWorld(world: WorldState, input: WorldInput, mode: 'a' | 'b', footprints: readonly Footprint[]): Proto | null {
  if (world.place3.kind !== 'outside' || !input.cover) return null
  const view: OutsideView = world.place3
  const { cells, trees } = ownGroup(input.place, input.cover, input.city?.raster)
  if (!cells.length) return null
  const proto = protoFrame(world, view, cells, input.terrain.heightNear ?? (() => null))
  const { houses, total } = mode === 'a' ? chooseCells(cells, proto.law, proto.budget, input.place.lat) : chooseFootprints(footprints, proto.law, proto.budget)
  const boxes = boxesOf(houses, input, proto)
  const dot = { x: view.dot.x, y: proto.dotY }
  const place3: OutsideView = { ...view, frame: proto.frame, dot: { x: view.dot.x, y: -999 }, beyond: [], beyondTowns: [],
    skyline: { ...view.skyline, boxes, towers: boxes.map(contactOf) }, trees: treesOf(trees, proto, view.baseKm),
    land: troddenGround(mode === 'a' ? cells : footprints, proto, view.baseKm), vscale: view.vscale }
  const { w, e, s, n } = proto.frame
  const report = { mode, cells: cells.length, known: cells.filter(c => c.known).length, total: Math.round(total), drawn: houses.length,
    trees: trees.length, widthPx: proto.widthPx, depthPx: proto.depthPx, housePx: proto.housePx, enlarge: proto.enlarge, law: proto.law, budget: proto.budget,
    dot, dotToday: view.dot, frame: { w, e, s, n }, groups: cells.map(c => [c.dx, c.dy]), houses: boxes.map(b => [b.dx, b.dy, b.x, b.foot, b.w, b.foot - b.top]) }
  return { dot, report, world: { ...world, place3, marks: protoMarks(world, input, proto), seatPool: [],
    labels: { ...world.labels, height: labelOver(world, boxes, dot) },
    keys: { ...world.keys, place: `${world.keys.place}|v2b-${mode}`, marks: `${world.keys.marks}|v2b-${mode}` } } }
}

/** The footprints the workflow wrote for a place (`public/v2b/<id>.json`, never committed). */
export async function loadFootprints(id: string): Promise<Footprint[]> {
  const res = await fetch(`/v2b/${id}.json`)
  if (!res.ok) throw new Error(`footprints ${res.status}`)
  const rows = await res.json() as [number, number, number, number, number][]
  return rows.map(([x, y, long, short, angle]) => ({ dx: x / 1000, dy: y / 1000, long, short, angle }))
}
