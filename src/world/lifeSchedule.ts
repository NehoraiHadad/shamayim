import { hashId, seeded } from '../data/landmarks/hash'
import { wrap180, xOf, type Camera } from '../domain/camera'
import type { LocalTime } from '../domain/types'
import { AIRPORTS, enuKm, runwayInUse } from './airports'
import { contrailAir, cruiseClimate } from './contrails'
import { approachPath, departurePath, FLIGHT, heightsOver, PATH_STEP_KM, trackPoint, wayOf, type FlockTrack, type PathPt } from './flightPaths'
import { curveDrop, flatTerrain, type FlightTerrain } from './flightTerrain'
import {
  birdScores, CRUISE_M, dayOfYear, headingOf, METEOR_FLASH_S, meteorLook, meteorsOf, PREVALENCE, SHAPES, trailLight,
  type Aircraft, type BirdKind, type Flock, type HighPlane, type LifeInput, type LowPlane, type MeteorFlash, type SkyLife,
} from './life'
import { flockAhead, highAhead, lowAhead, trailAhead, trailPuffSeed } from './lifeAhead'
import { smoothstep } from './ridgeLighting'
import { apparentAltitude } from './skyProjection'

/*
 * The sky's life as a continuous process in time (the owner's report of 2026-11-20: birds and planes popped in and out as
 * the hour was scrubbed, each hour drawing its own). One rule for every kind: for each place and day a deterministic
 * schedule of events is drawn once, from a seeded process whose rate follows the kind's likelihood over the day (the
 * season, the hour, the weather, the thermals, the flyway, the airports; `life.ts`). Each event has a start, a duration and
 * a path in space over the real land (`flightPaths.ts`: a flock's track at its kind's height over the ground, an airliner's
 * straight crossing at cruise, an airport movement's approach or departure), so at any minute the sky holds exactly the events
 * under way, each where its path has brought it. Every path begins and ends either beyond the frame or far away (where the
 * object has shrunk and faded into the air's haze), so nothing appears or vanishes in the open sky; a scrub moves each
 * object continuously along its path, and a jump of hours shows what is up at the new time. The gates (rain, storm, gusts,
 * night) ramp the rate: an event already in the air flies on. Each flock's height is picked so its pass reads clearly
 * against the land as drawn (`unclear`), and at a minute each object says whether the land truly stands in its line of
 * sight (`blockedKm`), which the scene obeys.
 */

const RAD = Math.PI / 180
const DAY_S = 86_400
/** The day is sampled every this many minutes for the rates (each kind's likelihood, the air at cruise, the traffic). */
export const SAMPLE_MIN = 10
const SAMPLES = (24 * 60) / SAMPLE_MIN + 1

/**
 * Az/alt (deg) of a point east `e`, north `n` (km) and `upM` above the eye as the land is seen (the Earth's curve and the
 * terrestrial refraction the panorama measures its ridges with): what flies near the land is compared with the land on
 * one footing (`flightTerrain.ts` `blockedKm`).
 */
export function airDirection(e: number, n: number, upM: number): { azimuth: number; altitude: number; km: number } {
  const km = Math.hypot(e, n)
  const altitude = Math.atan2(upM - curveDrop(km), km * 1000) / RAD
  return { azimuth: ((Math.atan2(e, n) / RAD) % 360 + 360) % 360, altitude, km: Math.hypot(km, upM / 1000) }
}

/** Az/alt (deg) of a point east `e`, north `n` (km) and `upM` above the eye: the Earth's curve and refraction counted. */
export function skyDirection(e: number, n: number, upM: number): { azimuth: number; altitude: number; km: number } {
  const km = Math.hypot(e, n)
  // The curve's drop (m) over the distance, less the seventh refraction gives back.
  const drop = ((km * 1000) ** 2 / (2 * 6_371_000)) * (1 - 0.13)
  const altitude = Math.atan2(upM - drop, km * 1000) / RAD
  return { azimuth: ((Math.atan2(e, n) / RAD) % 360 + 360) % 360, altitude: apparentAltitude(altitude), km: Math.hypot(km, upM / 1000) }
}

/**
 * How a flock moves as a group over its session: `speedMs` is its real ground speed as it passes across the sky (the
 * composite loop adds each bird's wing beats and wheeling round its place), and `reach` is how many times its closest
 * distance it is when the session begins and ends, far enough to have shrunk and faded into the haze.
 */
