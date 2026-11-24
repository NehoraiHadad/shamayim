import { horizontalPosition } from '../astro/sun'
import { showerOn } from '../astro/showers'
import { utcOf } from '../astro/utc'
import type { Camera } from '../domain/camera'
import type { HourPoint, LocalTime } from '../domain/types'
import { AIRPORTS, enuKm, pathPoint, runwayInUse, type Airport } from './airports'
import type { ContrailAir } from './contrails'
import type { PlaceEnv } from './placeEnv'
import { limitingMagnitude } from './nightSky'
import { smoothstep } from './ridgeLighting'
import { apparentAltitude } from './skyProjection'
import type { Covers } from './clouds'

/*
 * The life of the sky (C10), chosen from the one world state by general rules: which birds fly (by season, hour, region,
 * weather and the land under them), which aircraft are up (airliners at cruise with their contrails when the Schmidt–
 * Appleman criterion holds; the approach and departure traffic of the airports within reach, on the runway the wind
 * picks), and the meteors of a shower night. These are the rates: how likely each kind is at a moment. The life itself is a
 * process in time drawn from them (`lifeSchedule.ts`: a day's events, each on its own path), so it never pops in or out
 * with the hour. Everything here is in the world's terms (azimuths, altitudes, distances, speeds); the scene model turns
 * it into px and motion.
 */

const RAD = Math.PI / 180
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export type BirdKind = 'stork' | 'crane' | 'swift' | 'gull' | 'raptor' | 'crow' | 'pigeon' | 'bat'

export interface FlightPoint { e: number; n: number; up: number }
export type FlockSample = Pick<Flock, 'azimuth' | 'altitude' | 'distanceM' | 'fade'>
export type LowSample = Pick<LowPlane, 'at' | 'ahead' | 'fieldKm' | 'overFieldM'>

/** A flock (or a lone bird) under way at the shown moment (`lifeSchedule.ts` `flockAt`). */
export interface Flock {
  /** Its event's id: the same flock from minute to minute. */
  id: string
  kind: BirdKind
  count: number
  /** Where its middle is now (deg) and how far (m). */
  azimuth: number
  altitude: number
  distanceM: number
  /** Its distance at its closest (m): drawn at its full size there, smaller as it goes. */
  nearM: number
  /** 1 … 0 as it comes from or goes into the distance (gone into the haze at its session's ends). */
  fade: number
  /** Its way over the ground: heading (deg) and its group's speed (m/s). */
  headingDeg: number
  speedMs: number
  /** 0–1: how likely the kind was when it came (what chose it). */
  score: number
  seed: number
  /** Where it is (km east, north of the eye; m above it). */
  at?: { e: number; n: number; up: number }
  /** How far off (km over the ground) the land truly stands in its line of sight, or null when nothing does. */
  blockedKm?: number | null
  samples?: FlockSample[]
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
  thunder: number | boolean
  wind: { fromDeg: number; towardDeg: number; ms: number; gustMs: number }
  /** The wind at cruise level (deg toward, m/s): the contrails drift with it; absent, the surface wind's way, stronger. */
  highWind?: { towardDeg: number; ms: number }
  hour?: Pick<HourPoint, 'cruise'>
  /** The clear share of the sky (stars, planets and meteors show through it). */
  starsThrough: number
  moon: { altitude: number; illumination: number }
  visibilityKm: number
}

