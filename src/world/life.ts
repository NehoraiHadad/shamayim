import { horizontalPosition } from '../astro/sun'
import { showerOn } from '../astro/showers'
import { utcOf } from '../astro/utc'
import { hashId, seeded } from '../data/landmarks/hash'
import type { Camera } from '../domain/camera'
import type { HourPoint, LocalTime } from '../domain/types'
import { AIRPORTS, enuKm, pathPoint, runwayInUse, type Airport } from './airports'
import { contrailAir, cruiseClimate, type ContrailAir } from './contrails'
import type { PlaceEnv } from './placeEnv'
import { skyLimit } from './nightSky'
import { smoothstep } from './ridgeLighting'
import { apparentAltitude } from './skyProjection'
import type { Covers } from './clouds'

/*
 * The life of the sky (C10), chosen from the one world state by general rules: which birds fly (by season, hour, region,
 * weather and the land under them), which aircraft are up (airliners at cruise with their contrails when the Schmidt–
 * Appleman criterion holds; the approach and departure traffic of the airports within reach, on the runway the wind
 * picks), and the meteors of a shower night. Everything here is in the world's terms (azimuths, altitudes, distances,
 * speeds); the scene model turns it into px and motion.
 */

const RAD = Math.PI / 180
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export type BirdKind = 'stork' | 'crane' | 'swift' | 'gull' | 'raptor' | 'crow' | 'pigeon' | 'bat'

/** A flock (or a lone bird) in the sky at the shown hour. */
export interface Flock {
  kind: BirdKind
  count: number
  /** Where its middle is (deg) and how far (m). */
  azimuth: number
  altitude: number
  distanceM: number
  /** Its way over the ground: heading (deg) and speed (m/s); circling kinds drift this way between turns. */
  headingDeg: number
  speedMs: number
  /** 0–1: how likely the kind is at this hour and place (what chose it). */
  score: number
  seed: number
}

/** A day of the year (1–366) of a local time. */
export function dayOfYear(at: LocalTime): number {
  const y = Number(at.slice(0, 4)), m = Number(at.slice(5, 7)), d = Number(at.slice(8, 10))
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86_400_000) + 1
}

const doyOf = (mmdd: string) => dayOfYear(`2025-${mmdd}`)

/**
 * A season window over the year: 0 before `from`, rising to 1 by `full`, 1 to `fade`, 0 by `to` (MM-DD; wraps the year's
 * turn when `to` comes before `from`).
 */
export function season(doy: number, from: string, full: string, fade: string, to: string): number {
  const shift = (v: number) => ((v - doyOf(from)) % 365 + 365) % 365
  const t = shift(doy), a = shift(doyOf(full)), b = shift(doyOf(fade)), c = shift(doyOf(to))
  if (t <= a) return a > 0 ? t / a : 1
  if (t <= b) return 1
  if (t <= c) return 1 - (t - b) / Math.max(1, c - b)
  return 0
}

/** What the life rules read of the world at the shown hour. */
export interface LifeInput {
  placeId: string
  lat: number
  lon: number
  at: LocalTime
  timezone: string
  camera: Camera
  /** The place's ground (m). */
  groundM: number
  env: PlaceEnv
  sun: { altitude: number; azimuth: number }
  /** Direct sunlight (0–1, after the cloud in front) and the night's darkness (0 day … 1 night). */
  direct: number
  dark: number
  temperature: number
  covers: Covers
  rainMmH: number
  thunder: boolean
  wind: { fromDeg: number; towardDeg: number; ms: number; gustMs: number }
  /** The high cloud layer's drift (scene px/s across): contrails drift with it. */
  highDrift: number
  hour?: Pick<HourPoint, 'cruise'>
  /** The clear share of the sky (stars, planets and meteors show through it). */
  starsThrough: number
  moon: { altitude: number; illumination: number }
  visibilityKm: number
}

