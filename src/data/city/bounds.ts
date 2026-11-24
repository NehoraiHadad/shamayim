import type { Coordinate } from '../landmarks/project'
import type { Cluster } from './clusterTypes'
import { clusterReach, homeByName } from './homeCluster'

/**
 * The place's own boundary (CANVAS-SCENE-PLAN.md C5 item 6, owner decision 5): the outside view's frame is cut at the
 * place's boundary from data, not at its contiguous built-up cluster, so a city grown into its neighbours (Gush Dan)
 * shows only itself. One rule for every place:
 *
 * - **Where mapped, its administrative boundary.** OSM's `boundary=administrative` polygons (the Geofabrik extract the
 *   city and landmark data are built from, `scripts/city/bounds.ts`). A place's boundary is the largest polygon that
 *   holds its point and no rival place: no other place point of its own rank or higher (a town or city rivals any
 *   place; a village rivals a village). So a municipality is a city's (Tel Aviv–Yafo, Ramat Gan), a kibbutz's own
 *   polygon a kibbutz's (its regional council holds rival villages), and a district, holding other towns, nobody's.
 * - **Else the cell of the place points round it**: the land that is nearer to this place than to any other, distance
 *   weighted by each place's reach (the rule the built-up clusters are already split by, `clusters.ts`).
 *
 * Served from `public/data/city/bounds.json` (simplified rings, ~40 m), loaded only by the canvas scene.
 */

/** [lat, lon, kind (0 city … 3 hamlet), reach (0.1 km)]: every place point of the city data. */
export type BoundsPoint = [lat: number, lon: number, kind: number, reach: number]

export interface BoundsFile {
  v: 1
  source: string
  generatedAt: string
  points: BoundsPoint[]
  /**
   * Boundaries by place point: `at` its index in `points`, `level` OSM's admin level, rings as flat integer lists
   * (lat, lon in 1e-5°, the first pair absolute and the rest deltas), outer rings and holes alike (even–odd).
   */
  bounds: { at: number; level: number; name?: string; rings: number[][] }[]
}

export interface PlaceBounds {
  source: 'boundary' | 'cell'
  /** The place point it was found for (the nearest owner of the place's own point). */
  point: BoundsPoint
  name?: string
  contains: (lat: number, lon: number) => boolean
  /** Its extent in km from the place: west, east, south, north. */
  box: { w: number; e: number; s: number; n: number }
}

const SCALE = 1e5

export function decodeRing(flat: readonly number[]): [lat: number, lon: number][] {
  const out: [number, number][] = []
  let lat = 0, lon = 0
  for (let i = 0; i + 1 < flat.length; i += 2) {
    lat += flat[i]
    lon += flat[i + 1]
    out.push([lat / SCALE, lon / SCALE])
  }
  return out
}

export function encodeRing(ring: readonly (readonly [number, number])[]): number[] {
  const out: number[] = []
  let lat = 0, lon = 0
  for (const [a, b] of ring) {
    const la = Math.round(a * SCALE), lo = Math.round(b * SCALE)
    out.push(la - lat, lo - lon)
    lat = la
    lon = lo
  }
  return out
}

/** Even–odd over every ring: inside an outer ring and not in one of its holes. */
export function inRings(rings: readonly (readonly [number, number])[][], lat: number, lon: number) {
  let inside = false
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [ay, ax] = ring[i], [by, bx] = ring[j]
      if ((ay > lat) !== (by > lat) && lon < ax + (bx - ax) * (lat - ay) / (by - ay)) inside = !inside
    }
  }
  return inside
}

/** Km east / north of the place per degree (the frame's own flat measure, as `offsetKm`). */
const kmPer = (place: Coordinate) => ({ x: 111.32 * Math.cos(place.lat * Math.PI / 180), y: 111.32 })

/** Place point reach (`BoundsPoint[3]`) is stored in tenths of a km (0.1 km units). */
const REACH_PER_KM = 10
/** How strongly a place point claims a spot (km offsets): distance over its reach (the clusters' rule, `splitByPlace`). */
const claim = (px: number, py: number, reach: number, x: number, y: number) => Math.hypot(x - px, y - py) * REACH_PER_KM / Math.max(1, reach)

