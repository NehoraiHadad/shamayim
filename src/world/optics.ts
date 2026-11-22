import type { Covers } from './clouds'
import { smoothstep } from './ridgeLighting'
import type { RainCell } from './types'

/*
 * The sky's optics (C10), by the geometry of light in drops and ice:
 * - **rainbow**: sunlight refracted and reflected once inside raindrops comes back at 42° (red 42.3°, violet 40.6°) round
 *   the antisolar point; a second reflection makes the secondary bow at 50–53.5°, its colours reversed and about 43 % as
 *   bright (Alexander's dark band between). It needs rain in front of the eye and the sun behind it, low (under 42°, or the
 *   whole primary is below the horizon) and shining on the rain unblocked. Where along the bow the rain is, the bow is.
 * - **22° halo and sun dogs**: sunlight through the 60° prisms of hexagonal ice crystals in thin high cloud (cirrus,
 *   cirrostratus) over the sun; randomly turned columns make the ring at 22° (red inside), plates falling flat the two
 *   parhelia level with the sun, moving out from 22° as it climbs and gone by ~60°. A thick lower deck hides both.
 */

const RAD = Math.PI / 180

/** Radii (deg) of the primary bow's violet and red edges and the secondary's red and violet. */
export const BOW = { primary: [40.6, 42.3], secondary: [50.1, 53.6] } as const
export const HALO_DEG = 22

/** Ice's refractive index for visible light (the halo's and the sun dogs' minimum deviation). */
const ICE_N = 1.31

/**
 * How far (deg of azimuth) a sun dog stands from the sun at its altitude: plates refract light through their 60° side faces
 * at an inclination equal to the sun's height, so the effective index is √(n² − sin²h)/cos h and the deviation grows from
 * 21.8° at the horizon; none above ~60° (the rays no longer get through).
 */
export function sunDogOffset(sunAltitude: number): number | null {
  const h = sunAltitude * RAD
  const n = Math.sqrt(ICE_N * ICE_N - Math.sin(h) ** 2) / Math.cos(h)
  const s = n * Math.sin(30 * RAD)
  if (s >= 1) return null
  return 2 * Math.asin(s) / RAD - 60
}

/**
 * A point at angular distance `radius` (deg) from a centre (azimuth, altitude) in the direction `theta` (rad, 0 straight up
 * toward the zenith, + turning clockwise as seen, i.e. toward greater azimuth): spherical trigonometry on the sky.
 */
export function onCircle(centre: { azimuth: number; altitude: number }, radius: number, theta: number): { azimuth: number; altitude: number } {
  const a = centre.altitude * RAD, r = radius * RAD
  const sinAlt = Math.sin(a) * Math.cos(r) + Math.cos(a) * Math.sin(r) * Math.cos(theta)
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)))
  const dAz = Math.atan2(Math.sin(theta) * Math.sin(r) * Math.cos(a), Math.cos(r) - Math.sin(a) * sinAlt)
  return { azimuth: centre.azimuth + dAz / RAD, altitude: alt / RAD }
}

/** The angular distance (deg) between two directions on the sky. */
export function separation(p: { azimuth: number; altitude: number }, q: { azimuth: number; altitude: number }): number {
  const c = Math.sin(p.altitude * RAD) * Math.sin(q.altitude * RAD) +
    Math.cos(p.altitude * RAD) * Math.cos(q.altitude * RAD) * Math.cos((p.azimuth - q.azimuth) * RAD)
  return Math.acos(Math.max(-1, Math.min(1, c))) / RAD
}

export interface Rainbow {
  /** 0–1 of the primary; the secondary is drawn at `secondary`. */
  strength: number
  secondary: number
  /** The antisolar point (below the horizon by the sun's height). */
  antisolar: { azimuth: number; altitude: number }
  /** Where the rain is (azimuth ranges, deg) and how much rain there is round the eye beyond them (0–1). */
  rain: { from: number; to: number }[]
  around: number
}

export interface Halo {
  strength: number
  /** The sun dogs' strength and their offset in azimuth (deg) from the sun; null when the sun is too high. */
  dogs: number
  dogOffset: number | null
  sun: { azimuth: number; altitude: number }
}

export interface Optics { rainbow: Rainbow | null; halo: Halo | null }

export interface OpticsInput {
  sun: { azimuth: number; altitude: number }
  /** The sun's direct light on the scene (0–1, after the cloud in front of it) and whether it lights it at all. */
  direct: number
  eye?: number
  sunLights: boolean
  covers: Covers
  rain: { rateMmH: number; cells: readonly RainCell[] } | null
  /** Dust turns the sun into a coin: no bow, no halo. */
  coin: number
}

/** A rainbow when rain coincides with a low sun shining unblocked from behind the eye; none otherwise. */
export function rainbowOf(input: OpticsInput): Rainbow | null {
  const { sun } = input
  if (!input.rain || !input.rain.cells.length || !input.sunLights) return null
  // The sun must be up and lower than the bow's radius, or the bow is all below the horizon.
  const low = smoothstep(0, 2, sun.altitude) * (1 - smoothstep(38, 42, sun.altitude))
  const lit = smoothstep(0.25, 0.6, input.direct) * (1 - input.coin)
  const drops = smoothstep(0.05, 0.8, input.rain.rateMmH)
  const strength = low * lit * (0.45 + 0.55 * drops)
  if (strength < 0.05) return null
  return {
    strength,
    secondary: strength * 0.43 * smoothstep(0.4, 0.7, strength),
    antisolar: { azimuth: (sun.azimuth + 180) % 360, altitude: -sun.altitude },
    rain: input.rain.cells.map((c) => ({ from: c.fromAzimuth, to: c.toAzimuth })),
    around: 0.25 * drops,
  }
}

/** A 22° halo and sun dogs when thin high cloud veils the sun and no thick deck hides it. */
export function haloOf(input: OpticsInput): Halo | null {
  const { sun, covers } = input
  const veil = smoothstep(0.4, 0.75, covers.high)
  const thick = 1 - (1 - covers.low) * (1 - covers.mid)
  const seen = 1 - smoothstep(0.2, 0.5, thick)
  const strength = veil * seen * smoothstep(0, 3, sun.altitude) * (1 - input.coin) * (input.eye ?? 1)
  if (strength < 0.05) return null
  const dogOffset = sunDogOffset(sun.altitude)
  return { strength, dogs: dogOffset === null ? 0 : strength * (1 - smoothstep(35, 58, sun.altitude)), dogOffset, sun }
}

export function opticsOf(input: OpticsInput): Optics {
  return { rainbow: rainbowOf(input), halo: haloOf(input) }
}