export const GROUP: Record<BirdKind, { speedMs: number; reach: number }> = {
  stork: { speedMs: 10, reach: 4 },
  crane: { speedMs: 15, reach: 4 },
  swift: { speedMs: 10, reach: 6 },
  gull: { speedMs: 9, reach: 6 },
  raptor: { speedMs: 2, reach: 5 },
  crow: { speedMs: 11, reach: 6 },
  pigeon: { speedMs: 14, reach: 6 },
  bat: { speedMs: 6, reach: 5 },
}

/** The most flocks under way at once (a new one does not start while this many fly). */
export const MAX_FLOCKS = 3
/** The most persistent contrails at once (live or old). */
export const MAX_TRAILS = 4
/** An airliner's crossing begins and ends this far off (km, over the ground): far past the haze. */
const CRUISE_REACH_KM = 150
/** Airliners crossing the sky in view an hour, at most (the busiest air, the surest trails). */
const CRUISE_RATE = 3.2
/** A contrail's emission is sampled every this many seconds (each sample a puff of the trail, aging on its own). */
export const TRAIL_STEP_S = 20
/** The meteors drawn at a minute are those of the next this many seconds, each at its own moment of the composite loop. */
export const METEOR_WINDOW_S = 900
/** The share of the sky a meteor seen over the scene falls in (the dome over the land). */
const SKY_SHARE = 0.3

export interface FlockEvent {
  id: string
  kind: BirdKind
  t0: number
  t1: number
  count: number
  score: number
  /** Its way over the ground (`flightPaths.ts`): every `ds` m in flight order (m east, north of the eye; m above sea level). */
  track: FlockTrack
  /** The eye's height (m above sea level) the track is measured from. */
  eyeM: number
  /** The way it set out on (its flyway's, its wander's) and its speed over the ground (m/s). */
  headingDeg: number
  speedMs: number
  /** Its closest distance (m, 3D) and where the session begins and ends (m over the ground). */
  nearM: number
  endM: number
  seed: number
}

export interface HighEvent {
  id: string
  t0: number
  /** The plane is gone (beyond the reach) at `t1`; its trail lives `lifeS` after each puff is laid. */
  t1: number
  lifeS: number
  /** The closest point (km), heading, speed (m/s), height over the eye (m). */
  cE: number
  cN: number
  headingDeg: number
  speedMs: number
  upM: number
  persists: boolean
  /** A short trail (non-persisting air): its length behind the plane (km). */
  shortKm: number
  /** Width (m) a persistent trail has spread to by the end of its life. */
  spreadM: number
  /** The upper wind it drifts with (km/s east, north). */
  driftE: number
  driftN: number
  seed: number
}

export interface LowEvent {
  id: string
  airport: string
  kind: 'arrive' | 'depart'
  light: boolean
  t0: number
  t1: number
  /** Its path in flight order, every 0.5 km (km east and north of the eye, m above the eye; `flightPaths.ts`). */
  path: { e: number; n: number; up: number }[]
  speedMs: number
  seed: number
}

export type MeteorEvent = Omit<MeteorFlash, 'inS'> & { t: number }

/** One day's life at a place: every event that starts that day (local seconds from its midnight). */
export interface LifeSchedule {
  date: string
  flocks: FlockEvent[]
  high: HighEvent[]
  low: LowEvent[]
  meteors: MeteorEvent[]
}

export interface ScheduleContext {
  placeId: string
  date: string
  camera: Camera
  lat: number
  lon: number
  /** The land the life flies over and is seen against; absent, flat ground at the place (the rules' tests). */
  flight?: FlightContext
}

/** The land under and in front of the sky's life: its true ground and sight lines, and the land as the scene draws it. */
export interface FlightContext {
  terrain: FlightTerrain
  /** The lowest altitude (deg) over the drawn land in a direction (its top: the land and what stands on it). */
  drawnTop: (azimuth: number) => number
  /** The drawn near land's distance (km) in a direction. */
  nearKm: (azimuth: number) => number
}

