type Point = readonly [number, number]

/**
 * One sun for the whole scene (the default; `?scene=flat` turns it off): every element takes its colour, its shadow side and whether it stands in
 * a ridge's shadow from here, so the ridges, the floor, the houses and the disc agree with each other.
 */

/** Kasten–Young relative air mass: how much air the light crosses at this altitude (1 at the zenith, ~38 at 0°). */
export function airMass(altitude: number) {
  const h = Math.max(-0.5, altitude)
  return 1 / (Math.sin(h * Math.PI / 180) + 0.50572 * (h + 6.07995) ** -1.6364)
}

/** Vertical Rayleigh optical depth at 650, 550, 450 nm (∝ λ⁻⁴), a touch above sea-level values for −175 m. */
const RAYLEIGH = [0.055, 0.099, 0.222] as const
const WAVELENGTH = [650, 550, 450] as const
const EXPOSURE = 4

/** The hour's air: visibility (km) and whether its particles are coarse desert dust rather than fine haze. */
export interface Aerosol { visibilityKm?: number; dustWeight?: number }

/**
 * Vertical aerosol optical depth per channel from surface visibility. Koschmieder gives extinction 3.912 / V (km⁻¹);
 * less the air's own Rayleigh share, times a ~1.5 km mixed layer. The Ångström exponent sets how much more blue it
 * removes: fine haze (~1.3) reddens strongly, coarse dust (~0.3) is nearly grey and mostly dims.
 */
export function aerosolDepth({ visibilityKm = 40, dustWeight = 0 }: Aerosol = {}) {
  const extinction = Math.max(0, 3.912 / Math.max(1, visibilityKm) - 0.0116)
  const tau550 = extinction * 1.5
  const angstrom = 1.3 - dustWeight
  return WAVELENGTH.map((lambda) => tau550 * (lambda / 550) ** -angstrom)
}

/**
 * Direct sunlight colour at this altitude through this hour's air, normalised to its brightest channel, and its
 * strength against a clean noon (0..1). Dawn and dusk differ only as their air does: an evening of dust or haze
 * turns the sun deep red and dim, a clean morning keeps it pale.
 */
export function sunLight(altitude: number, air: Aerosol = {}) {
  const m = airMass(altitude)
  const aerosol = aerosolDepth(air)
  const depth = RAYLEIGH.map((tau, i) => tau + aerosol[i])
  const t = depth.map((tau) => Math.exp(-tau * m))
  // The eye adapts to the dimmer dawn and saturates on the disc: tone-mapped against its brightest channel, the sun
  // stays white-yellow until it is low, then passes smoothly through gold and orange to red.
  const bright = Math.max(...t)
  const seen = t.map((v) => 1 - Math.exp(-EXPOSURE * v / bright))
  const top = Math.max(...seen)
  const rgb = seen.map((v) => v / top) as [number, number, number]
  // Strength against noon, by luminance, so a low sun lights faces less as well as redder.
  const clean = aerosolDepth()
  const noon = RAYLEIGH.map((tau, i) => Math.exp(-tau - clean[i]))
  const lum = (c: number[]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
  return { rgb, strength: Math.min(1, lum(t) / lum(noon)) }
}

/**
 * The share of direct sunlight that this hour's haze lets through, against clean air at the same height (0..1):
 * how strongly anything can be sunlit, so heavy haze fades the light out instead of switching it off.
 */
export function hazeDirect(altitude: number, air: Aerosol) {
  const m = airMass(Math.max(.5, altitude))
  const extra = aerosolDepth(air)[1] - aerosolDepth()[1]
  return Math.exp(-Math.max(0, extra) * Math.min(m, 12))
}

/**
 * Refraction lifts the disc's lower limb more than its upper one, so near the horizon the sun is squashed: about 0.8
 * of its width at 0°, ~0.9 by 1.5°, round again above ~6°.
 */
export const sunFlattening = (altitude: number) => 1 - 0.2 * Math.exp(-Math.max(0, altitude) / 1.8)

/**
 * Smallest height of the land above the ray from (x, y) toward the sun (drawn units, y down). Negative: the ray
 * enters the land, so the point is in that ridge's shadow.
 */
export function clearanceOf(points: readonly Point[], x: number, y: number, [east, up]: Point) {
  if (Math.abs(east) <= .01) return Infinity
  let clearance = Infinity
  if (sorted(points)) {
    // Only the points toward the light count: on a profile sorted by x those are a run from x on (the same points and
    // the same sums as the scan below, so the same number; half the work, which a scrub frame repeats ~500 times).
    const from = east > 0 ? firstAtOrAfter(points, x) : 0
    const to = east > 0 ? points.length : firstAtOrAfter(points, x) + 1
    for (let i = from; i < Math.min(to, points.length); i++) {
      const [otherX, otherY] = points[i]
      if ((otherX - x) * east > 0) clearance = Math.min(clearance, otherY - y + (otherX - x) * up / east)
    }
    return clearance
  }
  for (const [otherX, otherY] of points) {
    if ((otherX - x) * east > 0) clearance = Math.min(clearance, otherY - y + (otherX - x) * up / east)
  }
  return clearance
}

/** Whether a profile's x never falls (checked once per array). */
const sortedness = new WeakMap<readonly Point[], boolean>()
function sorted(points: readonly Point[]) {
  let known = sortedness.get(points)
  if (known === undefined) {
    known = true
    for (let i = 1; i < points.length; i++) if (!(points[i - 1][0] <= points[i][0])) { known = false; break }
    sortedness.set(points, known)
  }
  return known
}

/** On a profile sorted by x: the first index whose x is ≥ x (its length when none is). */
function firstAtOrAfter(points: readonly Point[], x: number) {
  let lo = 0, hi = points.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (points[mid][0] >= x) hi = mid
    else lo = mid + 1
  }
  return lo
}

/** The ground height of a profile at x, by straight lines between samples. */
export function groundAt(points: readonly Point[], x: number) {
  const found = sorted(points) ? firstAtOrAfter(points, x) : -1
  const i = found >= 0 ? (found < points.length ? found : -1) : points.findIndex(([px]) => px >= x)
  if (i <= 0) return points[Math.max(0, i)]?.[1] ?? 0
  const [[ax, ay], [bx, by]] = [points[i - 1], points[i]]
  return ay + (by - ay) * (x - ax) / (bx - ax || 1)
}

/** Whether the ground at x stands in the shadow of the land toward the sun (a 2-unit margin keeps crests lit). */
export const inShadow = (points: readonly Point[], ray: Point, x: number) =>
  clearanceOf(points, x, groundAt(points, x) - 2, ray) < 0

/** How far a body's cast shadow reaches per unit of its height: long at a low sun, short when it climbs. */
export const shadowReach = (ray: Point | null) =>
  ray ? Math.min(3, Math.abs(ray[0]) / Math.max(ray[1], .05)) : .4
