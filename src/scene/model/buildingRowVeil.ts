import { SCENE_W } from '../../world/sceneBox'
import { groundAt } from '../../world/sceneLight'
import type { OutsideView, WorldState } from '../../world/types'
import { localFootY } from './faceProjection'
import { HAZE_SLOPE, hazeAt } from './landVeil'
import type { outsideShape } from './outsideShape'
import { TEXEL } from './planeBands'
import { fieldSample, vegetationField } from './planeField'
import { planeLayer } from './planes'
import type { LayerOf, OutsideItem, SceneBox } from './types'

type Shape = ReturnType<typeof outsideShape>
type PlaneLayer = LayerOf<'plane'>
type House = Extract<OutsideItem, { kind: 'box' }>
type Row = { y: number; byte: number; houses: House[] }
// The brief allows a tenth of the veil between neighbouring rows.
const ROW_DELTA = .1
const ROW_BYTE_DELTA = Math.floor(ROW_DELTA * 255)
// Span at most a tenth of the plane's horizontal veil gradient within one cluster.
const SPAN = ROW_DELTA / HAZE_SLOPE
const PLANES = ['near', 'far', 'back'] as const

function groundSampler(world: WorldState, box: SceneBox, town: NonNullable<OutsideView['land']>, planes?: readonly PlaneLayer[]) {
  const samples = new Map<PlaneLayer['plane'], ReturnType<typeof vegetationField>>()
  const out = fieldSample()
  const capShare = hazeAt(world, town.km)
  return (house: House, depth: number) => {
    const x = house.x * SCENE_W / box.width, y = house.foot
    if (x < 0 || x > SCENE_W || y >= box.landHeight) return
    if (x >= town.top[0][0] && x <= town.top.at(-1)![0] &&
        y >= groundAt(town.top, x) && y <= groundAt(town.base, x)) {
      return depth > town.km ? capShare : undefined
    }
    for (const name of PLANES) {
      const plane = world.terrain[name]
      if (!plane || plane.points.length < 2) continue
      const crest = groundAt(plane.points, x)
      if (y < crest) continue
      const foot = localFootY(world, name, x, crest, box.landHeight)
      if (y > foot) continue
      let sample = samples.get(name)
      if (!sample) {
        const layer = planes?.find(p => p.plane === name) ?? planeLayer(world, box, name, plane, [])
        if (!layer) return
        samples.set(name, sample = vegetationField(layer.light.litField, layer.outline, layer.bounds))
      }
      sample(house.x, y, out)
      // Haze increases with path distance. Test the painted field against the cap with
      // half a terrain byte of slack so packing alone cannot put a foot beyond it.
      if (depth > town.km || out.haze > capShare + .5 / 255) return out.haze
      return
    }
  }
}

export function buildingRowVeil(world: WorldState, box: SceneBox, shape: Shape, planes?: readonly PlaneLayer[]) {
  const town = world.place3.kind === 'outside' ? world.place3.land : null
  if (!town || !Number.isFinite(town.km) || !shape.wallDepths.size) return
  const sample = groundSampler(world, box, town, planes)
  const columns = new Map<number, Map<number, Row>>()
  for (const [item, depth] of shape.wallDepths) {
    if (item.kind !== 'box' || !Number.isFinite(depth)) continue
    const share = sample(item, depth)
    if (share === undefined || !Number.isFinite(share)) continue
    // Floor to the field's byte precision so the cache and both painters share one input.
    const byte = Math.floor(share * 255)
    const x = Math.floor(item.x * SCENE_W / box.width / SPAN), y = Math.floor(item.foot / TEXEL)
    let rows = columns.get(x)
    if (!rows) columns.set(x, rows = new Map())
    let row = rows.get(y)
    if (!row) rows.set(y, row = { y, byte, houses: [] })
    // A common veil must stay at or below the ground behind every foot (C9).
    row.byte = Math.min(row.byte, byte)
    row.houses.push(item)
  }
  if (!columns.size) return
  const kms = [...shape.kms], wallKms = [...shape.wallKms], shares: (number | undefined)[] = []
  const receivers = [...shape.receivers], heaters = new Set(shape.heaters)
  const replacements = new Map<OutsideItem, House>()
  const tiers = new Map<string, number>()
  for (const rows of columns.values()) {
    const ordered = [...rows.values()].sort((a, b) => a.y - b.y)
    // The greatest slope-limited lower envelope never exceeds a foot's terrain veil.
    const limit = (a: Row, b: Row) => { a.byte = Math.min(a.byte, b.byte + ROW_BYTE_DELTA * Math.abs(a.y - b.y)) }
    for (let i = 1; i < ordered.length; i++) limit(ordered[i], ordered[i - 1])
    for (let i = ordered.length - 2; i >= 0; i--) limit(ordered[i], ordered[i + 1])
    for (const { byte, houses } of ordered) {
      for (const house of houses) {
        const key = `${house.tier}:${byte}`
        let tier = tiers.get(key)
        if (tier === undefined) {
          tier = kms.length
          tiers.set(key, tier)
          kms.push(shape.kms[house.tier])
          wallKms.push(shape.wallKms[house.tier])
          receivers.push(new Map())
          shares[tier] = byte / 255
        }
        // Retain the original tier's material and detail decisions on both sides of the split.
        receivers[tier].set(house.receiver, shape.receivers[house.tier].get(house.receiver)!)
        if (shape.heaters.has(house.tier) && house.heater && house.w > 2.6) heaters.add(tier)
        replacements.set(house, { ...house, tier })
      }
    }
  }
  const items = shape.items.map(item => replacements.get(item) ?? item)
  return { shape: { ...shape, items, kms, wallKms, receivers, heaters }, shares }
}
