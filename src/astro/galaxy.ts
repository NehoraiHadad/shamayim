import type { EquatorialPosition } from './sun'

/*
 * The galactic frame (C10): where the Milky Way lies on the sky. IAU 1958 galactic coordinates, J2000 constants: the north
 * galactic pole at RA 192.85948°, Dec +27.12825°, and the north celestial pole at galactic longitude 122.93192°.
 */

const RAD = Math.PI / 180
const POLE_RA = 192.85948 * RAD
const POLE_DEC = 27.12825 * RAD
const NCP_L = 122.93192 * RAD

/** The equatorial position (J2000, radians) of a galactic longitude and latitude (deg). */
export function galacticToEquatorial(l: number, b: number): EquatorialPosition {
  const lr = l * RAD, br = b * RAD
  const sinDec = Math.sin(br) * Math.sin(POLE_DEC) + Math.cos(br) * Math.cos(POLE_DEC) * Math.cos(NCP_L - lr)
  const ra = POLE_RA + Math.atan2(Math.cos(br) * Math.sin(NCP_L - lr),
    Math.sin(br) * Math.cos(POLE_DEC) - Math.cos(br) * Math.sin(POLE_DEC) * Math.cos(NCP_L - lr))
  return { rightAscension: ((ra % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), declination: Math.asin(sinDec), distanceKm: Infinity }
}

/**
 * How bright the Milky Way's band is at a galactic longitude (0–1), as the naked eye sees it under a dark sky: brightest
 * toward the centre in Sagittarius and Scorpius (l 0 ± 30°), a second swell through Scutum, Aquila and Cygnus (l 20–80°),
 * faint toward the anticentre (l 180°), with the Great Rift dark lane along the band's middle from Cygnus to Sagittarius.
 */
export function bandBrightness(l: number): number {
  const d = (deg: number) => {
    const x = ((l - deg) % 360 + 540) % 360 - 180
    return x
  }
  const core = Math.exp(-0.5 * (d(0) / 28) ** 2)
  const cygnus = 0.55 * Math.exp(-0.5 * (d(70) / 25) ** 2)
  const carina = 0.45 * Math.exp(-0.5 * (d(285) / 22) ** 2)
  const base = 0.22 + 0.13 * Math.cos(l * RAD)
  return Math.min(1, base + core * 0.85 + cygnus + carina)
}

/** Whether the Great Rift's dark lane runs down the band's middle at this longitude (Cygnus to Sagittarius, l −10…75°). */
export const riftAt = (l: number) => {
  const x = ((l + 10) % 360 + 360) % 360
  return x <= 85 ? Math.sin((x / 85) * Math.PI) : 0
}