const pad = (n: number) => String(n).padStart(2, '0')
/** The local time `minute` minutes into `date` (held at 23:59). */
export const timeOfDay = (date: string, minute: number): LocalTime => {
  const m = Math.max(0, Math.min(24 * 60 - 1, Math.round(minute)))
  return `${date}T${pad(Math.floor(m / 60))}:${pad(m % 60)}`
}
/** The date before (YYYY-MM-DD). */
export function dayBefore(date: string): string {
  const d = new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)) - 1))
  return d.toISOString().slice(0, 10)
}
/** Seconds since local midnight of a local time. */
export const secondsOf = (at: LocalTime) => (Number(at.slice(11, 13)) * 60 + Number(at.slice(14, 16))) * 60

/** A value sampled every `SAMPLE_MIN` minutes, read at `t` seconds, straight between the samples (the rates ramp). */
function readAt(values: ArrayLike<number>, t: number): number {
  const f = Math.max(0, Math.min(values.length - 1, t / (SAMPLE_MIN * 60)))
  const i = Math.floor(f), j = Math.min(values.length - 1, i + 1)
  return values[i] + (values[j] - values[i]) * (f - i)
}

/**
 * Arrival times (s of the day) of a process whose rate is `maxPerHour × accept(t)` (thinning: candidates at the top rate,
 * each kept with its share). Seeded: the same place and day give the same times.
 */
function arrivals(seed: number, maxPerHour: number, accept: (t: number) => number): number[] {
  const out: number[] = []
  if (!(maxPerHour > 0)) return out
  const r = seeded(seed)
  const mean = 3600 / maxPerHour
  for (let t = -Math.log(1 - r()) * mean; t < DAY_S; t += -Math.log(1 - r()) * mean) if (r() < accept(t)) out.push(t)
  return out
}

/** Keeps events (sorted by start) so that no more than `max` are under way at once: a newcomer waits out a full sky. */
function capped<E extends { t0: number }>(events: E[], end: (e: E) => number, max: number): E[] {
  const kept: E[] = []
  for (const e of [...events].sort((a, b) => a.t0 - b.t0)) {
    if (kept.filter((k) => end(k) > e.t0).length < max) kept.push(e)
  }
  return kept
}

/** The lowest altitude (deg) a bird or plane is raised to over a line in px, by bisection of a monotone `altY`. */
export function altitudeOver(lineY: number, altY: (altitude: number) => number): number {
  let lo = -5, hi = 85
  if (altY(lo) <= lineY) return lo
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (altY(mid) <= lineY) hi = mid
    else lo = mid
  }
  return hi
}

/**
 * The day's schedule of life at a place (pure, seeded by the place and the day): `inputAt` gives the world's life input at
 * a moment of the day (the weather of its hour, the sun at that moment). Built once per place, day and world key.
 */
export function lifeSchedule(ctx: ScheduleContext, inputAt: (at: LocalTime) => LifeInput): LifeSchedule {
  const { date, placeId, camera } = ctx
  const inputs = Array.from({ length: SAMPLES }, (_, i) => inputAt(timeOfDay(date, i * SAMPLE_MIN)))
  const sampleAt = (t: number) => inputs[Math.max(0, Math.min(SAMPLES - 1, Math.round(t / (SAMPLE_MIN * 60))))]
  const seedOf = (part: string) => hashId(`${placeId}:life:${date}:${part}`)
  return {
    date,
    flocks: flockEvents(ctx, inputs, sampleAt, seedOf),
    high: highEvents(ctx, inputs, sampleAt, seedOf, camera),
    low: lowEvents(ctx, inputs, sampleAt, seedOf),
    meteors: meteorEvents(inputs, seedOf),
  }
}

