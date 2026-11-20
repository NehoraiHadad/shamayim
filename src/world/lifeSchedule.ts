import { hashId, seeded } from '../data/landmarks/hash'
import { wrap180, type Camera } from '../domain/camera'
import type { LocalTime } from '../domain/types'
import { AIRPORTS, enuKm, runwayInUse } from './airports'
import { contrailAir, cruiseClimate } from './contrails'
import {
  birdScores, CRUISE_M, dayOfYear, headingOf, lowPlanesOf, meteorsOf, PREVALENCE, SHAPES, trailLight,
  type Aircraft, type BirdKind, type Flock, type HighPlane, type LifeInput, type LowPlane, type LowRoute, type MeteorFlash, type SkyLife,
} from './life'
import { smoothstep } from './ridgeLighting'
import { apparentAltitude } from './skyProjection'

/*
 * The sky's life as a continuous process in time (the owner's report of 2026-11-20: birds and planes popped in and out as
 * the hour was scrubbed, each hour drawing its own). One rule for every kind: for each place and day a deterministic
 * schedule of events is drawn once, from a seeded process whose rate follows the kind's likelihood over the day (the
 * season, the hour, the weather, the thermals, the flyway, the airports; `life.ts`). Each event has a start, a duration and
 * a straight path in space (km east and north of the eye, a height), so at any minute the sky holds exactly the events
 * under way, each where its path has brought it. Every path begins and ends either beyond the frame or far away (where the
 * object has shrunk and faded into the air's haze), so nothing appears or vanishes in the open sky; a scrub moves each
 * object continuously along its path, and a jump of hours shows what is up at the new time. The gates (rain, storm, gusts,
 * night) ramp the rate: an event already in the air flies on.
 */

const RAD = Math.PI / 180
const DAY_S = 86_400
/** The day is sampled every this many minutes for the rates (each kind's likelihood, the air at cruise, the traffic). */
export const SAMPLE_MIN = 10
const SAMPLES = (24 * 60) / SAMPLE_MIN + 1

/** Az/alt (deg) of a point east `e`, north `n` (km) and `upM` above the eye: the Earth's curve and refraction counted. */
export function skyDirection(e: number, n: number, upM: number): { azimuth: number; altitude: number; km: number } {
  const km = Math.hypot(e, n)
  // The curve's drop (m) over the distance, less the seventh refraction gives back.
  const drop = ((km * 1000) ** 2 / (2 * 6_371_000)) * (1 - 0.13)
  const altitude = Math.atan2(upM - drop, km * 1000) / RAD
  return { azimuth: ((Math.atan2(e, n) / RAD) % 360 + 360) % 360, altitude: apparentAltitude(altitude), km: Math.hypot(km, upM / 1000) }
}

/**
 * How a flock moves as a group over its session (its centre's way; the birds' own wheeling, beats and loops are drawn at
 * composite time round it): `speedMs` over the ground, and `reach`, how many times its closest distance it is when the
 * session begins and ends, far enough to have shrunk and faded into the haze. Migrants pass at their true glide;
 * the residents work an area (swifts hawking, pigeons wheeling round the block, a raptor's thermal drifting downwind), so
 * their centre wanders slowly while the composite loop shows the fast motion.
 */
export const GROUP: Record<BirdKind, { speedMs: number; reach: number }> = {
  stork: { speedMs: 6, reach: 4 },
  crane: { speedMs: 10, reach: 4 },
  swift: { speedMs: 1.2, reach: 6 },
  gull: { speedMs: 1.5, reach: 6 },
  raptor: { speedMs: 2, reach: 5 },
  crow: { speedMs: 1.2, reach: 6 },
  pigeon: { speedMs: 1, reach: 6 },
  bat: { speedMs: 0.5, reach: 5 },
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
  /** The closest point of its way (m east, north of the eye), its height over the eye (m), its heading and speed. */
  cE: number
  cN: number
  upM: number
  headingDeg: number
  speedMs: number
  /** Its closest distance over the ground (m) and where the session begins and ends (m). */
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
  /** Its path in flight order, every 0.5 km (km east and north of the eye, m above it). */
  path: { e: number; n: number; up: number }[]
  speedMs: number
  seed: number
}

export interface MeteorEvent { id: string; t: number; seed: number }

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
  /**
   * The lowest altitude (deg) a flock at its closest stands at in a direction: over the drawn land there, so it passes in
   * view; it may still sink behind the land, or pass in front of it, as it comes and goes.
   */
  floorAlt?: (azimuth: number) => number
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
    low: lowEvents(inputs, sampleAt, seedOf),
    meteors: meteorEvents(inputs, seedOf),
  }
}

