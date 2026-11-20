import type { Airport } from './airports'
import type { FlightTerrain } from './flightTerrain'
import type { BirdKind } from './life'

/*
 * Where birds and planes fly over the real land (the owner's report of 2026-11-20: "pay attention to where they fly, so
 * that they don't suddenly fly into the mountain"). Every path lives in 3D over the place's ground (`flightTerrain.ts`): a
 * horizontal track and an altitude over sea level along it. General rules, no place named:
 *
 * Birds keep the height over the ground their kind keeps (`FLIGHT`). Where the ground ahead rises, the flock climbs ahead of
 * the rise at its kind's rate; where it cannot clear the rise in time, it turns along the valley or the contour (a cheap
 * steering rule: a few headings looked down at each step, the one that needs the least climbing taken, within 70° of its
 * way, or up to 120° along a wall while it still draws away from the eye). Migrants aim at the lowest ground across their
 * way ahead (the passes and valley corridors) while holding their flyway's direction; residents stay round their home (the
 * town, the water). The altitude along the finished track is then laid
 * once: the kind's height over the smoothed ground, never under its least clearance over the ground along the track
 * (sampled with a margin), climbing at most and sinking at most at the kind's rates.
 *
 * Airport traffic follows real approach geometry: a 3° glide path down the extended centreline to the threshold over the
 * final, and before it the straight-in, a base leg or a downwind leg (the first whose glide clears the ground by 300 m);
 * where none does, the best one, held level over the ground ahead. A departure climbs out along the runway heading, then
 * turns toward its route (the route nearest its seeded way that clears the ground).
 */

const RAD = Math.PI / 180
const wrap180 = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180

export interface KindFlight {
  /** Height over the ground it keeps (m): its least clearance and its most. */
  agl: [number, number]
  /** Most climb and sink (m per m over the ground). */
  climb: number
  sink: number
  /** A migrant leans toward the lower ground ahead (passes, valleys); a resident keeps to its home. */
  migrant: boolean
}

/** Each kind's height over the ground and its rates (soaring birds climb steeply in a thermal; cranes cruise flapping). */
export const FLIGHT: Record<BirdKind, KindFlight> = {
  stork: { agl: [200, 1500], climb: 0.2, sink: 0.15, migrant: true },
  raptor: { agl: [200, 1500], climb: 0.25, sink: 0.15, migrant: false },
  crane: { agl: [300, 1500], climb: 0.1, sink: 0.12, migrant: true },
  swift: { agl: [50, 500], climb: 0.3, sink: 0.3, migrant: false },
  gull: { agl: [10, 150], climb: 0.2, sink: 0.25, migrant: false },
  crow: { agl: [10, 80], climb: 0.25, sink: 0.3, migrant: false },
  pigeon: { agl: [10, 80], climb: 0.25, sink: 0.3, migrant: false },
  bat: { agl: [5, 60], climb: 0.3, sink: 0.3, migrant: false },
}

/** A flock's track: points every `ds` m along its way (m east, north of the eye; m above sea level), in flight order. */
export interface FlockTrack {
  /** e, n, z per point. */
  pts: Float32Array
  ds: number
  /** The index nearest the eye (3D) and that distance (m). */
  nearIdx: number
  nearM: number
}

export interface TrackSpec {
  /** Its closest point's foot (m east, north of the eye) and its way there (deg). */
  cE: number
  cN: number
  headingDeg: number
  /** It begins and ends this far off (m over the ground). */
  endM: number
  /** The height it keeps over the ground (m). */
  aglM: number
  flight: KindFlight
  /** A resident's home: it is turned back toward it beyond `r` (m). */
  home?: { e: number; n: number; r: number }
}

/** The least clearance a track keeps is its kind's, with this margin and 3 m (the ground between samples may stand higher). */
export const CLEAR_MARGIN = 1.15

/**
 * One half of a track (outward from the closest point, `sign` +1 along its way, −1 back along it into its past): the
 * horizontal steering by the ground ahead. Returns the points (m) after the start, in walking order.
 */