function flockEvents(ctx: ScheduleContext, inputs: LifeInput[], sampleAt: (t: number) => LifeInput, seedOf: (p: string) => number): FlockEvent[] {
  const scores = inputs.map(birdScores)
  const terrain = ctx.flight?.terrain ?? flatTerrain(inputs[0]?.groundM ?? 0)
  // Every kind's candidate sessions, in time order; each is laid on its track only once the sky has room for it.
  const candidates: { kind: BirdKind; i: number; t0: number; score: number }[] = []
  for (const kind of Object.keys(PREVALENCE) as BirdKind[]) {
    const s = SHAPES[kind], g = GROUP[kind]
    const series = Float64Array.from(scores, (sc) => (sc[kind] > 0.05 ? sc[kind] : 0))
    if (!series.some((v) => v > 0)) continue
    // The rate: as many sessions an hour as keep the kind in view its likelihood × prevalence of the time.
    const nearMean = (s.distanceM[0] + s.distanceM[1]) / 2
    const sessionS = (2 * nearMean * Math.sqrt(g.reach ** 2 - 1)) / g.speedMs
    const maxPerHour = (PREVALENCE[kind] * 3600) / sessionS
    arrivals(seedOf(`flock:${kind}`), maxPerHour, (t) => readAt(series, t)).forEach((t0, i) => candidates.push({ kind, i, t0, score: readAt(series, t0) }))
  }
  candidates.sort((a, b) => a.t0 - b.t0 || (a.kind < b.kind ? -1 : 1))
  const kept: FlockEvent[] = []
  for (const { kind, i, t0, score } of candidates) {
    // At most a few flocks at once: a newcomer waits out a full sky.
    if (kept.filter((k) => k.t1 > t0).length >= MAX_FLOCKS) continue
    const s = SHAPES[kind], g = GROUP[kind], fl = FLIGHT[kind]
    const input = sampleAt(t0)
    const seed = seedOf(`flock:${kind}:${i}`)
    const q = seeded(seed)
    const count = Math.max(1, Math.round(s.count[0] + (s.count[1] - s.count[0]) * q() * (0.5 + 0.5 * score)))
    const nearM = s.distanceM[0] + (s.distanceM[1] - s.distanceM[0]) * q()
    const headingDeg = headingOf(kind, input, q)
    // Its closest point is square to its way, on the side nearer the view's heading, so the pass is seen.
    const a = headingDeg + 90, b = headingDeg - 90
    const azC = Math.abs(wrap180(a - ctx.camera.heading)) <= Math.abs(wrap180(b - ctx.camera.heading)) ? a : b
    const aglQ = q()
    const speedMs = (kind === 'raptor' ? 2 + 0.6 * Math.min(8, input.wind.ms) : g.speedMs) * (0.85 + 0.3 * q())
    const endM = nearM * g.reach
    const cE = nearM * Math.sin(azC * RAD), cN = nearM * Math.cos(azC * RAD)
    const home = homeOf(kind, input, endM)
    // Its height over the ground: drawn in its kind's band, then raised while that reads more clearly
    // against the land (`unclear`): the schedule picks the track that is plainly in the sky, in front of the land, or
    // behind it, over one that skims the land's edge or would seem to fly into a slope.
    // (Its way over the ground is laid once, at the height drawn; each raise only lays its altitude again.)
    let best: { track: FlockTrack; bad: number } | null = null
    const aglOf = (k: number) => fl.agl[0] * 1.3 + (fl.agl[1] - fl.agl[0] * 1.3) * Math.min(1, aglQ + k / 3)
    const way = wayOf({ cE, cN, headingDeg, endM, aglM: aglOf(0), flight: fl, home }, terrain)
    for (let k = 0; k < 4; k++) {
      const track = heightsOver(way, aglOf(k), fl, terrain.eyeM)
      const bad = ctx.flight ? unclear(track, terrain, endM, ctx.flight, ctx.camera) : 0
      if (!best || bad < best.bad) best = { track, bad }
      if (bad === 0) break
    }
    const track = best!.track
    const dur = ((track.pts.length / 3 - 1) * track.ds) / speedMs
    kept.push({ id: `${ctx.date}:${kind}:${i}`, kind, t0, t1: t0 + dur, count, score, track, eyeM: terrain.eyeM, headingDeg, speedMs,
      nearM: track.nearM, endM, seed })
  }
  return kept
}

/**
 * A resident's home away from the place (m east, north of the eye) and how far it strays from it: a shore bird keeps to its
 * water. The place's own residents (crows and pigeons over its streets, raptors over its open land) need none: their
 * session ends within its reach of the place (`GROUP.reach` × their closest distance, a kilometre or two).
 */
function homeOf(kind: BirdKind, input: LifeInput, endM: number): { e: number; n: number; r: number } | undefined {
  if (kind === 'gull') {
    const env = input.env
    const sea = env.seaKm !== null && env.seaAz != null ? { km: env.seaKm, az: env.seaAz } : null
    const lake = env.lakeKm !== null && env.lakeAz != null ? { km: env.lakeKm, az: env.lakeAz } : null
    const water = sea && (!lake || sea.km <= lake.km) ? sea : lake
    if (water) {
      const d = (water.km + 0.5) * 1000
      return { e: d * Math.sin(water.az * RAD), n: d * Math.cos(water.az * RAD), r: Math.max(1500, 0.8 * endM) }
    }
  }
  return undefined
}

