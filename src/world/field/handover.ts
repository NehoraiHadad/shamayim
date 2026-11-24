import { smoothstep } from './genus'
import { shareOf } from './occupancy'
import type { FieldCell, FieldLayer, Lattice } from './types'

export const HALF_WINDOW = 30
export const dayStart = (minute: number) => Math.floor(minute / 1440) * 1440
export const nearestMidnight = (minute: number) => Math.round(minute / 1440) * 1440
const mix = (a: number, b: number, w: number) => a + (b - a) * w
const compareId = (a: FieldCell, b: FieldCell) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0

/** A layer's own air: `d` how far (km east, north) its wind has carried it over the ground, `weight` its share of the field. */
export interface AirFrame { d: FieldLayer['d']; weight: number }

/** The airs a layer is drawn in at a minute: its day's, and within half an hour of midnight both days', one over the other. */
export function airFrames(layer: FieldLayer, minute: number): AirFrame[] {
  const midnight = nearestMidnight(minute)
  const day = layer.dayMotion
  if (!day) return [{ d: (layer.motionAt?.(minute) ?? layer).d, weight: 1 }]
  if (Math.abs(minute - midnight) >= HALF_WINDOW) return [{ d: day(minute, dayStart(minute)).d, weight: 1 }]
  const weight = smoothstep(-HALF_WINDOW, HALF_WINDOW, minute - midnight)
  return [{ d: day(minute, midnight - 1440).d, weight: 1 - weight }, { d: day(minute, midnight).d, weight }]
}

export function clumpAt(layer: FieldLayer, minute: number, sample: (x: number, y: number) => number) {
  const read = ({ d: [dx, dy] }: AirFrame) => (x: number, y: number) => sample(x - dx, y - dy)
  const [first, next] = airFrames(layer, minute)
  const a = read(first)
  if (!next) return a
  const b = read(next)
  return (x: number, y: number) => mix(a(x, y), b(x, y), next.weight)
}

/** At the reference minute both fields have the same wind and hence ellipse orientation. */
function overlap(a: FieldCell, b: FieldCell) {
  const dx = a.x - b.x, dy = a.y - b.y
  const angle = (a.axis ?? 0) * Math.PI / 180
  const aspect = a.axis === undefined ? 1 : 3
  const d = Math.hypot(dx * Math.sin(angle) + dy * Math.cos(angle),
    aspect * (dx * Math.cos(angle) - dy * Math.sin(angle)))
  const r = a.r, s = b.r
  if (d >= r + s) return 0
  if (d <= Math.abs(r - s)) return Math.PI * Math.min(r, s) ** 2 / aspect
  const sector = (radius: number, other: number) =>
    radius ** 2 * Math.acos(Math.min(1, Math.max(-1, (d ** 2 + radius ** 2 - other ** 2) / (2 * d * radius))))
  const triangle = Math.sqrt(Math.max(0, (-d + r + s) * (d + r - s) * (d - r + s) * (d + r + s))) / 2
  return (sector(r, s) + sector(s, r) - triangle) / aspect
}

export function greedyPairs(outgoing: FieldCell[], incoming: FieldCell[], maxRadius: number) {
  const bins = new Map<string, FieldCell[]>()
  const side = 2 * maxRadius
  const tile = (x: number) => Math.floor(x / side)
  for (const cell of incoming) {
    const key = `${tile(cell.x)}:${tile(cell.y)}`
    const bin = bins.get(key)
    if (bin) bin.push(cell)
    else bins.set(key, [cell])
  }
  const edges: { a: FieldCell; b: FieldCell; area: number }[] = []
  for (const a of outgoing) {
    const x = tile(a.x), y = tile(a.y)
    for (let j = y - 1; j <= y + 1; j++) for (let i = x - 1; i <= x + 1; i++) {
      for (const b of bins.get(`${i}:${j}`) ?? []) {
        if (a.genus !== b.genus) continue
        const area = overlap(a, b)
        if (area > 0) edges.push({ a, b, area })
      }
    }
  }
  edges.sort((p, q) => q.area - p.area || compareId(p.a, q.a) || compareId(p.b, q.b))
  const pairs = new Map<FieldCell['id'], FieldCell['id']>()
  const used = new Set<FieldCell['id']>()
  for (const { a, b } of edges) if (!pairs.has(a.id) && !used.has(b.id)) {
    pairs.set(a.id, b.id)
    used.add(b.id)
  }
  return pairs
}

function morph(a: FieldCell, b: FieldCell, w: number): FieldCell {
  const axisDelta = a.axis === undefined ? 0 : ((b.axis! - a.axis + 540) % 360) - 180
  return { ...a, x: mix(a.x, b.x, w), y: mix(a.y, b.y, w),
    r: mix(a.r, b.r, w), rMinor: a.rMinor === undefined ? undefined : mix(a.rMinor, b.rMinor!, w),
    axis: a.axis === undefined ? undefined : (a.axis + w * axisDelta + 360) % 360,
    baseKm: mix(a.baseKm, b.baseKm, w), vKm: mix(a.vKm, b.vKm, w),
    tau0: mix(a.tau0, b.tau0, w), share: mix(a.share, b.share, w),
    rainWeight: mix(a.rainWeight, b.rainWeight, w) }
}

function fade(cell: FieldCell, q: number, weight: number, lattice: Lattice) {
  if (!cell.share) return cell
  const width = lattice === 'tower' ? 0.4 : 0.25
  const share = shareOf(cell.rank, q * weight, width)
  const fraction = share / cell.share
  return { ...cell, share, r: cell.r * Math.sqrt(fraction), tau0: cell.tau0 * fraction,
    rMinor: cell.rMinor === undefined ? undefined : cell.rMinor * Math.sqrt(fraction),
    rainWeight: cell.rainWeight * fraction }
}

export function handover(outgoing: FieldCell[], incoming: FieldCell[],
  pairs: ReturnType<typeof greedyPairs>, q: number, cover: number, minute: number) {
  const w = smoothstep(-HALF_WINDOW, HALF_WINDOW, minute)
  // Independent Boolean decks multiply clear probabilities. Split log-clear intensity linearly.
  // Convert each intensity share back to a rank fraction on the calibrated cover scale.
  const logClear = Math.log1p(-Math.min(0.98, cover))
  const rankWeight = (weight: number) => -Math.expm1(logClear * weight) / -Math.expm1(logClear)
  const next = new Map(incoming.map(cell => [cell.id, cell]))
  const result = outgoing.map(a => {
    const b = next.get(pairs.get(a.id)!)
    if (!b) return fade(a, q, rankWeight(1 - w), a.lattice)
    next.delete(b.id)
    return morph(a, b, w)
  })
  for (const b of next.values()) result.push(fade(b, q, rankWeight(w), b.lattice))
  return result.filter(cell => cell.share > 0)
}