function flockEvents(ctx: ScheduleContext, inputs: LifeInput[], sampleAt: (t: number) => LifeInput, seedOf: (p: string) => number): FlockEvent[] {
  const scores = inputs.map(birdScores)
  const all: FlockEvent[] = []
  for (const kind of Object.keys(PREVALENCE) as BirdKind[]) {
    const s = SHAPES[kind], g = GROUP[kind]
    const series = Float64Array.from(scores, (sc) => (sc[kind] > 0.05 ? sc[kind] : 0))
    if (!series.some((v) => v > 0)) continue
    // The rate: as many sessions an hour as keep the kind in view its likelihood × prevalence of the time.
    const nearMean = (s.distanceM[0] + s.distanceM[1]) / 2
    const sessionS = (2 * nearMean * Math.sqrt(g.reach ** 2 - 1)) / g.speedMs
    const maxPerHour = (PREVALENCE[kind] * 3600) / sessionS
    arrivals(seedOf(`flock:${kind}`), maxPerHour, (t) => readAt(series, t)).forEach((t0, i) => {
      const input = sampleAt(t0)
      const score = readAt(series, t0)
      const seed = seedOf(`flock:${kind}:${i}`)
      const q = seeded(seed)
      const count = Math.max(1, Math.round(s.count[0] + (s.count[1] - s.count[0]) * q() * (0.5 + 0.5 * score)))
      const nearM = s.distanceM[0] + (s.distanceM[1] - s.distanceM[0]) * q()
      const headingDeg = headingOf(kind, input, q)
      // Its closest point is square to its way, on the side nearer the view's heading, so the pass is seen.
      const a = headingDeg + 90, b = headingDeg - 90
      const azC = Math.abs(wrap180(a - ctx.camera.heading)) <= Math.abs(wrap180(b - ctx.camera.heading)) ? a : b
      let alt = s.altitude[0] + (s.altitude[1] - s.altitude[0]) * q()
      if (ctx.floorAlt) alt = Math.min(70, Math.max(alt, ctx.floorAlt(azC) + 3))
      const speedMs = (kind === 'raptor' ? 1 + 0.35 * Math.min(8, input.wind.ms) : g.speedMs) * (0.85 + 0.3 * q())
      const endM = nearM * g.reach
      const dur = (2 * Math.sqrt(endM ** 2 - nearM ** 2)) / speedMs
      all.push({ id: `${ctx.date}:${kind}:${i}`, kind, t0, t1: t0 + dur, count, score, cE: nearM * Math.sin(azC * RAD), cN: nearM * Math.cos(azC * RAD),
        upM: nearM * Math.tan(alt * RAD), headingDeg, speedMs, nearM, endM, seed })
    })
  }
  return capped(all, (e) => e.t1, MAX_FLOCKS)
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

function lowEvents(inputs: LifeInput[], sampleAt: (t: number) => LifeInput, seedOf: (p: string) => number): LowEvent[] {
  const first = inputs[0]
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
    const routes = new Map<string, LowRoute | null>()
    for (const kind of ['arrive', 'depart'] as const) {
      arrivals(seedOf(`${airport.icao}:${kind}`), top, (t) => readAt(rate, t)).forEach((t0, i) => {
        const input = sampleAt(t0)
        // On the runway the wind picks at its start, down (or up) its path (each runway's path laid once).
        const key = `${kind}:${runwayInUse(airport, input.wind.fromDeg, input.wind.ms)}`
        if (!routes.has(key)) {
          const route = lowPlanesOf({ ...input, dark: 0 }, PATH_KM[airport.light ? 'light' : 'jet']).find((p) => p.airport === airport.icao && p.kind === kind)
          routes.set(key, route ? { ...route, path: kind === 'arrive' ? [...route.path].reverse() : route.path } : null)
        }
        const route = routes.get(key)
        if (!route) return
        const path = route.path
        const lengthKm = (path.length - 1) * 0.5
        out.push({ id: `${input.at.slice(0, 10)}:${airport.icao}:${kind}:${i}`, airport: airport.icao, kind, light: airport.light, t0,
          t1: t0 + (lengthKm * 1000) / route.speedMs, path, speedMs: route.speedMs, seed: seedOf(`${airport.icao}:${kind}:${i}`) })
      })
    }
  }
  return out.sort((a, b) => a.t0 - b.t0)
}

function meteorEvents(inputs: LifeInput[], seedOf: (p: string) => number): MeteorEvent[] {
  const rate = Float64Array.from(inputs, (input) => (meteorsOf(input)?.perHour ?? 0) * SKY_SHARE)
  const top = Math.max(0, ...rate)
  if (top <= 0) return []
  return arrivals(seedOf('meteors'), top, (t) => readAt(rate, t) / top).map((t, i) => ({ id: `${inputs[0].at.slice(0, 10)}:meteor:${i}`, t,
    seed: seedOf(`meteor:${i}`) }))
}

/* Evaluation at a moment. */