/** Within this many degrees of the drawn land's top, an object reads as neither in the sky nor behind the land. */
const EDGE_DEG = 0.3

/**
 * How unclearly a track reads against the land, over the part of it in the frame and not yet faded (a count of its
 * samples): drawn over the land while the land truly hides it; hidden inside land the scene draws behind it (it would seem
 * to fly into a slope); drawn in front of land that is truly nearer; skimming the land's edge (a third each); and hidden
 * at its closest (the pass is meant to be seen).
 */
export function unclear(track: FlockTrack, terrain: FlightTerrain, endM: number, flight: FlightContext, camera: ScheduleContext['camera']): number {
  const count = track.pts.length / 3
  const step = Math.max(1, Math.floor(count / 48))
  let bad = 0
  const judge = (i: number, closest: boolean) => {
    const e = track.pts[3 * i] / 1000, n = track.pts[3 * i + 1] / 1000, up = track.pts[3 * i + 2] - terrain.eyeM
    const ground = Math.hypot(e, n) * 1000
    if (!closest && 1 - smoothstep(0.55 * endM, endM, ground) < 0.15) return
    const dir = airDirection(e, n, up)
    const x = xOf(dir.azimuth, camera)
    if (x < -20 || x > camera.width + 20) return
    const blocked = terrain.blockedKm(e, n, up) !== null
    const gap = dir.altitude - flight.drawnTop(dir.azimuth)
    const near = flight.nearKm(dir.azimuth)
    if (closest) { if (blocked) bad += 5; return }
    if (blocked && gap > EDGE_DEG) bad += 1
    else if (blocked && dir.km < near) bad += 1
    else if (!blocked && gap < -EDGE_DEG && dir.km >= near) bad += 1
    else if (Math.abs(gap) <= EDGE_DEG) bad += 0.3
  }
  for (let i = 0; i < count; i += step) judge(i, false)
  judge(track.nearIdx, true)
  return bad
}

/** The air at cruise at a moment (the forecast's 250 hPa, else the climate's guess) and what it makes of trails. */
function cruiseOf(input: LifeInput) {
  const given = input.hour?.cruise ?? null
  const air = given ?? cruiseClimate(dayOfYear(input.at), input.covers.high)
  return { ...contrailAir(air.temperature, air.humidity), ...air, source: given ? 'forecast' as const : 'climate' as const }
}

/** How much of an airliner shows (0–1): its trail in the sun's light, not through a deck of low or mid cloud. */
const cruiseSeen = (input: LifeInput) =>
  trailLight(input.sun.altitude) * (1 - smoothstep(0.55, 0.85, 1 - (1 - input.covers.low) * (1 - input.covers.mid)))

function highEvents(ctx: ScheduleContext, inputs: LifeInput[], sampleAt: (t: number) => LifeInput, seedOf: (p: string) => number,
  camera: Camera): HighEvent[] {
  // The rate of crossings seen: by how surely the air makes trails (its margin under the Schmidt–Appleman threshold).
  const rate = Float64Array.from(inputs, (input) => {
    const sa = cruiseOf(input)
    return sa.forms ? ((1.2 + 2 * smoothstep(1, 8, sa.margin)) * cruiseSeen(input)) / CRUISE_RATE : 0
  })
  const events = arrivals(seedOf('high'), CRUISE_RATE, (t) => readAt(rate, t)).map((t0, i): HighEvent => {
    const input = sampleAt(t0)
    const sa = cruiseOf(input)
    const seed = seedOf(`high:${i}`)
    const r = seeded(seed)
    // Its closest approach (km over the ground), ahead in the view's half; its way square to that.
    const side = 15 + 45 * r()
    const azC = camera.heading + (r() - 0.5) * 160
    const headingDeg = azC + (r() < 0.5 ? 90 : -90) + (r() - 0.5) * 10
    const L = Math.sqrt(CRUISE_REACH_KM ** 2 - side ** 2)
    const speedMs = 220 + 25 * r()
    const persists = sa.persists
    const shortKm = 0.6 + Math.min(4, sa.margin / 3) * (0.6 + 0.4 * r())
    const lifeS = persists ? 60 * (18 + 30 * r()) : shortKm * 1000 / speedMs
    // The upper wind: the shown hour's at cruise level (300 hPa where the forecast has it), else the surface's turned.
    const wind = input.highWind ?? { towardDeg: input.wind.towardDeg, ms: input.wind.ms * 3 }
    return {
      id: `${ctx.date}:high:${i}`, t0, t1: t0 + (2 * L * 1000) / speedMs, lifeS, cE: side * Math.sin(azC * RAD), cN: side * Math.cos(azC * RAD),
      headingDeg, speedMs, upM: CRUISE_M - 300 * r() - input.groundM, persists, shortKm, spreadM: persists ? 1400 + 2200 * r() : 60,
      driftE: (wind.ms / 1000) * Math.sin(wind.towardDeg * RAD), driftN: (wind.ms / 1000) * Math.cos(wind.towardDeg * RAD), seed,
    }
  })
  // At most a few persistent trails at once: a newcomer with a trail waits while the sky is full of them.
  const trails = capped(events.filter((e) => e.persists), (e) => e.t1 + e.lifeS, MAX_TRAILS)
  return [...trails, ...events.filter((e) => !e.persists)].sort((a, b) => a.t0 - b.t0)
}

