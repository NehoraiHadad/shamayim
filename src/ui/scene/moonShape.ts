import { altitudeY, FLAT_SKYLINE, type Skyline } from './skyline'
import { SCENE_W } from './sceneBox'

/** Where a body at (altitude, azimuth) sits in the scene: the same east–west projection the sun's arc uses. */
export interface ScenePoint {
  /** Fraction of the scene width, 0 = west (left). */
  x: number
  /** px from the scene top; 0° altitude sits on the drawn ridge at x. */
  y: number
}

const MID_X = SCENE_W / 2
/** Due east sits over the Gilead where the sun rises (x ≈ 322), due west over Samaria (x ≈ 53). */
const EAST_SPAN = 135

/**
 * West–east position, linear in the azimuth (east 90° → x ≈ 322, south → middle, west 270° → x ≈ 53), so a body that
 * rises north of east keeps moving one way across the sky. (The east component, sin(azimuth), folds back at due east
 * and due west: the moon then stopped at the end of its arc and dropped or climbed straight down.)
 */
export function skyPoint(altitude: number, azimuth: number, skyline: Skyline = FLAT_SKYLINE): ScenePoint {
  const fromSouth = ((((azimuth - 180) % 360) + 540) % 360) - 180
  const x = (MID_X - (EAST_SPAN * fromSouth) / 90) / SCENE_W
  return { x, y: altitudeY(skyline, x, altitude) }
}

/**
 * Where the sun points from, for turning the moon's lit side only: the east component (sin of the azimuth), which stays
 * continuous while the sun passes north below the horizon at midnight (the linear position would jump edge to edge).
 */
export function sunDirection(altitude: number, azimuth: number, skyline: Skyline = FLAT_SKYLINE): ScenePoint {
  const x = (MID_X + EAST_SPAN * Math.sin((azimuth * Math.PI) / 180)) / SCENE_W
  return { x, y: altitudeY(skyline, x, altitude) }
}

/**
 * Outline of the lit part of a disc of radius r centred on (0, 0), lit side towards +x (rotate it into place).
 * Lit limb: a semicircle. Terminator: a half-ellipse whose width follows the lit fraction, so the shape
 * changes continuously from a hairline crescent through the half moon to the full disc.
 */
export function litPath(fraction: number, r: number): string {
  const k = Math.min(1, Math.max(0, fraction))
  const rx = Math.abs(1 - 2 * k) * r
  // Crescent: the terminator bulges towards the lit side; gibbous: away from it.
  const sweep = k < 0.5 ? 0 : 1
  const f = (n: number) => Number(n.toFixed(3))
  return `M0 ${f(-r)} A${f(r)} ${f(r)} 0 0 1 0 ${f(r)} A${f(rx)} ${f(r)} 0 0 ${sweep} 0 ${f(-r)} Z`
}

/** Screen angle (degrees, SVG rotation) from the moon towards the sun: the lit limb faces it. */
export function brightLimbAngle(moon: ScenePoint, sun: ScenePoint): number {
  const dx = (sun.x - moon.x) * SCENE_W
  const dy = sun.y - moon.y
  return (Math.atan2(dy, dx) * 180) / Math.PI
}

export interface MoonLook {
  opacity: number
  /** 0 at night (bone), 1 in full day (sky-pale); the colour and strength follow it through twilight. */
  daylight: number
  /** A faint full-disc ring so a thin crescent still reads as a moon. */
  ring: boolean
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smoothstep = (a: number, b: number, v: number) => { const k = clamp01((v - a) / (b - a)); return k * k * (3 - 2 * k) }

/**
 * The cloud that counts for the moon (0–100). With the layers known, low and mid cloud count in full and the thin high
 * cloud above them for a fifth (the moon shines through it, a little dimmed); without them, the whole cover.
 */
export function moonCloud(cloudCover: number, thickCloud?: number | null): number {
  if (thickCloud == null) return cloudCover
  const thick = Math.min(thickCloud, cloudCover)
  return thick + 0.2 * (cloudCover - thick)
}

/**
 * How the moon shows, or null when it does not: below the ridges, a thin crescent by day, or a day sky too cloudy.
 *
 * Cloud: the hour's cover is one number for the whole sky and counts thin high cloud too, which the moon shines through.
 * So it only veils from 40 % up, more and more, and a fully overcast sky hides it; a broken sky leaves it almost whole.
 * (It used to fade from the first cloud: half cover left half a moon.)
 * Day: a moon in a clear day sky is plainly seen, the fuller the brighter; it keeps 50 % (a half moon) to 80 % (full)
 * of its night strength. Haze takes it with the far ridge.
 */
export function moonLook(o: { altitude: number; fraction: number; sunAltitude: number; cloudCover: number; farFade: number }): MoonLook | null {
  if (o.altitude < -4) return null
  // −4° → night, +4° → day; in between the moon fades from bone to its day look.
  const daylight = clamp01((o.sunAltitude + 4) / 8)
  if (daylight > 0.5 && (o.fraction < 0.15 || o.cloudCover > 85)) return null
  const veil = (1 - smoothstep(40, 100, o.cloudCover)) * (1 - 0.9 * o.farFade)
  const dayStrength = 0.35 + 0.45 * clamp01(o.fraction)
  const opacity = veil * (1 - daylight * (1 - dayStrength))
  return opacity < 0.04 ? null : { opacity, daylight, ring: o.fraction < 0.25 }
}