function walk(spec: TrackSpec, ground: (e: number, n: number) => number, ds: number, sign: 1 | -1): number[] {
  const { flight, endM } = spec
  const way = sign > 0 ? spec.headingDeg : spec.headingDeg + 180
  // Walking back in time, a rise means the flock came down it: its sink is what it may "climb" on this side.
  const rate = sign > 0 ? flight.climb : flight.sink
  const minAgl = flight.agl[0] * CLEAR_MARGIN
  // How far ahead it looks: a migrant sees the ridge across its way kilometres off (it climbs a long way at its rate).
  const look = flight.migrant ? Math.min(8000, 800 / flight.climb) : Math.min(3000, Math.max(6 * ds, 300))
  const marks = flight.migrant ? Array.from({ length: 12 }, (_, i) => (i + 1) / 12) : [0.25, 0.5, 0.75, 1]
  const turnMax = 20
  // It climbs with a little to spare over what the ground ahead asks (the ground between its samples may stand higher), and
  // turns only when the rise ahead asks more than twice that over what it can climb.
  const spare = 0.08 * rate * look
  const out: number[] = []
  let e = spec.cE, n = spec.cN, hdg = way
  let alt = ground(e, n) + spec.aglM
  const maxSteps = Math.ceil((3.2 * endM) / ds) + 4
  // How much higher than it can climb by then the ground ahead stands (m, ≤ 0: clear).
  const ahead = (h: number) => {
    const ue = Math.sin(h * RAD), un = Math.cos(h * RAD)
    let need = -Infinity
    for (const f of marks) {
      const d = look * f
      const g = ground(e + ue * d, n + un * d)
      need = Math.max(need, g + minAgl - alt - rate * d)
    }
    // The height it must have now to clear all it sees ahead climbing at its rate (it starts climbing as a rise comes in sight).
    return { need, req: need + alt }
  }
  const homeCost = (h: number) => {
    const home = spec.home
    if (!home) return 0
    const d = Math.hypot(e + Math.sin(h * RAD) * look - home.e, n + Math.cos(h * RAD) * look - home.n)
    return Math.max(0, d - home.r) * 0.5
  }
  // A migrant aims at the lowest ground across its way at its look's distance (the pass, the valley's floor), a little
  // more each km aside; the rest aim along their way.
  let aim = way
  const ue = Math.sin(way * RAD), un = Math.cos(way * RAD)
  for (let step = 0; step < maxSteps && Math.hypot(e, n) < endM; step++) {
    if (flight.migrant && step % 3 === 0) {
      let low = Infinity
      for (const o of [-0.6, -0.3, 0, 0.3, 0.6]) {
        const te = e + ue * look + un * o * look, tn = n + un * look - ue * o * look
        const cost = ground(te, tn) + 0.05 * Math.abs(o) * look
        if (cost < low) { low = cost; aim = Math.atan2(te - e, tn - n) / RAD }
      }
    }
    // Straight on, or turning toward its aim, while the way there is clear and it keeps to its home; else the heading of a
    // few that needs the least climbing.
    const here = ahead(hdg)
    const homeOff = spec.home ? homeCost(hdg) > 0 : false
    const r = Math.hypot(e, n) || 1
    // Within 70° of its way it makes headway along it; past that (to 120°, along a wall) only while it still draws away
    // from the eye: either way it reaches the end of its session, far off.
    const allowed = (h: number) => {
      const dev = Math.abs(wrap180(h - way))
      return dev <= 70 || (dev <= 120 && (Math.sin(h * RAD) * e + Math.cos(h * RAD) * n) / r >= 0.05)
    }
    let free = here.need <= 2 * spare && !homeOff
    if (free && Math.abs(wrap180(hdg - aim)) > 5) {
      const h = hdg + Math.max(-turnMax, Math.min(turnMax, wrap180(aim - hdg)))
      if (allowed(h) && ahead(h).need <= 2 * spare) hdg = h
      else free = false
    }
    if (!free) {
      let best = hdg, bestCost = Infinity
      for (const c of [0, -15, 15, -30, 30, -45, 45]) {
        const h = hdg + c
        if (!allowed(h)) continue
        const a = c === 0 ? here : ahead(h)
        const cost = Math.max(0, a.need) * 20 + 3 * Math.abs(wrap180(h - aim)) + homeCost(h) + Math.abs(c) * 0.5
        if (cost < bestCost) { bestCost = cost; best = h }
      }
      hdg += Math.max(-turnMax, Math.min(turnMax, wrap180(best - hdg)))
    }
    e += Math.sin(hdg * RAD) * ds
    n += Math.cos(hdg * RAD) * ds
    const g = ground(e, n)
    alt = Math.max(g + minAgl, alt + Math.max(-rate * ds, Math.min(rate * ds, Math.max(g + spec.aglM, here.req + spare) - alt)))
    out.push(e, n)
  }
  return out
}