/** The hour's own seed: the same hour at the same place shows the same life. */
const hourSeed = (input: LifeInput, part: string) => hashId(`${input.placeId}:${part}:${input.at.slice(0, 13)}`)

/** How much the weather lets birds fly (0 none … 1 fine): none in heavy rain, a storm or a gale. */
export function flyingWeather(input: Pick<LifeInput, 'rainMmH' | 'thunder' | 'wind'>): number {
  if (input.thunder || input.rainMmH >= 2.5 || input.wind.gustMs >= 18) return 0
  return (1 - smoothstep(0, 2.5, input.rainMmH) * 0.85) * (1 - smoothstep(10, 18, input.wind.gustMs))
}

/** Israel's part of the Rift Valley flyway: the whole country lies on it, the Jordan and Arava valleys and the hills most. */
export function flyway(lat: number, lon: number): number {
  if (lat < 29.3 || lat > 33.5 || lon < 34.1 || lon > 36) return 0
  return 0.65 + 0.35 * smoothstep(34.8, 35.4, lon)
}

/** Each kind's likelihood (0–1) at this hour and place: the rules of nature as general functions of the world. */
export function birdScores(input: LifeInput): Record<BirdKind, number> {
  const doy = dayOfYear(input.at)
  const sunAlt = input.sun.altitude
  const fly = flyingWeather(input)
  const low = input.covers.low
  const hour = Number(input.at.slice(11, 13)) + Number(input.at.slice(14, 16)) / 60
  const wet = input.rainMmH > 0
  const day = smoothstep(-1, 4, sunAlt)
  const env = input.env
  const way = flyway(input.lat, input.lon)
  // Soaring birds need thermals: the sun well up and shining, a dry hour, light winds.
  const thermals = smoothstep(18, 34, sunAlt) * smoothstep(0.3, 0.7, input.direct) * (wet ? 0 : 1) * (1 - smoothstep(9, 14, input.wind.ms))
  const spring = (a: string, b: string, c: string, d: string) => season(doy, a, b, c, d)
  // White stork passage: mid-March to early May, mid-August to early October; soaring in flocks by day.
  const stork = Math.max(spring('03-05', '03-22', '04-15', '05-05'), spring('08-10', '08-25', '09-20', '10-12')) * way * thermals
  // Common crane passage (late Oct–Nov, Feb–Mar) and the Hula valley's wintering flocks flying out and in round sunrise and sunset.
  const passage = Math.max(spring('10-15', '10-28', '11-20', '12-05'), spring('02-10', '02-25', '03-15', '03-31'))
  const hula = smoothstep(32.85, 33.0, input.lat) * smoothstep(35.45, 35.55, input.lon) * (1 - smoothstep(35.7, 35.8, input.lon))
  const winter = spring('11-01', '11-20', '02-15', '03-05') * hula * (smoothstep(-2, 1, sunAlt) * (1 - smoothstep(10, 18, sunAlt)))
  const crane = Math.max(passage * way * smoothstep(4, 15, sunAlt) * (1 - 0.6 * low), winter) * (wet ? 0.3 : 1)
  // Common and pallid swifts: here from mid-February to July, most in the morning and the evening, over towns (they nest in walls).
  const swift = spring('02-15', '03-15', '06-20', '07-25') * day * (0.55 + 0.45 * (1 - smoothstep(25, 55, sunAlt))) *
    (0.6 + 0.4 * env.built) * (wet ? 0.2 : 1) * (1 - smoothstep(10, 14, input.wind.ms))
  // Gulls by the sea (and the Kinneret), many in winter, fewer in summer; wind and showers do not keep them down.
  const shore = Math.max(env.seaKm === null ? 0 : 1 - smoothstep(2, 8, env.seaKm), env.lakeKm === null ? 0 : 0.8 * (1 - smoothstep(1, 5, env.lakeKm)))
  const gull = shore * day * (0.45 + 0.55 * spring('10-01', '11-01', '03-15', '04-20'))
  // Raptors circling in thermals at a sunny midday over open land; their autumn passage most of all.
  const raptor = thermals * smoothstep(33, 45, sunAlt) * smoothstep(13, 18, input.temperature) * smoothstep(0.15, 0.4, env.open) *
    (1 - smoothstep(0.35, 0.6, low)) * (0.6 + 0.4 * Math.max(spring('03-01', '03-20', '10-01', '10-25'), spring('09-01', '09-15', '10-10', '10-30') * way))
  // Hooded crows and rock doves: the year round by day, crows round any settlement and fields, pigeons in built-up streets.
  const busy = day * (0.65 + 0.35 * Math.max(1 - smoothstep(7, 10, hour), smoothstep(14, 17, hour)))
  const crow = busy * (0.35 + 0.4 * smoothstep(0.02, 0.15, env.built) + 0.2 * env.open) * (wet ? 0.6 : 1)
  const pigeon = busy * smoothstep(0.12, 0.45, env.built) * (wet ? 0.3 : 1)
  // Bats at dusk and dawn: the insect-eaters in the warm months, the fruit bats of the towns all year; not in rain or wind.
  const dusk = smoothstep(-1, -4, sunAlt) * (1 - smoothstep(-11, -14, sunAlt))
  const bat = dusk * smoothstep(10, 15, input.temperature) * Math.max(spring('03-20', '04-15', '10-10', '11-10'), 0.6 * smoothstep(0.1, 0.35, env.built)) *
    (wet ? 0 : 1) * (1 - smoothstep(6, 9, input.wind.ms))
  const scores = { stork, crane, swift, gull, raptor, crow, pigeon, bat }
  for (const k of Object.keys(scores) as BirdKind[]) scores[k] = clamp01(scores[k] * fly)
  return scores
}

