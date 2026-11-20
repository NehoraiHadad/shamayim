import { bandBrightness, galacticToEquatorial, riftAt } from '../astro/galaxy'
import { PLANETS, planetPosition, type PlanetName } from '../astro/planets'
import { horizontalPosition } from '../astro/sun'
import { utcOf } from '../astro/utc'
import { hashId, seeded } from '../data/landmarks/hash'
import type { LocalTime } from '../domain/types'
import { smoothstep } from './ridgeLighting'
import { apparentAltitude } from './skyProjection'

/*
 * The night sky's true objects (C10): the planets at their true positions (a compact ephemeris, `astro/planets.ts`) shown
 * by their own brightness against the sky's, and the Milky Way at its true orientation (the galactic plane, `astro/
 * galaxy.ts`), shown only in a truly dark sky.
 */

const RAD = Math.PI / 180

export interface PlanetBody {
  name: PlanetName
  azimuth: number
  /** Apparent altitude (deg, refraction counted). */
  altitude: number
  magnitude: number
  /** 0–1: how plainly it shows against the sky (its magnitude under the sky's limit), before the land hides it. */
  alpha: number
}

export interface MilkyWayPoint {
  /** Galactic longitude (deg); the spine's and the edges' directions (deg). */
  l: number
  spine: { azimuth: number; altitude: number }
  upper: { azimuth: number; altitude: number }
  lower: { azimuth: number; altitude: number }
  /** 0–1 brightness of the band here, and how dark the Great Rift is down its middle. */
  bright: number
  rift: number
}

export interface NightSky {
  planets: PlanetBody[]
  /** 0–1: how plainly the Milky Way shows (0: not at all); its band when it shows. */
  milkyWay: { strength: number; band: MilkyWayPoint[] }
}

export interface NightSkyInput {
  at: LocalTime
  timezone: string
  lat: number
  lon: number
  placeId: string
  sun: { altitude: number }
  moon: { altitude: number; illumination: number }
  /** The clear share of the sky (0–1). */
  starsThrough: number
  visibilityKm: number
  /** The towns' artificial sky glow (`placeEnv`). */
  glow: number
}

/**
 * The faintest magnitude a point of light shows at against the twilight or night sky (the towns' glow left out: it does
 * not hide planets): Venus (−4) by sunset, Jupiter (−2) a little after, the first-magnitude stars, Saturn and a far Mars by
 * the middle of civil twilight's end, and so on down to ~6 in full night; a bright moon high up costs about a magnitude.
 */
export function skyLimit(sunAlt: number, moon: { altitude: number; illumination: number }): number {
  const knots: [number, number][] = [[3, -4.8], [0, -4.1], [-2, -3.0], [-4, -1.2], [-6, 0.8], [-8, 2.5], [-10, 3.8], [-12, 4.8], [-15, 5.6], [-18, 6.2]]
  let lm = knots.at(-1)![1]
  if (sunAlt >= knots[0][0]) lm = knots[0][1] - (sunAlt - knots[0][0]) * 0.1
  else {
    for (let i = 1; i < knots.length; i++) {
      const [a0, m0] = knots[i - 1], [a1, m1] = knots[i]
      if (sunAlt >= a1) { lm = m0 + ((m1 - m0) * (a0 - sunAlt)) / (a0 - a1); break }
    }
  }
  return lm - 1.1 * moon.illumination * smoothstep(-2, 15, moon.altitude) * smoothstep(-6, -12, sunAlt)
}

/** Extinction (mag) of a light low over the horizon: ~0.25 mag an airmass in clean air, more in haze. */
function extinction(altitude: number, visibilityKm: number): number {
  const h = Math.max(0.5, altitude)
  const airmass = 1 / Math.sin((h + 244 / (165 + 47 * h ** 1.1)) * RAD)
  return (0.2 + 6 / Math.max(3, visibilityKm)) * (airmass - 1)
}

/** The planets in the sky at the shown minute, by their own brightness; Mercury only when it is well placed. */
export function planetsOf(input: NightSkyInput): PlanetBody[] {
  const instant = utcOf(input.at, input.timezone)
  const limit = skyLimit(input.sun.altitude, input.moon)
  const out: PlanetBody[] = []
  for (const name of PLANETS) {
    const p = planetPosition(name, instant)
    if (name === 'mercury' && (p.elongation < 18 || input.sun.altitude > -6)) continue
    const { altitude, azimuth } = horizontalPosition(p, instant, input.lat, input.lon)
    const apparent = apparentAltitude(altitude)
    if (apparent < 0.5) continue
    const m = p.magnitude + extinction(apparent, input.visibilityKm)
    // Cloud hides it as it hides the stars: a seeded draw against the clear share (the same planet stays as the cover changes).
    const gate = seeded(hashId(`planet:${name}`))()
    if (gate >= input.starsThrough) continue
    const alpha = smoothstep(0, 1.6, limit - m)
    if (alpha < 0.04) continue
    out.push({ name, azimuth, altitude: apparent, magnitude: p.magnitude, alpha })
  }
  return out
}

/**
 * How plainly the Milky Way shows (0–1): only in a truly dark sky: astronomical night (the sun below ~−15°), no moon up
 * (or a thin one), a clear and clean sky, and far from the towns' light (their glow, by the place's surroundings).
 */
export function milkyWayStrength(input: NightSkyInput): number {
  const night = smoothstep(-13, -17, input.sun.altitude)
  const moonLight = input.moon.illumination * smoothstep(-3, 3, input.moon.altitude)
  const noMoon = 1 - smoothstep(0.03, 0.2, moonLight)
  const clear = smoothstep(0.7, 0.95, input.starsThrough) * smoothstep(12, 25, input.visibilityKm)
  const dark = 1 - smoothstep(0.25, 1.2, input.glow)
  return night * noMoon * clear * dark
}

/** The band of the Milky Way in the sky now: its spine and edges every 4° of galactic longitude, at their true places. */
export function milkyWayBand(input: NightSkyInput): MilkyWayPoint[] {
  const instant = utcOf(input.at, input.timezone)
  const out: MilkyWayPoint[] = []
  const at = (l: number, b: number) => {
    const { altitude, azimuth } = horizontalPosition(galacticToEquatorial(l, b), instant, input.lat, input.lon)
    return { azimuth, altitude }
  }
  for (let l = 0; l < 360; l += 4) {
    // Wider toward the centre (the bulge), ~10° either side, ~6° toward the anticentre.
    const half = 6 + 6 * Math.exp(-0.5 * ((((l + 180) % 360) - 180) / 40) ** 2)
    out.push({ l, spine: at(l, 0), upper: at(l, half), lower: at(l, -half), bright: bandBrightness(l), rift: riftAt(l) })
  }
  return out
}

export function nightSkyOf(input: NightSkyInput): NightSky {
  const strength = milkyWayStrength(input)
  return { planets: planetsOf(input), milkyWay: { strength, band: strength > 0.02 ? milkyWayBand(input) : [] } }
}