/** A flock under way at `t` (s of its day): where its centre is, how near, how faded by distance. */
export function flockAt(e: FlockEvent, t: number): Flock {
  const s = e.speedMs * (t - (e.t0 + e.t1) / 2)
  const h = e.headingDeg * RAD
  const E = e.cE + s * Math.sin(h), N = e.cN + s * Math.cos(h)
  const dir = skyDirection(E / 1000, N / 1000, e.upM)
  const ground = Math.hypot(E, N)
  return {
    id: e.id, kind: e.kind, count: e.count, score: e.score, seed: e.seed, azimuth: dir.azimuth, altitude: dir.altitude, distanceM: dir.km * 1000,
    nearM: Math.hypot(e.nearM, e.upM), fade: 1 - smoothstep(0.55 * e.endM, e.endM, ground), headingDeg: e.headingDeg, speedMs: e.speedMs,
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
    const puff = (tau: number) => {
      const p = highPoint(e, tau)
      const age = t - tau
      const E = p.e + e.driftE * age, N = p.n + e.driftN * age
      if (Math.hypot(E, N) < CRUISE_REACH_KM + 10) trail.push({ e: E, n: N, up: e.upM, ageS: age, seed: hashId(`${e.id}:${Math.round(tau)}`) })
    }
    // On a fixed grid of emission moments, so each puff keeps its own place and shape from frame to frame.
    for (let tau = Math.ceil(from / TRAIL_STEP_S) * TRAIL_STEP_S; tau < head; tau += TRAIL_STEP_S) puff(tau)
    if (head > from) puff(head)
  }
  return { id: e.id, plane: plane && { ...plane, up: e.upM }, headingDeg: e.headingDeg, speedMs: e.speedMs, persists: e.persists,
    shortKm: e.shortKm, lifeS: e.lifeS, spreadM: e.spreadM, trail, seed: e.seed }
}

/** A point along a polyline every 0.5 km, `km` from its start. */
function along(path: LowEvent['path'], km: number) {
  const f = Math.max(0, Math.min(path.length - 1, km / 0.5))
  const i = Math.min(path.length - 2, Math.floor(f)), k = f - i
  const a = path[i], b = path[i + 1]
  return { e: a.e + (b.e - a.e) * k, n: a.n + (b.n - a.n) * k, up: a.up + (b.up - a.up) * k }
}

/** A movement at `t`: where it is on its path, and a little ahead (its way on the sky). */
export function lowAt(e: LowEvent, t: number): LowPlane {
  const km = (e.speedMs * (t - e.t0)) / 1000
  const length = (e.path.length - 1) * 0.5
  return { id: e.id, airport: e.airport, kind: e.kind, light: e.light, speedMs: e.speedMs, seed: e.seed, at: along(e.path, km),
    ahead: along(e.path, km + 0.5), fieldKm: e.kind === 'arrive' ? length - km : km, pathKm: length,
    overFieldM: along(e.path, km).up - (e.kind === 'arrive' ? e.path.at(-1)! : e.path[0]).up }
}

/**
 * The sky's life at a moment: the events of its day and of the day before (those still under way past midnight) at their
 * places on their paths. `t` is seconds since the shown day's midnight; `input` the world's life input at the moment.
 */
export function lifeAt(days: { schedule: LifeSchedule; offsetS: number }[], t: number, input: LifeInput): SkyLife {
  const birds: Flock[] = [], high: HighPlane[] = [], low: LowPlane[] = [], flashes: MeteorFlash[] = []
  for (const { schedule, offsetS } of days) {
    const tt = t - offsetS
    for (const e of schedule.flocks) if (e.t0 <= tt && tt <= e.t1) birds.push(flockAt(e, tt))
    for (const e of schedule.high) if (e.t0 <= tt && tt <= e.t1 + e.lifeS) high.push(highAt(e, tt))
    for (const e of schedule.low) if (e.t0 <= tt && tt <= e.t1) low.push(lowAt(e, tt))
    for (const e of schedule.meteors) if (e.t >= tt && e.t < tt + METEOR_WINDOW_S) flashes.push({ id: e.id, inS: e.t - tt, seed: e.seed })
  }
  const aircraft: Aircraft = { cruise: cruiseOf(input), high, low }
  const shower = meteorsOf(input)
  return { birds, aircraft, meteors: shower && flashes.length ? { ...shower, flashes } : null }
}

/** The life of a single input's day at its own moment (the rules' tests: one fixed hour held all day). */
export function lifeOfInput(input: LifeInput, floorAlt?: ScheduleContext['floorAlt']): SkyLife {
  const date = input.at.slice(0, 10)
  const ctx = { placeId: input.placeId, date, camera: input.camera, lat: input.lat, lon: input.lon, floorAlt }
  const today = lifeSchedule(ctx, (at) => ({ ...input, at }))
  const before = lifeSchedule({ ...ctx, date: dayBefore(date) }, (at) => ({ ...input, at }))
  return lifeAt([{ schedule: before, offsetS: -DAY_S }, { schedule: today, offsetS: 0 }], secondsOf(input.at), input)
}

/** The flocks under way at an input's moment, its hour's weather held all day (the rules' tests). */
export const birdsOf = (input: LifeInput) => lifeOfInput(input).birds
