type Point = readonly [number, number]

/**
 * One sun for the whole scene (`?scene=25d`): every element takes its colour, its shadow side and whether it stands in
 * a ridge's shadow from here, so the ridges, the floor, the houses and the disc agree with each other.
 */

/** Kasten–Young relative air mass: how much air the light crosses at this altitude (1 at the zenith, ~38 at 0°). */
export function airMass(altitude: number) {
  const h = Math.max(-0.5, altitude)
  return 1 / (Math.sin(h * Math.PI / 180) + 0.50572 * (h + 6.07995) ** -1.6364)
}

/** Vertical optical depth per channel (R, G, B): Rayleigh scattering (∝ λ⁻⁴) plus a little clean-air aerosol. */
const DEPTH = [0.07, 0.12, 0.25] as const
const EXPOSURE = 4

/** Direct sunlight colour at this altitude, normalised to its brightest channel, and its relative strength (0..1). */
export function sunLight(altitude: number) {
  const m = airMass(altitude)
  const t = DEPTH.map((tau) => Math.exp(-tau * m))
  // The eye (like a camera) saturates on a bright sun: exposure tone-mapping keeps it white-yellow until it is low,
  // then it passes smoothly through gold and orange to red, with no step between them.
  const seen = t.map((v) => 1 - Math.exp(-EXPOSURE * v))
  const top = Math.max(...seen)
  const rgb = seen.map((v) => v / top) as [number, number, number]
  // Strength against noon, by luminance, so a low sun lights faces less as well as redder.
  const noon = DEPTH.map((tau) => Math.exp(-tau))
  const lum = (c: number[]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
  return { rgb, strength: Math.min(1, lum(t) / lum(noon)) }
}

export const rgbCss = ([r, g, b]: readonly number[]) =>
  `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`

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
  for (const [otherX, otherY] of points) {
    if ((otherX - x) * east > 0) clearance = Math.min(clearance, otherY - y + (otherX - x) * up / east)
  }
  return clearance
}

/** The ground height of a profile at x, by straight lines between samples. */
export function groundAt(points: readonly Point[], x: number) {
  const i = points.findIndex(([px]) => px >= x)
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

const mixRgb = (a: readonly number[], b: readonly number[], t: number) => a.map((v, i) => v + (b[i] - v) * t)

/**
 * What the rest of the scene takes from the sun at the shown minute: the light's colour (as a CSS custom property the
 * marks' lit faces mix in), the disc's look, which ground x (px) stands in a ridge's shadow, and cast-shadow length.
 */
/** The disc's look from the true altitude alone, so it is drawn the same way from the first moment it shows. */
export function discLook(altitude: number) {
  const { rgb, strength } = sunLight(altitude)
  // Limb darkening (stronger in blue): the rim of the disc is dimmer and redder than its centre.
  const core = mixRgb(rgb, [1, 1, 1], .5 * strength)
  const limb = rgb.map((v, i) => v * [.86, .78, .66][i])
  return { core: rgbCss(core), limb: rgbCss(limb), halo: rgbCss(rgb), flatten: sunFlattening(altitude) }
}
export type DiscLook = ReturnType<typeof discLook>

export function worldLight(light: { ray: Point | null; altitude: number } | null, near: readonly Point[], width: number,
  sceneW: number) {
  if (!light?.ray) return null
  const ray = light.ray
  const { rgb } = sunLight(light.altitude)
  return {
    style: { '--sun-light': `color-mix(in oklab, ${rgbCss(rgb)} 60%, var(--sky-horizon))` },
    shaded: (x: number) => inShadow(near, ray, x * sceneW / width),
    reach: shadowReach(ray),
  }
}

export type WorldLight = NonNullable<ReturnType<typeof worldLight>>