/** The mask's cell (km): finer than a built square of the city raster (~118 × 232 m). */
const STEP = .05
const maskRows = (reachKm: number) => Math.ceil(2 * reachKm / STEP)
const maskY = (reachKm: number, row: number) => -reachKm + (row + .5) * STEP
/**
 * Tolerance (km) for matching a cluster's OSM place node (`cityOffset` from `cell.p`) to its point in `bounds.json`.
 * `scripts/city/bounds.ts` copies `cell.p` coordinates verbatim (only polygon rings are simplified to 40 m), so the gap
 * is 0 on matching builds; 50 m (one mask `STEP`) absorbs minor extract drift without latching onto a neighbour.
 */
const OWN_POINT_KM = .05

/**
 * The bounds as a mask over the square of `reachKm` round the place (cells of `STEP` km), with its extent; a spot outside
 * the square answers by the exact rule.
 */
function masked(place: Coordinate, reachKm: number, fill: (row: number, y: number, set: (x0: number, x1: number) => void) => void,
  exact: (x: number, y: number) => boolean) {
  const n = maskRows(reachKm)
  const bits = new Uint8Array(n * n)
  let w = Infinity, e = -Infinity, s = Infinity, nn = -Infinity
  for (let row = 0; row < n; row++) {
    const y = maskY(reachKm, row)
    fill(row, y, (x0, x1) => {
      const c0 = Math.max(0, Math.ceil((x0 + reachKm) / STEP - .5)), c1 = Math.min(n - 1, Math.floor((x1 + reachKm) / STEP - .5))
      for (let col = c0; col <= c1; col++) bits[row * n + col] = 1
      if (c1 >= c0) {
        w = Math.min(w, -reachKm + (c0 + .5) * STEP); e = Math.max(e, -reachKm + (c1 + .5) * STEP)
        s = Math.min(s, y); nn = Math.max(nn, y)
      }
    })
  }
  const per = kmPer(place)
  const contains = (lat: number, lon: number) => {
    const x = (lon - place.lon) * per.x, y = (lat - place.lat) * per.y
    const col = Math.floor((x + reachKm) / STEP), row = Math.floor((y + reachKm) / STEP)
    return col >= 0 && col < n && row >= 0 && row < n ? bits[row * n + col] === 1 : exact(x, y)
  }
  return { contains, box: Number.isFinite(w) ? { w, e, s, n: nn } : null }
}

/** Where the rings' edges cross each of the mask's rows (x, km): each edge is asked only of the rows it spans. */
function crossings(rings: readonly (readonly (readonly [number, number])[])[], reachKm: number) {
  const rows = Array.from({ length: maskRows(reachKm) }, (): number[] => [])
  const rowOf = (y: number) => Math.floor((y + reachKm) / STEP - .5)
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [ax, ay] = ring[i], [bx, by] = ring[j]
      const from = Math.max(0, rowOf(Math.min(ay, by))), to = Math.min(rows.length - 1, rowOf(Math.max(ay, by)) + 1)
      for (let row = from; row <= to; row++) {
        const y = maskY(reachKm, row)
        if ((ay > y) !== (by > y)) rows[row].push(ax + (bx - ax) * (y - ay) / (by - ay))
      }
    }
  }
  return rows
}

/**
 * The place's boundary: the smallest mapped boundary that holds the place, then one holding its own mapped point.
 * Otherwise use the weighted cell of the bounds point matching `own` (within `OWN_POINT_KM`), falling back to the
 * strongest claimant at the place point when `own` is omitted or no bounds point matches it.
 * The mask covers `reachKm` round the place (the outside view's frame never reaches further).
 */