/** A flock's track over the ground (`TrackSpec`): its horizontal way and its altitude, in flight order. */
export function flockTrack(spec: TrackSpec, terrain: FlightTerrain): FlockTrack {
  return heightsOver(wayOf(spec, terrain), spec.aglM, spec.flight, terrain.eyeM)
}

/** A flock's horizontal way (m) and the ground along it: laid once, its height over it picked after (`heightsOver`). */
export interface FlockWay { xy: Float64Array; under: Float64Array; corridor: Float64Array; ds: number }

/** The horizontal way of a track (`TrackSpec`), steered by the ground ahead, and the ground under and along it. */
export function wayOf(spec: TrackSpec, terrain: FlightTerrain): FlockWay {
  const ds = Math.min(250, Math.max(10, spec.endM / 48))
  const ground = (e: number, n: number) => terrain.groundAt(e / 1000, n / 1000)
  const back = walk(spec, ground, ds, -1), fwd = walk(spec, ground, ds, 1)
  const count = back.length / 2 + 1 + fwd.length / 2
  const xy = new Float64Array(count * 2)
  let k = 0
  for (let i = back.length - 2; i >= 0; i -= 2) { xy[k++] = back[i]; xy[k++] = back[i + 1] }
  xy[k++] = spec.cE; xy[k++] = spec.cN
  for (let i = 0; i < fwd.length; i += 2) { xy[k++] = fwd[i]; xy[k++] = fwd[i + 1] }
  // The ground under each point, and the most along the stretches to its neighbours (each sampled at its quarters: what its
  // least clearance is kept over), and the ground smoothed over ~±600 m (what it keeps its height over).
  const under = new Float64Array(count), corridor = new Float64Array(count)
  for (let i = 0; i < count; i++) under[i] = corridor[i] = ground(xy[2 * i], xy[2 * i + 1])
  for (let i = 0; i < count - 1; i++) {
    let top = Math.max(under[i], under[i + 1])
    for (const f of [0.25, 0.5, 0.75]) {
      top = Math.max(top, ground(xy[2 * i] + (xy[2 * i + 2] - xy[2 * i]) * f, xy[2 * i + 1] + (xy[2 * i + 3] - xy[2 * i + 1]) * f))
    }
    corridor[i] = Math.max(corridor[i], top)
    corridor[i + 1] = Math.max(corridor[i + 1], top)
  }
  return { xy, under, corridor, ds }
}

/** A way's altitude (m above sea level): `aglM` over its smoothed ground, its least clearance kept, climbing and sinking at its rates. */
export function heightsOver(way: FlockWay, aglM: number, flight: KindFlight, eyeM: number): FlockTrack {
  const { xy, under, corridor, ds } = way
  const count = under.length
  const w = Math.max(1, Math.round(600 / ds))
  const z = new Float64Array(count)
  const least = flight.agl[0] * CLEAR_MARGIN + 3
  for (let i = 0; i < count; i++) {
    let sum = 0, m = 0
    for (let j = Math.max(0, i - w); j <= Math.min(count - 1, i + w); j++) { sum += under[j]; m++ }
    z[i] = Math.max(sum / m + aglM, corridor[i] + least)
  }
  // Climbing ahead of a rise (no more than its climb a step), and sinking after it no faster than its sink.
  const up = flight.climb * ds, down = flight.sink * ds
  for (let i = count - 2; i >= 0; i--) z[i] = Math.max(z[i], z[i + 1] - up)
  for (let i = 1; i < count; i++) z[i] = Math.max(z[i], z[i - 1] - down)
  const pts = new Float32Array(count * 3)
  let nearIdx = 0, nearM = Infinity
  for (let i = 0; i < count; i++) {
    pts[3 * i] = xy[2 * i]; pts[3 * i + 1] = xy[2 * i + 1]; pts[3 * i + 2] = z[i]
    const d = Math.hypot(xy[2 * i], xy[2 * i + 1], z[i] - eyeM)
    if (d < nearM) { nearM = d; nearIdx = i }
  }
  return { pts, ds, nearIdx, nearM }
}