interface KindShape { count: [number, number]; distanceM: [number, number]; altitude: [number, number]; speedMs: number }

const SHAPES: Record<BirdKind, KindShape> = {
  stork: { count: [14, 38], distanceM: [1400, 3000], altitude: [16, 40], speedMs: 9 },
  crane: { count: [9, 28], distanceM: [1800, 4000], altitude: [12, 32], speedMs: 15 },
  swift: { count: [5, 12], distanceM: [150, 400], altitude: [24, 55], speedMs: 20 },
  gull: { count: [2, 6], distanceM: [200, 600], altitude: [5, 20], speedMs: 9 },
  raptor: { count: [1, 3], distanceM: [500, 1200], altitude: [18, 42], speedMs: 3 },
  crow: { count: [1, 3], distanceM: [150, 350], altitude: [6, 18], speedMs: 11 },
  pigeon: { count: [12, 26], distanceM: [180, 400], altitude: [6, 20], speedMs: 14 },
  bat: { count: [2, 6], distanceM: [40, 120], altitude: [6, 24], speedMs: 6 },
}

/** The way a kind goes: migrants north in spring and south in autumn, raptors with the wind, the rest seeded. */
function headingOf(kind: BirdKind, input: LifeInput, r: () => number): number {
  const doy = dayOfYear(input.at)
  const spring = doy < 182
  if (kind === 'stork' || kind === 'crane') {
    // The wintering cranes (out of season for passage) fly between roost and fields: any way.
    const passing = kind === 'stork' || season(doy, '10-15', '10-28', '11-20', '12-05') + season(doy, '02-10', '02-25', '03-15', '03-31') > 0
    return passing ? (spring ? 10 : 195) + (r() - 0.5) * 30 : r() * 360
  }
  if (kind === 'raptor') return input.wind.towardDeg + (r() - 0.5) * 40
  if (kind === 'gull' && input.env.seaKm !== null) return (r() < 0.5 ? 10 : 190) + (r() - 0.5) * 30
  return r() * 360
}

