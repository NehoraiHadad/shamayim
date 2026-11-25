import { AngleBetween, Body, Equator, Horizon, Illumination, KM_PER_AU, MakeTime, Observer, type AstroTime, type Vector } from 'astronomy-engine'
import { BRIGHT_PLANETS } from '../astro/brightPlanets'
import { ALCYONE, MOON_STARS, starEquatorial } from '../astro/brightStars'
import { moonIllumination } from '../astro/moon'
import { apparentAltitude } from '../world/skyProjection'
import { encounterLimit } from './encounterLight'
import type { Detector } from './types'

const MINUTE = 60_000
const STEP = 20 * MINUTE
const HOUR = 60 * MINUTE
const MOON_RADIUS_AU = 1737.4 / KM_PER_AU
const DEG = 180 / Math.PI

const dot = (a: Vector, b: Vector) => (a.x * b.x + a.y * b.y + a.z * b.z) / (a.Length() * b.Length())

/** Sunward and targetward projections on the plane of the lunar limb. */
function darkLimb(moon: Vector, target: Vector, sun: Vector): boolean {
  const targetCos = dot(moon, target), sunCos = dot(moon, sun)
  const projection = Math.sqrt(Math.max(0, (1 - targetCos ** 2) * (1 - sunCos ** 2)))
  return dot(target, sun) - targetCos * sunCos < -0.1 * projection
}

function minimum(left: number, right: number, value: (ms: number) => number): number {
  while (right - left > 1000) {
    const third = (right - left) / 3
    if (value(left + third) < value(right - third)) right -= third
    else left += third
  }
  return (left + right) / 2
}

function crossing(left: number, right: number, gap: (ms: number) => number): number {
  const inside = gap(left) < 0
  while (right - left > 1000) {
    const mid = (left + right) / 2
    if ((gap(mid) < 0) === inside) left = mid
    else right = mid
  }
  return Math.round((left + right) / 2)
}

/** A dark-limb disappearance or reappearance of a bright target, at the observer's own contact time. */
export const lunarOccultation: Detector = (sky) => {
  const from = Math.max(sky.from, sky.night.from)
  if (from >= sky.to) return []
  const observer = new Observer(sky.place.lat, sky.place.lon, sky.place.elevation ?? 0)
  const start = from - 2 * HOUR, end = sky.to + 2 * HOUR
  const middle = (start + end) / 2
  const cache = new Map<number, { time: AstroTime; moon: ReturnType<typeof Equator> }>()
  const moonAt = (ms: number) => {
    let at = cache.get(ms)
    if (!at) {
      const time = MakeTime(new Date(ms))
      at = { time, moon: Equator(Body.Moon, time, observer, true, true) }
      cache.set(ms, at)
    }
    return at
  }
  const targets = [
    ...[...MOON_STARS, ALCYONE].map((star) => ({ name: star.name, position: (time: AstroTime) => starEquatorial(star, time), magnitude: () => star.magnitude, perYear: 0.4 })),
    ...BRIGHT_PLANETS.map(({ name, body }) => ({ name, position: (time: AstroTime) => Equator(body, time, observer, true, true),
      magnitude: (time: AstroTime) => Illumination(body, time).mag, perYear: 0.2 })),
  ]

  return targets.flatMap((target) => {
    const look = (ms: number) => {
      const { time, moon } = moonAt(ms), object = target.position(time)
      const gap = AngleBetween(moon.vec, object.vec) - Math.asin(MOON_RADIUS_AU / moon.dist) * DEG
      return { time, moon, object, gap }
    }
    const gap = (ms: number) => look(ms).gap
    if (gap(middle) > 1 + 0.5 * (end - start) / HOUR) return []

    // Bracket the local minimum against the moving limb before looking for the two contact times.
    let low = start, best = gap(start)
    for (let ms = start + STEP; ms <= end; ms += STEP) {
      const g = gap(ms)
      if (g < best) { low = ms; best = g }
    }
    if (best > 0.2) return []
    const closest = minimum(low - STEP, low + STEP, gap)
    // The ephemeris and circular limb are approximate. Leave two arcminutes of clearance inside the disk.
    if (gap(closest) > -2 / 60) return []

    return [-1, 1].flatMap((side) => {
      const outside = closest + side * 2 * HOUR
      if (gap(outside) <= 0) return []
      const ms = crossing(Math.min(closest, outside), Math.max(closest, outside), gap)
      if (ms < from || ms > sky.to || sky.sunAt(ms).altitude >= -6) return []
      const { time, moon, object } = look(ms)
      if (!darkLimb(moon.vec, object.vec, Equator(Body.Sun, time, observer, true, true).vec)) return []
      const { azimuth, altitude } = Horizon(time, observer, object.ra, object.dec)
      const where = { azimuth, altitude: apparentAltitude(altitude) }
      const illumination = moonIllumination(time.date).fraction, magnitude = target.magnitude(time)
      if (where.altitude < 12 || illumination > 0.93 || magnitude > 3 ||
        magnitude + 1.4 + 1.7 * illumination >= encounterLimit(sky, ms, where, illumination)) return []

      return [{ what: side < 0 ? `הירח מסתיר את ${target.name}` : `${target.name} מגיח מאחורי הירח`,
        perYear: target.perYear, tell: 'at', approximateTime: true, from: ms, to: ms,
        sunBelow: -6, cloud: { thick: 0.35, all: 0.6 }, at: () => where }]
    })
  })
}