/** A point of a track `s` m along it (straight between its points), and its heading there (deg). */
export function trackPoint(t: FlockTrack, s: number): { e: number; n: number; z: number; headingDeg: number } {
  const last = t.pts.length / 3 - 1
  const f = Math.max(0, Math.min(last, s / t.ds))
  const i = Math.min(last - 1, Math.floor(f)), k = f - i
  if (last < 1) return { e: t.pts[0], n: t.pts[1], z: t.pts[2], headingDeg: 0 }
  const a = 3 * i, b = 3 * (i + 1)
  const de = t.pts[b] - t.pts[a], dn = t.pts[b + 1] - t.pts[a + 1]
  return { e: t.pts[a] + de * k, n: t.pts[a + 1] + dn * k, z: t.pts[a + 2] + (t.pts[b + 2] - t.pts[a + 2]) * k,
    headingDeg: ((Math.atan2(de, dn) / RAD) % 360 + 360) % 360 }
}

/* Airport traffic. */

/** A point of a flight path: km east and north of the eye, m above the eye. */
export interface PathPt { e: number; n: number; up: number }

/** The final approach's length (km): the 3° glide from where it meets the centreline to the threshold. */
export const FINAL_KM = { jet: 15, light: 5 }
/** The clearance (m) a path keeps over the ground outside its final approach. */
export const CLEARANCE_M = 300
/** A departure climbs straight out along the runway this far (km) before it turns toward its route. */
const CLIMB_OUT_KM = { jet: 6, light: 3 }
/** Path points every this many km (the movement's evaluation reads straight between them). */
export const PATH_STEP_KM = 0.5
const GLIDE = Math.tan(3 * RAD)
/** After its climb-out a departure's turn keeps at least this far (km) from the eye, where a route allows. */
const EYE_KEEP_KM = 8

/**
 * Walks a path out from a start (km east, north), turning toward each leg's heading at most `turn` degrees a step (a rate-one
 * turn's radius at the movement's speed), for each leg's length (km); returns the points every `PATH_STEP_KM`, the start first.
 */
function legs(start: { e: number; n: number }, heading: number, list: { heading: number; km: number }[], turn: number) {
  const pts = [{ e: start.e, n: start.n }]
  let e = start.e, n = start.n, h = heading
  for (const leg of list) {
    for (let d = 0; d < leg.km - 1e-9; d += PATH_STEP_KM) {
      h += Math.max(-turn, Math.min(turn, wrap180(leg.heading - h)))
      e += Math.sin(h * RAD) * PATH_STEP_KM
      n += Math.cos(h * RAD) * PATH_STEP_KM
      pts.push({ e, n })
    }
  }
  return pts
}

/** The ground's least clearance (m) under a path of heights, from its `fromKm` on (its points every `PATH_STEP_KM`). */
function clearanceOf(pts: { e: number; n: number }[], up: (i: number) => number, terrain: FlightTerrain, fromIdx: number): number {
  let least = Infinity
  for (let i = fromIdx; i < pts.length; i++) {
    const g = terrain.heightAt(pts[i].e, pts[i].n)
    if (g !== null) least = Math.min(least, up(i) - g)
  }
  return least
}

export interface FieldGeometry {
  airport: Airport
  /** The field (km east, north of the eye). */
  ae: number
  an: number
  /** The runway heading in use (deg true): the landing and take-off direction. */
  heading: number
}

/**
 * An arrival's path out from the threshold (outward, the threshold first; reversed it is flown): the final on its 3° glide,
 * then the first of the straight-in, a base leg (either side) or a downwind leg (either side) whose 3° descent clears the
 * ground by `CLEARANCE_M`; with none, the one that clears it most, held level over the ground ahead. Heights over the eye.
 */