export function placeBounds(place: Coordinate, file: BoundsFile | null | undefined, reachKm: number,
  own?: { dx: number; dy: number; reachKm: number }): PlaceBounds | null {
  if (!file?.points.length) return null
  const per = kmPer(place)
  const km = ([lat, lon]: readonly [number, number] | BoundsPoint) => [(lon - place.lon) * per.x, (lat - place.lat) * per.y] as const
  const reach = reachKm + .5
  let best: { b: BoundsFile['bounds'][number]; rings: (readonly [number, number])[][]; size: number; holdsPlace: boolean } | null = null
  for (const b of file.bounds) {
    const [px, py] = km(file.points[b.at])
    if (Math.hypot(px, py) > 40) continue
    const rings = b.rings.map(decodeRing)
    const holdsPlace = inRings(rings, place.lat, place.lon)
    if (!holdsPlace && (!own || best?.holdsPlace || !inRings(rings, place.lat + own.dy / per.y, place.lon + own.dx / per.x))) continue
    const size = rings.reduce((sum, ring) => sum + ring.length, 0)
    if (!best || (holdsPlace && !best.holdsPlace) || size < best.size) best = { b, rings, size, holdsPlace }
  }
  if (best) {
    const rings = best.rings.map((ring) => ring.map(km))
    const crossed = crossings(rings, reach)
    const { contains, box } = masked(place, reach, (row, _y, set) => {
      const xs = crossed[row].sort((a, b) => a - b)
      for (let i = 0; i + 1 < xs.length; i += 2) set(xs[i], xs[i + 1])
    }, (x, y) => inRings(best.rings, place.lat + y / per.y, place.lon + x / per.x))
    if (box) return { source: 'boundary', point: file.points[best.b.at], name: best.b.name, contains, box }
  }
  // Rivals that could claim a spot within the reach (a city's own reach is up to ~8 km).
  const near = file.points.map((p) => ({ p, at: km(p) })).filter(({ at }) => Math.hypot(at[0], at[1]) <= reach + 12)
  if (!near.length) return null
  const matched = own
    ? near.reduce<{ entry: typeof near[number]; dist: number } | null>((best, entry) => {
        const dist = Math.hypot(entry.at[0] - own.dx, entry.at[1] - own.dy)
        return dist <= OWN_POINT_KM && (!best || dist < best.dist) ? { entry, dist } : best
      }, null)?.entry ?? null
    : null
  const owner = matched ?? near.reduce((a, b) => claim(b.at[0], b.at[1], b.p[3], 0, 0) < claim(a.at[0], a.at[1], a.p[3], 0, 0) ? b : a)
  const ownerReach = matched && own ? Math.max(owner.p[3], REACH_PER_KM * own.reachKm) : owner.p[3]
  const owns = (x: number, y: number) => {
    const mine = claim(owner.at[0], owner.at[1], ownerReach, x, y)
    return near.every((o) => o === owner || claim(o.at[0], o.at[1], o.p[3], x, y) >= mine)
  }
  const { contains, box } = masked(place, reach, (_row, y, set) => {
    let from: number | null = null
    for (let x = -reach + STEP / 2; x < reach; x += STEP) {
      if (owns(x, y)) from ??= x
      else if (from !== null) { set(from, x - STEP); from = null }
    }
    if (from !== null) set(from, reach)
  }, owns)
  return box ? { source: 'cell', point: owner.p, contains, box } : null
}

/** The place's own bounds, passing its name-matched home cluster as `own` when one exists. */
export function boundsForPlace(place: Coordinate & { nameHe?: string }, clusters: readonly Cluster[] | undefined,
  file: BoundsFile | null | undefined, reachKm: number): PlaceBounds | null {
  const home = homeByName(clusters ?? [], place.nameHe)
  const at = home?.place?.at
  return placeBounds(place, file, reachKm, home && at ? { ...at, reachKm: clusterReach(home, at) } : undefined)
}

/** Whether spots given as km east / north of the place lie within its bounds. */
export function boundsHolder(bounds: PlaceBounds, place: Coordinate) {
  const per = kmPer(place)
  return (dx: number, dy: number) => bounds.contains(place.lat + dy / per.y, place.lon + dx / per.x)
}
/** Whether one such spot does. */
export const boundsHoldKm = (bounds: PlaceBounds, place: Coordinate, dx: number, dy: number) => boundsHolder(bounds, place)(dx, dy)

let boundsPromise: Promise<BoundsFile | null> | undefined

/** The boundaries, fetched once per session; null when they cannot be had (the frame falls back to the built-up area). */
export function loadBounds(): Promise<BoundsFile | null> {
  boundsPromise ??= fetch(`${import.meta.env.BASE_URL}data/city/bounds.json`)
    .then((r) => r.ok ? r.json() as Promise<BoundsFile> : null)
    .then((file) => file?.v === 1 ? file : null)
    .catch(() => { boundsPromise = undefined; return null })
  return boundsPromise
}