/**
 * How often a kind that can be about is in view in a given hour: residents round a place most hours, a passage of migrants
 * a few hours of its best days (flocks pass in waves).
 */
const PREVALENCE: Record<BirdKind, number> = { stork: 0.55, crane: 0.35, swift: 0.9, gull: 0.85, raptor: 0.6, crow: 0.75, pigeon: 0.8, bat: 0.8 }

/**
 * The birds in the sky at the shown hour: each kind is up with its likelihood (an hour's seeded draw against its score), at
 * most two kinds, the likelier first. None in heavy rain, a storm or a gale.
 */
export function birdsOf(input: LifeInput): Flock[] {
  const scores = birdScores(input)
  const r = seeded(hourSeed(input, 'birds'))
  const up = (Object.keys(scores) as BirdKind[])
    .map((kind) => ({ kind, score: scores[kind], draw: r() }))
    .filter((k) => k.score > 0.05 && k.draw < k.score * PREVALENCE[k.kind])
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
  return up.map(({ kind, score }, i) => {
    const s = SHAPES[kind]
    const q = seeded(hourSeed(input, `flock:${kind}`))
    const t = q()
    const count = Math.round(s.count[0] + (s.count[1] - s.count[0]) * q() * (0.5 + 0.5 * score))
    return {
      kind, score,
      count: Math.max(1, count),
      // In front, within ±95° of the view's heading.
      azimuth: input.camera.heading + (i === 0 ? 1 : -1) * (q() < 0.5 ? -1 : 1) * (10 + 85 * q()),
      altitude: s.altitude[0] + (s.altitude[1] - s.altitude[0]) * q(),
      distanceM: s.distanceM[0] + (s.distanceM[1] - s.distanceM[0]) * t,
      headingDeg: headingOf(kind, input, q),
      speedMs: s.speedMs * (0.85 + 0.3 * q()),
      seed: hourSeed(input, `seed:${kind}`),
    }
  })
}

/* Aircraft. */

/** Cruise level (m above sea level) of airliners over the Levant (FL340). */
export const CRUISE_M = 10_400
const CRUISE_MS = 230

/** A straight line at a height (m above the place): a point (km east, north of the place), a heading, the stretch along it (km). */
export interface TrackLine { e: number; n: number; headingDeg: number; from: number; to: number; heightM: number }

/** An airliner at cruise with its contrail (the trail runs `trailKm` behind it; old trails have no plane). */
export interface HighPlane {
  track: TrackLine
  /** Where the plane is on its track at phase 0 (km along it). */
  atKm: number
  speedMs: number
  /** The trail's length behind the plane (km); spread (m) of its width at its old end. */
  trailKm: number
  spreadM: number
  seed: number
}

/** An old persistent contrail with no plane at its head any more: spread wide, drifting with the upper wind. */
export interface OldTrail { track: TrackLine; spreadM: number; ageMin: number; seed: number }

/** An airliner or a light plane on approach or climb-out near an airport within reach. */
export interface LowPlane {
  airport: string
  kind: 'arrive' | 'depart'
  light: boolean
  /** The path near the place: points every 0.5 km along it, km east and north of the place, height (m above the place). */
  path: { e: number; n: number; up: number }[]
  speedMs: number
  /** Seconds between movements on this path (the airport's rate, by day or by night, split between arrivals and departures). */
  everyS: number
  /** Where along the path (0–1) one stands at phase 0. */
  at0: number
  seed: number
}

export interface Aircraft {
  /** The air at cruise and where it came from. */
  cruise: ContrailAir & { temperature: number; humidity: number; source: 'forecast' | 'climate' }
  high: HighPlane[]
  old: OldTrail[]
  low: LowPlane[]
  /** The high cloud's drift (scene px/s across): the contrails drift with it. */
  drift: number
}

/** The contrails' light: they show by day and in the twilight while the sun still reaches cruise level (to ~−4°). */
const trailLight = (sunAlt: number) => smoothstep(-4.5, -1.5, sunAlt)