export function approachPath(g: FieldGeometry, terrain: FlightTerrain, km: number): PathPt[] {
  const { airport, ae, an, heading } = g
  const light = airport.light
  const final = FINAL_KM[light ? 'light' : 'jet']
  const back = heading + 180
  const turn = light ? 20 : 10
  const leg = light ? 2 : 6
  const rest = Math.max(0, km - final)
  const candidates: { heading: number; km: number }[][] = [
    [{ heading: back, km: final }, { heading: back, km: rest }],
    ...[90, -90].map((s) => [{ heading: back, km: final }, { heading: back + s, km: rest }]),
    ...[90, -90].map((s) => [{ heading: back, km: final }, { heading: back + s, km: leg }, { heading, km: Math.max(0, rest - leg) }]),
  ]
  const finalIdx = Math.round(final / PATH_STEP_KM)
  // Over the field (m above sea level): 15 m at the threshold, 3° along the way flown.
  const glide = (i: number) => airport.elevationM + 15 + i * PATH_STEP_KM * 1000 * GLIDE
  let best: { pts: { e: number; n: number }[]; clear: number } | null = null
  for (const c of candidates) {
    const pts = legs({ e: ae, n: an }, back, c, turn)
    const clear = clearanceOf(pts, glide, terrain, finalIdx + 1)
    if (!best || clear > best.clear + 1) best = { pts, clear }
    if (clear >= CLEARANCE_M) { best = { pts, clear }; break }
  }
  const pts = best!.pts
  // Outside the final, never under the ground ahead (toward the field) plus the clearance: held level over a rise.
  const z = pts.map((_, i) => glide(i))
  let floor = -Infinity
  for (let i = finalIdx + 1; i < pts.length; i++) {
    const ground = terrain.heightAt(pts[i].e, pts[i].n)
    if (ground !== null) floor = Math.max(floor, ground + CLEARANCE_M)
    z[i] = Math.max(z[i], floor)
  }
  return pts.map((p, i) => ({ e: p.e, n: p.n, up: z[i] - terrain.eyeM }))
}

/**
 * A departure's path from the runway (the take-off end first, as flown): straight out along the runway heading climbing
 * ~5° (a light plane ~3°), then a turn toward its route; of the routes nearest its seeded way (±30°, ±60°, …), the first
 * whose climb clears the ground by `CLEARANCE_M` after the turn and keeps `EYE_KEEP_KM` from the eye (else of the clear
 * ones the farthest from it; with none clear, the clearest).
 * Heights over the eye.
 */
export function departurePath(g: FieldGeometry, terrain: FlightTerrain, km: number, routeDeg: number): PathPt[] {
  const { airport, ae, an, heading } = g
  const light = airport.light
  const slope = Math.tan((light ? 3 : 5) * RAD)
  const out = CLIMB_OUT_KM[light ? 'light' : 'jet']
  const turn = light ? 20 : 10
  const climb = (i: number) => airport.elevationM + 15 + i * PATH_STEP_KM * 1000 * slope
  const outIdx = Math.round(out / PATH_STEP_KM)
  let best: { pts: { e: number; n: number }[]; clear: number } | null = null
  // Of the routes that clear the ground, the first that keeps its distance from the eye (a route that turns back close past
  // the eye sweeps across its sky faster than a minute's step can follow), else the one that keeps the most; with none
  // clear, the clearest.
  let kept: { pts: { e: number; n: number }[]; clear: number; eyeKm: number } | null = null
  for (const off of [0, 30, -30, 60, -60, 90, -90, 120, -120, 180]) {
    const pts = legs({ e: ae, n: an }, heading, [{ heading, km: out }, { heading: routeDeg + off, km: Math.max(0, km - out) }], turn)
    const clear = clearanceOf(pts, climb, terrain, outIdx + 1)
    if (!best || clear > best.clear + 1) best = { pts, clear }
    if (clear < CLEARANCE_M) continue
    const eyeKm = Math.min(...pts.slice(outIdx + 1).map((p) => Math.hypot(p.e, p.n)))
    if (!kept || eyeKm > kept.eyeKm + 0.1) kept = { pts, clear, eyeKm }
    if (eyeKm >= EYE_KEEP_KM) break
  }
  if (kept) best = kept
  return best!.pts.map((p, i) => ({ e: p.e, n: p.n, up: climb(i) - terrain.eyeM }))
}