/** How much the weather lets birds fly (0 none … 1 fine): none in heavy rain, a storm or a gale. */
export function flyingWeather(input: Pick<LifeInput, 'rainMmH' | 'thunder' | 'wind'>): number {
  if (input.rainMmH >= 2.5 || input.wind.gustMs >= 18) return 0
  return (1 - Number(input.thunder)) * (1 - smoothstep(0, 2.5, input.rainMmH) * 0.85) * (1 - smoothstep(10, 18, input.wind.gustMs))
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

/** A kind's flocks: how many birds, how near they pass (m), their own airspeed. Their height is `flightPaths.ts` `FLIGHT`. */
interface KindShape { count: [number, number]; distanceM: [number, number]; speedMs: number }

export const SHAPES: Record<BirdKind, KindShape> = {
  stork: { count: [14, 38], distanceM: [800, 2200], speedMs: 9 },
  crane: { count: [9, 28], distanceM: [1200, 3000], speedMs: 15 },
  swift: { count: [5, 12], distanceM: [150, 400], speedMs: 20 },
  gull: { count: [2, 6], distanceM: [200, 600], speedMs: 9 },
  raptor: { count: [1, 3], distanceM: [500, 1200], speedMs: 3 },
  crow: { count: [1, 3], distanceM: [150, 350], speedMs: 11 },
  pigeon: { count: [12, 26], distanceM: [180, 400], speedMs: 14 },
  bat: { count: [2, 6], distanceM: [40, 120], speedMs: 6 },
}

/** The way a kind goes: migrants north in spring and south in autumn, raptors with the wind, the rest seeded. */
export function headingOf(kind: BirdKind, input: LifeInput, r: () => number): number {
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
export const PREVALENCE: Record<BirdKind, number> = { stork: 0.55, crane: 0.35, swift: 0.9, gull: 0.85, raptor: 0.6, crow: 0.75, pigeon: 0.8, bat: 0.8 }

/* Aircraft. */

/** Cruise level (m above sea level) of airliners over the Levant (FL340). */
export const CRUISE_M = 10_400

/** A puff of a contrail: where the upper wind has carried it (km east, north; m up) and its age (s). */
export interface TrailPuff { e: number; n: number; up: number; ageS: number; seed: number
  /** Seconds until a future puff is emitted. Its coordinates are pre-offset by that much wind. */
  inS?: number
  /** A snapshot endpoint between emissions, replaced by the continuous head in the scene. */
  liveTip?: true }

/** An airliner at cruise at the shown moment (`lifeSchedule.ts` `highAt`): the plane while it crosses, its trail's puffs. */
export interface HighPlane {
  id: string
  /** The plane (km east, north; m up), or null once it has flown beyond the reach (its trail lives on). */
  plane: FlightPoint | null
  /** Stable reference points used to project the crossing's trail into one frame. */
  crossing: { start: FlightPoint; centre: FlightPoint; end: FlightPoint }
  /** Upper wind in km/s, fixed at the crossing's start. */
  driftE: number
  driftN: number
  samples?: (FlightPoint | null)[]
  /** Age-zero puffs ahead of the head, with their positions referred to the start of this window. */
  futureTrail?: TrailPuff[]
  /** Seconds from the start of this window until the final emission (negative after the crossing). */
  trailEndInS?: number
  headingDeg: number
  speedMs: number
  persists: boolean
  /** A short trail's length behind the plane (km), for air where trails do not persist. */
  shortKm: number
  /** A persistent trail's life (s) and the width (m) it spreads to by then. */
  lifeS: number
  spreadM: number
  /** Old to new. */
  trail: TrailPuff[]
  seed: number
}

/** An approach or departure at the shown moment (`lifeSchedule.ts` `lowAt`): where it is (km, m) and a little ahead. */
export interface LowPlane {
  id: string
  airport: string
  kind: 'arrive' | 'depart'
  light: boolean
  speedMs: number
  at: { e: number; n: number; up: number }
  ahead: { e: number; n: number; up: number }
  /** How far along its path from the runway it is (km), and how high over the field (m): on the ground at 0. */
  fieldKm: number
  overFieldM: number
  /** Its whole path's length (km). */
  pathKm: number
  seed: number
  /** How far off (km over the ground) the land truly stands in its line of sight, or null when nothing does. */
  blockedKm?: number | null
  samples?: LowSample[]
}

/** A route near an airport within reach, on the runway the wind picks: its path out from the field (every 0.5 km). */
export interface LowRoute {
  airport: string
  kind: 'arrive' | 'depart'
  light: boolean
  heading: number
  /** km east and north of the place, height (m above the place), from the runway outward. */
  path: { e: number; n: number; up: number }[]
  speedMs: number
}

export interface Aircraft {
  /** The air at cruise and where it came from. */
  cruise: ContrailAir & { temperature: number; humidity: number; source: 'forecast' | 'climate' }
  high: HighPlane[]
  low: LowPlane[]
}

/** The contrails' light: they show by day and in the twilight while the sun still reaches cruise level (to ~−4°). */
export const trailLight = (sunAlt: number) => smoothstep(-4.5, -1.5, sunAlt)

/** The routes of the airports within reach at this input's wind, out to `km` from the field. */
export function lowPlanesOf(input: LifeInput, km = 22): LowRoute[] {
  const out: LowRoute[] = []
  const night = input.dark > 0.5
  for (const airport of AIRPORTS) {
    const { e: ae, n: an } = enuKm(input, airport)
    const dist = Math.hypot(ae, an)
    if (dist > airport.reachKm + 20) continue
    const rate = night ? airport.perHour.night : airport.perHour.day
    if (rate <= 0) continue
    const heading = runwayInUse(airport, input.wind.fromDeg, input.wind.ms)
    for (const kind of ['arrive', 'depart'] as const) {
      const path = pathOf(airport, kind, heading, ae, an, input.groundM, km)
      if (!path.some((p) => Math.hypot(p.e, p.n) <= airport.reachKm)) continue
      out.push({ airport: airport.icao, kind, light: airport.light, heading, path, speedMs: airport.light ? 45 : kind === 'arrive' ? 75 : 95 })
    }
  }
  return out
}

function pathOf(airport: Airport, kind: 'arrive' | 'depart', heading: number, ae: number, an: number, groundM: number, km: number) {
  const pts: { e: number; n: number; up: number }[] = []
  // Out from the field (an arrival is still on its approach, a departure has not yet turned away).
  for (let d = 0; d <= km; d += 0.5) {
    const p = pathPoint(kind, heading, d, airport.light)
    pts.push({ e: ae + p.e, n: an + p.n, up: airport.elevationM + p.up - groundM })
  }
  return pts
}

/* Meteors. */

export const METEOR_FLASH_S = 0.7

export interface Meteors {
  shower: string
  /** The shower's rate tonight (ZHR) and the rate seen here (meteors an hour over the whole sky). */
  zhr: number
  perHour: number
  /** The radiant now (deg). */
  radiant: { azimuth: number; altitude: number }
  /** Entry speed (km/s). */
  speed: number
  /** The meteors of the next minutes (`METEOR_WINDOW_S`), each this many seconds on, with its own seed. */
  flashes: MeteorFlash[]
}

export interface MeteorFlash { id: string; inS: number; seed: number; radiant?: Meteors['radiant']; speed?: number }

/** The meteors of a shower night: only when the night is dark and a shower is on; the rate by the radiant, moon, glow, cloud. */
function showerAt(at: LocalTime) {
  // The night's date: the small hours belong to the evening before.
  const hour = Number(at.slice(11, 13))
  const date = hour < 12 ? new Date(Date.UTC(Number(at.slice(0, 4)), Number(at.slice(5, 7)) - 1, Number(at.slice(8, 10)) - 1))
    .toISOString().slice(0, 10) : at.slice(0, 10)
  return showerOn(date)
}

function radiantAt(input: LifeInput, on: NonNullable<ReturnType<typeof showerOn>>, offsetS: number) {
  const instant = new Date(utcOf(input.at, input.timezone).getTime() + offsetS * 1000)
  return horizontalPosition({ rightAscension: on.shower.ra * RAD, declination: on.shower.dec * RAD, distanceKm: Infinity }, instant,
    input.lat, input.lon)
}

/** A scheduled flash uses its own radiant, so its painted shape stays fixed as the minute changes. */
export function meteorLook(input: LifeInput, offsetS: number): Pick<MeteorFlash, 'radiant' | 'speed'> {
  const on = showerAt(input.at)
  if (!on) return {}
  const radiant = radiantAt(input, on, offsetS)
  return { radiant: { azimuth: radiant.azimuth, altitude: apparentAltitude(radiant.altitude) }, speed: on.shower.speed }
}

export function meteorsOf(input: LifeInput): Omit<Meteors, 'flashes'> | null {
  if (input.dark < 0.85) return null
  const on = showerAt(input.at)
  if (!on) return null
  const radiant = radiantAt(input, on, 0)
  if (radiant.altitude <= 0) return null
  const lm = limitingMagnitude(input.sun.altitude, input.moon, input.env.glow)
  // Observed rate: ZHR × sin(radiant altitude) × r^(LM − 6.5), population index r ≈ 2.2; through the clear share of the sky.
  const perHour = on.zhr * Math.sin(radiant.altitude * RAD) * 2.2 ** (lm - 6.5) * clamp01(input.starsThrough) * smoothstep(5, 15, input.visibilityKm)
  if (perHour < 0.5) return null
  return { shower: on.shower.name, zhr: on.zhr, perHour, radiant: { azimuth: radiant.azimuth, altitude: apparentAltitude(radiant.altitude) },
    speed: on.shower.speed }
}

export interface SkyLife { birds: Flock[]; aircraft: Aircraft; meteors: Meteors | null }