/** The aircraft in the sky at the shown hour. */
export function aircraftOf(input: LifeInput): Aircraft {
  const doy = dayOfYear(input.at)
  const given = input.hour?.cruise ?? null
  const air = given ?? cruiseClimate(doy, input.covers.high)
  const sa = contrailAir(air.temperature, air.humidity)
  const cruise = { ...sa, ...air, source: given ? 'forecast' as const : 'climate' as const }
  const high: HighPlane[] = []
  const old: OldTrail[] = []
  const r = seeded(hourSeed(input, 'aircraft'))
  // Airliners at cruise: one to three crossing the sky in view in an hour's look, only drawn with their contrail (a plane
  // alone at 10 km is a speck no one sees); and not through a deck (low or mid cloud hides them).
  const seen = trailLight(input.sun.altitude) * (1 - smoothstep(0.55, 0.85, 1 - (1 - input.covers.low) * (1 - input.covers.mid)))
  if (sa.forms && seen > 0.05) {
    // How many: by how surely the air makes trails (its margin under the threshold), one to three.
    const n = 1 + Math.floor(r() * (1 + 1.4 * smoothstep(1, 8, sa.margin)))
    for (let i = 0; i < n; i++) {
      const heading = r() * 360
      // Its closest approach (km, ahead of the eye in the view's half) and where it is now along the track.
      const side = 6 + 34 * r()
      const toward = input.camera.heading + (r() - 0.5) * 160
      const e = side * Math.sin(toward * RAD), nn = side * Math.cos(toward * RAD)
      const atKm = (r() - 0.5) * 40
      const persist = sa.persists
      const trailKm = persist ? 40 + 60 * r() : 0.6 + Math.min(4, sa.margin / 3) * (0.6 + 0.4 * r())
      high.push({ track: { e, n: nn, headingDeg: heading, from: atKm - trailKm - 1, to: atKm + 60, heightM: CRUISE_M - input.groundM }, atKm, speedMs: CRUISE_MS,
        trailKm, spreadM: persist ? 300 + 600 * r() : 60, seed: hourSeed(input, `plane:${i}`) })
    }
    if (sa.persists) {
      // Old spread trails by how supersaturated the air is over ice: none to two (with the live ones, at most four drawn).
      const m = Math.floor(r() * (1 + 1.9 * smoothstep(1, 1.25, sa.rhIce)))
      for (let i = 0; i < m; i++) {
        const heading = r() * 360
        const side = 8 + 40 * r()
        const toward = input.camera.heading + (r() - 0.5) * 200
        const mid = (r() - 0.5) * 30
        old.push({ track: { e: side * Math.sin(toward * RAD), n: side * Math.cos(toward * RAD), headingDeg: heading, from: mid - 50, to: mid + 50,
          heightM: CRUISE_M - 300 * r() - input.groundM }, spreadM: 800 + 2500 * r(), ageMin: 10 + 50 * r(), seed: hourSeed(input, `trail:${i}`) })
      }
    }
  }
  return { cruise, high, old, low: lowPlanesOf(input), drift: input.highDrift }
}

/** Approach and departure traffic of the airports within reach, on the runway the wind picks. */
export function lowPlanesOf(input: LifeInput): LowPlane[] {
  const out: LowPlane[] = []
  const night = input.dark > 0.5
  for (const airport of AIRPORTS) {
    const { e: ae, n: an } = enuKm(input, airport)
    const dist = Math.hypot(ae, an)
    if (dist > airport.reachKm + 20) continue
    const rate = night ? airport.perHour.night : airport.perHour.day
    if (rate <= 0) continue
    // Under a low deck the traffic is in the cloud; heavy weather does not stop it.
    if (input.covers.low > 0.85) continue
    const heading = runwayInUse(airport, input.wind.fromDeg, input.wind.ms)
    for (const kind of ['arrive', 'depart'] as const) {
      const path = pathOf(airport, kind, heading, ae, an, input.groundM)
      if (!path.some((p) => Math.hypot(p.e, p.n) <= airport.reachKm)) continue
      const r = seeded(hourSeed(input, `${airport.icao}:${kind}`))
      out.push({ airport: airport.icao, kind, light: airport.light, path, speedMs: airport.light ? 45 : kind === 'arrive' ? 75 : 95,
        everyS: 3600 / (rate / 2), at0: 0.15 + 0.7 * r(), seed: hourSeed(input, `${airport.icao}:${kind}:seed`) })
    }
  }
  return out
}