/** Out to this far (km) from the field a movement is followed: an arrival comes in from it, a departure climbs out to it. */
const PATH_KM = { jet: 50, light: 25 }

/** The airport routes laid over each land (a path is the same every day of a place). */
const ROUTES = new WeakMap<FlightTerrain, Map<string, PathPt[] | null>>()

function lowEvents(ctx: ScheduleContext, inputs: LifeInput[], sampleAt: (t: number) => LifeInput, seedOf: (p: string) => number): LowEvent[] {
  const first = inputs[0]
  const terrain = ctx.flight?.terrain ?? flatTerrain(first.groundM)
  const out: LowEvent[] = []
  for (const airport of AIRPORTS) {
    const { e: ae, n: an } = enuKm(first, airport)
    if (Math.hypot(ae, an) > airport.reachKm + 20) continue
    const top = Math.max(airport.perHour.day, airport.perHour.night) / 2
    if (top <= 0) continue
    // The movements an hour by day and by night (blended through the twilight); under a low deck the traffic is in the cloud.
    const rate = Float64Array.from(inputs, (input) => {
      const night = smoothstep(0.3, 0.7, input.dark)
      const perHour = airport.perHour.day + (airport.perHour.night - airport.perHour.day) * night
      return ((perHour / 2) * (1 - smoothstep(0.75, 0.92, input.covers.low))) / top
    })
    const km = PATH_KM[airport.light ? 'light' : 'jet']
    const speeds = { arrive: airport.light ? 45 : 75, depart: airport.light ? 45 : 95 }
    // Each runway's approach laid once; each departure's route (one of six ways, by its seed) once per runway: kept with the
    // land, for every day.
    let routes = ROUTES.get(terrain)
    if (!routes) ROUTES.set(terrain, routes = new Map())
    for (const kind of ['arrive', 'depart'] as const) {
      arrivals(seedOf(`${airport.icao}:${kind}`), top, (t) => readAt(rate, t)).forEach((t0, i) => {
        const input = sampleAt(t0)
        const seed = seedOf(`${airport.icao}:${kind}:${i}`)
        // On the runway the wind picks at its start, down (or up) its path.
        const heading = runwayInUse(airport, input.wind.fromDeg, input.wind.ms)
        const way = kind === 'depart' ? Math.floor(seeded(seed)() * 6) * 60 : 0
        const key = `${airport.icao}:${kind}:${heading}:${way}:${km}:${ae.toFixed(3)}:${an.toFixed(3)}`
        if (!routes!.has(key)) {
          const field = { airport, ae, an, heading }
          const path = kind === 'arrive' ? approachPath(field, terrain, km).reverse() : departurePath(field, terrain, km, way)
          routes!.set(key, path.some((p) => Math.hypot(p.e, p.n) <= airport.reachKm) ? path : null)
        }
        const path = routes!.get(key)
        if (!path) return
        const lengthKm = (path.length - 1) * PATH_STEP_KM
        out.push({ id: `${input.at.slice(0, 10)}:${airport.icao}:${kind}:${i}`, airport: airport.icao, kind, light: airport.light, t0,
          t1: t0 + (lengthKm * 1000) / speeds[kind], path, speedMs: speeds[kind], seed })
      })
    }
  }
  return out.sort((a, b) => a.t0 - b.t0)
}

