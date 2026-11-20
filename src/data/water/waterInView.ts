import { wrap180 } from '../../domain/camera'
import type { Coordinate } from '../landmarks/project'
import { destination, RAY_DISTANCES, type Panorama } from '../terrain/panorama'
import type { WaterBody, WaterMask } from './waterMask'

/** Which large water body lies at a distance (km) along an azimuth from the place: its index, or null on land. */
export interface WaterLookup {
  bodies: WaterBody[]
  bodyAlong: (distanceKm: number, azimuth: number) => number | null
}

/** The mask read round a place, along its panorama's rays. */
export function waterAround(place: Coordinate, mask: WaterMask): WaterLookup {
  return {
    bodies: mask.bodies,
    bodyAlong(distanceKm, azimuth) {
      const point = destination(place.lat, place.lon, distanceKm, azimuth)
      return mask.bodyAt(point.lat, point.lon)
    },
  }
}

/** One ray's view of a water body: where its visible surface starts and ends, as angles (deg) and distances (km). */
export interface WaterEdge {
  /** Scene x of the ray. */
  x: number
  azimuth: number
  /** The nearest visible water (its shore, or where the land in front stops hiding it). */
  nearKm: number
  nearAngle: number
  nearY: number
  /** The farthest visible water: its far shore, or the sea's own horizon. */
  farKm: number
  farAngle: number
  farY: number
}

/** A stretch of water in view: one body over neighbouring rays, in screen order (left to right). */
export interface WaterSpan extends WaterBody {
  /** Scene x of its left and right ends (half a ray's spacing past the outer rays). */
  from: number
  to: number
  /** Azimuths (deg) at its left and right ends. */
  fromAzimuth: number
  toAzimuth: number
  /** Distance (km) to its near edge: the median over its rays. */
  distanceKm: number
  edges: WaterEdge[]
}

/** A body seen on fewer rays than this (1.25° each) is a glimpse, not water in view. */
const MIN_RAYS = 4
/** Water whose surface never shows this deep on screen (px) is a line of sight grazing it, not water in view. */
const MIN_DEPTH_PX = 1
/** Land narrower than this (km) along a ray does not break a body's water (a dike between ponds, a spit, a pier). */
const GAP_KM = 2.5

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]

/**
 * The water in view along each ray of a panorama (in the scene's order, left to right). A ray's ground samples know
 * whether they are seen (nothing nearer stands higher in angle, `horizonRay`): the first seen sample on a water body
 * starts its visible surface, which runs on over the body (seen, or behind the sea's own horizon) until land wider than
 * `GAP_KM` (a peninsula, the far shore); its far edge is the last seen sample on it. Beyond such land the same body may
 * show again: a second run. Neighbouring rays' runs on the same body (first with first, second with second) make one
 * span.
 */
export function waterInView(p: Panorama, water: WaterLookup, xOf: (i: number) => number,
  yOf: (angle: number) => number, distances: readonly number[] = RAY_DISTANCES): WaterSpan[] {
  const n = p.rays.length
  const perRay = p.rays.map((ray, i) => {
    const runs = new Map<string, WaterEdge>()
    const open = new Map<number, { key: string; near: number; far: number; lastKm: number }>()
    const count = new Map<number, number>()
    const close = (body: number) => {
      const run = open.get(body)
      if (!run) return
      const { near, far } = run
      runs.set(run.key, { x: xOf(i), azimuth: ray.azimuth, nearKm: distances[near], nearAngle: ray.profile[near].angle,
        nearY: yOf(ray.profile[near].angle), farKm: distances[far], farAngle: ray.profile[far].angle,
        farY: yOf(ray.profile[far].angle) })
      open.delete(body)
    }
    for (let j = 0; j < ray.profile.length && j < distances.length; j++) {
      const body = water.bodyAlong(distances[j], ray.azimuth)
      if (body === null) continue
      const seen = ray.profile[j].seen
      const run = open.get(body)
      if (run && distances[j] - run.lastKm > GAP_KM) close(body)
      const live = open.get(body)
      if (live) {
        live.lastKm = distances[j]
        if (seen) live.far = j
      } else if (seen) {
        const k = count.get(body) ?? 0
        count.set(body, k + 1)
        open.set(body, { key: `${body}:${k}`, near: j, far: j, lastKm: distances[j] })
      }
    }
    for (const body of [...open.keys()]) close(body)
    return runs
  })
  const keys = [...new Set(perRay.flatMap((runs) => [...runs.keys()]))]
  const half = n > 1 ? (xOf(1) - xOf(0)) / 2 : 0
  const halfAz = n > 1 ? wrap180(p.rays[1].azimuth - p.rays[0].azimuth) / 2 : 0
  const spans: WaterSpan[] = []
  for (const key of keys) {
    const body = water.bodies[Number(key.split(':')[0])]
    let run: WaterEdge[] = []
    const close = () => {
      if (run.length >= MIN_RAYS && run.some((edge) => edge.nearY - edge.farY >= MIN_DEPTH_PX)) {
        spans.push({ ...body, from: run[0].x - half, to: run[run.length - 1].x + half,
          fromAzimuth: (run[0].azimuth - halfAz + 360) % 360, toAzimuth: (run[run.length - 1].azimuth + halfAz + 360) % 360,
          distanceKm: median(run.map((edge) => edge.nearKm)), edges: run })
      }
      run = []
    }
    for (const runs of perRay) {
      const edge = runs.get(key)
      if (edge) run.push(edge)
      else close()
    }
    close()
  }
  return spans.sort((a, b) => a.from - b.from || a.distanceKm - b.distanceKm)
}

/** Which side the sea is on, by the azimuths of the rays that see it (west or east, whatever the screen order). */
export function seaSideOf(spans: WaterSpan[]): 'west' | 'east' | null {
  let west = 0, east = 0
  for (const span of spans) {
    if (span.kind !== 'sea') continue
    for (const edge of span.edges) {
      const off = wrap180(edge.azimuth - 180)
      if (off > 1e-6) west++
      else if (off < -1e-6) east++
    }
  }
  if (!west && !east) return null
  return west >= east ? 'west' : 'east'
}