function pathOf(airport: Airport, kind: 'arrive' | 'depart', heading: number, ae: number, an: number, groundM: number) {
  const pts: { e: number; n: number; up: number }[] = []
  // Out to 22 km from the field (an arrival is still on its approach, a departure has not yet turned away).
  for (let km = 1; km <= 22; km += 0.5) {
    const p = pathPoint(kind, heading, km, airport.light)
    pts.push({ e: ae + p.e, n: an + p.n, up: airport.elevationM + p.up - groundM })
  }
  return pts
}

/* Meteors. */

export interface Meteors {
  shower: string
  /** The shower's rate tonight (ZHR) and the rate seen here (meteors an hour over the whole sky). */
  zhr: number
  perHour: number
  /** The radiant now (deg). */
  radiant: { azimuth: number; altitude: number }
  /** Entry speed (km/s). */
  speed: number
}

/**
 * The naked-eye limiting magnitude for meteors (C10): the sky's own (`skyLimit`: the twilight, the moon) less what the
 * towns' glow takes (unlike the planets, the faint meteors drown in it).
 */
export function limitingMagnitude(sunAlt: number, moon: { altitude: number; illumination: number }, glow: number): number {
  return skyLimit(sunAlt, moon) - 1.1 * Math.log10(1 + glow * 1.5)
}

/** The meteors of a shower night: only when the night is dark and a shower is on; the rate by the radiant, moon, glow, cloud. */
export function meteorsOf(input: LifeInput): Meteors | null {
  if (input.dark < 0.85) return null
  // The night's date: the small hours belong to the evening before.
  const hour = Number(input.at.slice(11, 13))
  const date = hour < 12 ? new Date(Date.UTC(Number(input.at.slice(0, 4)), Number(input.at.slice(5, 7)) - 1, Number(input.at.slice(8, 10)) - 1))
    .toISOString().slice(0, 10) : input.at.slice(0, 10)
  const on = showerOn(date)
  if (!on) return null
  const instant = utcOf(input.at, input.timezone)
  const radiant = horizontalPosition({ rightAscension: on.shower.ra * RAD, declination: on.shower.dec * RAD, distanceKm: Infinity }, instant,
    input.lat, input.lon)
  if (radiant.altitude <= 0) return null
  const lm = limitingMagnitude(input.sun.altitude, input.moon, input.env.glow)
  // Observed rate: ZHR × sin(radiant altitude) × r^(LM − 6.5), population index r ≈ 2.2; through the clear share of the sky.
  const perHour = on.zhr * Math.sin(radiant.altitude * RAD) * 2.2 ** (lm - 6.5) * clamp01(input.starsThrough) * smoothstep(5, 15, input.visibilityKm)
  if (perHour < 0.5) return null
  return { shower: on.shower.name, zhr: on.zhr, perHour, radiant: { azimuth: radiant.azimuth, altitude: apparentAltitude(radiant.altitude) },
    speed: on.shower.speed }
}

export interface SkyLife { birds: Flock[]; aircraft: Aircraft; meteors: Meteors | null }

export function skyLifeOf(input: LifeInput): SkyLife {
  return { birds: birdsOf(input), aircraft: aircraftOf(input), meteors: meteorsOf(input) }
}
