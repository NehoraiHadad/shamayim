import { moonPosition } from '../astro/moon'
import { skyPoint, type ScenePoint } from './moonShape'
import { FLAT_SKYLINE, type Skyline } from './skyline'
import { apparentAltitude, horizonLine, projectSky } from './skyProjection'

/** One pass of the moon over the place: when it rises and sets (UTC ms) and where. */
export interface MoonPass {
  rise: number
  set: number
  riseAzimuth: number
  setAzimuth: number
}

const MIN = 60_000
const STEP = 10 * MIN
/** A pass lasts at most ~15 h at these latitudes; look a little further for its ends. */
const REACH = 20 * 60 * MIN

type Site = { lat: number; lon: number }
const altitudeAt = (ms: number, s: Site) => moonPosition(new Date(ms), s.lat, s.lon).altitude

/** The minute the altitude crosses 0 between `a` and `b` (opposite signs), by bisection. */
function crossing(a: number, b: number, s: Site): number {
  const upAtA = altitudeAt(a, s) >= 0
  while (Math.abs(b - a) > MIN) {
    const m = (a + b) / 2
    if ((altitudeAt(m, s) >= 0) === upAtA) a = m
    else b = m
  }
  return (a + b) / 2
}

/** Walks from `from` in `dir` (±1) until the moon is on the other side of the horizon; null if it never gets there. */
function nextCrossing(from: number, dir: 1 | -1, s: Site): number | null {
  const up = altitudeAt(from, s) >= 0
  for (let t = from + dir * STEP; Math.abs(t - from) <= REACH; t += dir * STEP) {
    if ((altitudeAt(t, s) >= 0) !== up) return crossing(t - dir * STEP, t, s)
  }
  return null
}

function passBetween(rise: number, set: number, s: Site): MoonPass {
  return {
    rise, set,
    riseAzimuth: moonPosition(new Date(rise), s.lat, s.lon).azimuth,
    setAzimuth: moonPosition(new Date(set), s.lat, s.lon).azimuth,
  }
}

/**
 * The pass the moon is on at `at`: while it is up, the one it is in; while it is down, the nearer of the pass it set
 * from and the one it will rise into (it is only drawn a few degrees below the ridge anyway). Null near the poles.
 */
export function findMoonPass(at: number, s: Site): MoonPass | null {
  if (altitudeAt(at, s) >= 0) {
    const rise = nextCrossing(at, -1, s)
    const set = nextCrossing(at, 1, s)
    return rise !== null && set !== null ? passBetween(rise, set, s) : null
  }
  const lastSet = nextCrossing(at, -1, s)
  const nextRise = nextCrossing(at, 1, s)
  if (nextRise !== null && (lastSet === null || nextRise - at < at - lastSet)) {
    const set = nextCrossing(nextRise + MIN, 1, s)
    return set !== null ? passBetween(nextRise, set, s) : null
  }
  if (lastSet === null) return null
  const rise = nextCrossing(lastSet - MIN, -1, s)
  return rise !== null ? passBetween(rise, lastSet, s) : null
}

let cached: { key: string; pass: MoonPass } | null = null
/** `findMoonPass`, kept while `at` stays near the same pass (the scene asks every minute and on every scrub step). */
export function moonPassAt(at: number, s: Site): MoonPass | null {
  const key = `${s.lat.toFixed(3)},${s.lon.toFixed(3)}`
  const margin = 3 * 60 * MIN
  if (cached?.key === key && at >= cached.pass.rise - margin && at <= cached.pass.set + margin) return cached.pass
  const pass = findMoonPass(at, s)
  cached = pass ? { key, pass } : null
  return pass
}

/**
 * The moon's drawn place at an instant: its true altitude and azimuth in the sky projection, standing on the horizon
 * line of its pass (from the ridge where it rises to the ridge where it sets).
 */
export function moonScenePoint(at: Date, s: Site, skyline: Skyline = FLAT_SKYLINE): ScenePoint {
  const { altitude, azimuth } = moonPosition(at, s.lat, s.lon)
  const pass = moonPassAt(at.getTime(), s)
  if (!pass) return skyPoint(altitude, azimuth, skyline)
  return projectSky(apparentAltitude(altitude), azimuth, horizonLine(pass.riseAzimuth, pass.setAzimuth, skyline))
}