function meteorEvents(inputs: LifeInput[], seedOf: (p: string) => number): MeteorEvent[] {
  const rate = Float64Array.from(inputs, (input) => (meteorsOf(input)?.perHour ?? 0) * SKY_SHARE)
  const top = Math.max(0, ...rate)
  if (top <= 0) return []
  const date = inputs[0].at.slice(0, 10)
  return arrivals(seedOf('meteors'), top, (t) => readAt(rate, t) / top).map((t, i) => ({
    id: `${date}:meteor:${i}`, t, seed: seedOf(`meteor:${i}`),
    ...meteorLook({ ...inputs[0], at: timeOfDay(date, Math.floor(t / 60)) }, t % 60),
  }))
}

/* Evaluation at a moment. */

/** What the life asks of the land at a moment: whether it truly stands in a point's line of sight (km over the ground). */
export type SightOf = (e: number, n: number, upM: number) => number | null

/**
 * A flock under way at `t` (s of its day): where its centre is on its track, how near, how faded by distance, and whether
 * the land truly stands between it and the eye.
 */
export function flockAt(e: FlockEvent, t: number, sight?: SightOf): Flock {
  const p = trackPoint(e.track, e.speedMs * (t - e.t0))
  const up = p.z - e.eyeM
  const dir = airDirection(p.e / 1000, p.n / 1000, up)
  const ground = Math.hypot(p.e, p.n)
  return {
    id: e.id, kind: e.kind, count: e.count, score: e.score, seed: e.seed, azimuth: dir.azimuth, altitude: dir.altitude, distanceM: dir.km * 1000,
    nearM: e.nearM, fade: 1 - smoothstep(0.55 * e.endM, e.endM, ground), headingDeg: p.headingDeg, speedMs: e.speedMs,
    at: { e: p.e / 1000, n: p.n / 1000, up }, blockedKm: sight ? sight(p.e / 1000, p.n / 1000, up) : null,
  }
}

/** Where an airliner's track puts it `dt` s after its closest approach (km east, north of the eye). */
const highPoint = (e: HighEvent, tt: number) => {
  const s = (e.speedMs * (tt - (e.t0 + e.t1) / 2)) / 1000
  const h = e.headingDeg * RAD
  return { e: e.cE + s * Math.sin(h), n: e.cN + s * Math.cos(h) }
}

/**
 * An airliner and its contrail at `t`: the plane while it is on its crossing, and each puff of its trail where the upper
 * wind has carried it since it was laid, aging (spreading, fading) by its own age; past its life a puff is gone.
 */
export function highAt(e: HighEvent, t: number): HighPlane {
  const flying = t <= e.t1
  const head = Math.min(t, e.t1)
  const plane = flying ? highPoint(e, t) : null
  const trail: HighPlane['trail'] = []
  if (e.persists) {
    const from = Math.max(e.t0, t - e.lifeS)
    const puff = (tau: number, liveTip?: true) => {
      const p = highPoint(e, tau)
      const age = t - tau
      const E = p.e + e.driftE * age, N = p.n + e.driftN * age
      trail.push({ e: E, n: N, up: e.upM, ageS: age, liveTip, seed: trailPuffSeed(e.id, tau) })
    }
    // On a fixed grid of emission moments, so each puff keeps its own place and shape from frame to frame.
    for (let tau = Math.ceil(from / TRAIL_STEP_S) * TRAIL_STEP_S; tau < head; tau += TRAIL_STEP_S) puff(tau)
    if (head > from) puff(head, head < e.t1 && head % TRAIL_STEP_S !== 0 ? true : undefined)
  }
  const crossing = { start: { ...highPoint(e, e.t0), up: e.upM }, centre: { e: e.cE, n: e.cN, up: e.upM },
    end: { ...highPoint(e, e.t1), up: e.upM } }
  return { id: e.id, plane: plane && { ...plane, up: e.upM }, crossing, headingDeg: e.headingDeg, speedMs: e.speedMs, persists: e.persists,
    shortKm: e.shortKm, lifeS: e.lifeS, spreadM: e.spreadM, trail, trailEndInS: e.t1 - t, seed: e.seed, driftE: e.driftE, driftN: e.driftN }
}

/** A point along a polyline every 0.5 km, `km` from its start. */
function along(path: LowEvent['path'], km: number) {
  const f = Math.max(0, Math.min(path.length - 1, km / 0.5))
  const i = Math.min(path.length - 2, Math.floor(f)), k = f - i
  const a = path[i], b = path[i + 1]
  return { e: a.e + (b.e - a.e) * k, n: a.n + (b.n - a.n) * k, up: a.up + (b.up - a.up) * k }
}

/** A movement at `t`: where it is on its path, and a little ahead (its way on the sky). */
export function lowAt(e: LowEvent, t: number, sight?: SightOf): LowPlane {
  const km = (e.speedMs * (t - e.t0)) / 1000
  const length = (e.path.length - 1) * 0.5
  const at = along(e.path, km)
  return { id: e.id, airport: e.airport, kind: e.kind, light: e.light, speedMs: e.speedMs, seed: e.seed, at,
    ahead: along(e.path, km + 0.5), fieldKm: e.kind === 'arrive' ? length - km : km, pathKm: length,
    overFieldM: at.up - (e.kind === 'arrive' ? e.path.at(-1)! : e.path[0]).up, blockedKm: sight ? sight(at.e, at.n, at.up) : null }
}

/**
 * The sky's life at a moment: the events of its day and of the day before (those still under way past midnight) at their
 * places on their paths. `t` is seconds since the shown day's midnight; `input` the world's life input at the moment.
 */
export function lifeAt(days: { schedule: LifeSchedule; offsetS: number }[], t: number, input: LifeInput, sight?: SightOf): SkyLife {
  const birds: Flock[] = [], high: HighPlane[] = [], low: LowPlane[] = [], flashes: MeteorFlash[] = []
  for (const { schedule, offsetS } of days) {
    const tt = t - offsetS
    for (const e of schedule.flocks) if (e.t0 <= tt && tt <= e.t1) {
      const flock = flockAt(e, tt, sight)
      flock.samples = flockAhead(tt, e.t1, flock, (tau) => flockAt(e, tau))
      birds.push(flock)
    }
    for (const e of schedule.high) if (e.t0 <= tt && tt <= e.t1 + e.lifeS) {
      const plane = highAt(e, tt)
      const at = (tau: number) => ({ ...highPoint(e, tau), up: e.upM })
      plane.samples = highAhead(tt, e.t1, plane.plane, at)
      if (plane.persists) plane.futureTrail = trailAhead(plane, tt, e.t1, TRAIL_STEP_S, at)
      high.push(plane)
    }
    for (const e of schedule.low) if (e.t0 <= tt && tt <= e.t1) {
      const plane = lowAt(e, tt, sight)
      plane.samples = lowAhead(tt, e.t1, plane, (tau) => lowAt(e, tau))
      low.push(plane)
    }
    for (const { t: strike, ...look } of schedule.meteors) if (strike + METEOR_FLASH_S > tt && strike < tt + METEOR_WINDOW_S) {
      flashes.push({ ...look, inS: strike - tt })
    }
  }
  const aircraft: Aircraft = { cruise: cruiseOf(input), high, low }
  const shower = meteorsOf(input)
  return { birds, aircraft, meteors: shower && flashes.length ? { ...shower, flashes } : null }
}

/** The life of a single input's day at its own moment (the rules' tests: one fixed hour held all day). */
export function lifeOfInput(input: LifeInput, flight?: FlightContext): SkyLife {
  const date = input.at.slice(0, 10)
  const ctx = { placeId: input.placeId, date, camera: input.camera, lat: input.lat, lon: input.lon, flight }
  const today = lifeSchedule(ctx, (at) => ({ ...input, at }))
  const before = lifeSchedule({ ...ctx, date: dayBefore(date) }, (at) => ({ ...input, at }))
  return lifeAt([{ schedule: before, offsetS: -DAY_S }, { schedule: today, offsetS: 0 }], secondsOf(input.at), input, flight?.terrain.blockedKm)
}

/** The flocks under way at an input's moment, its hour's weather held all day (the rules' tests). */
export const birdsOf = (input: LifeInput) => lifeOfInput(input).birds

