import { HORIZON_Y, SCENE_W } from './sunPath'

/** Where a body at (altitude, azimuth) sits in the scene: the same east–west projection the sun's arc uses. */
export interface ScenePoint {
  /** Fraction of the scene width, 0 = west (left). */
  x: number
  /** px from the scene top; the horizon is HORIZON_Y, hidden behind the ridges. */
  y: number
}

const MID_X = SCENE_W / 2
/** Due east sits over the Gilead where the sun rises (x ≈ 322), due west over Samaria (x ≈ 53). */
const EAST_SPAN = 135
const ALT_SCALE = 66 / 90

/** True west–east position: the east component of the direction (sin of the azimuth from north). */
export function skyPoint(altitude: number, azimuth: number): ScenePoint {
  const east = Math.sin((azimuth * Math.PI) / 180)
  return { x: (MID_X + EAST_SPAN * east) / SCENE_W, y: HORIZON_Y - ALT_SCALE * altitude }
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

/**
 * How the moon shows, or null when it does not: below the ridges, a thin crescent by day, or a day sky too cloudy.
 * Cloud veils it through opacity only (gone at about 85% cover); haze takes it with the far ridge.
 */
export function moonLook(o: { altitude: number; fraction: number; sunAltitude: number; cloudCover: number; farFade: number }): MoonLook | null {
  if (o.altitude < -1.5) return null
  // −4° → night, +4° → day; in between the moon fades from bone to a pale disc at a third of its strength.
  const daylight = clamp01((o.sunAltitude + 4) / 8)
  if (daylight > 0.5 && (o.fraction < 0.15 || o.cloudCover > 60)) return null
  const veil = clamp01(1 - (o.cloudCover / 85) ** 1.5) * (1 - 0.9 * o.farFade)
  const opacity = veil * (1 - 0.65 * daylight)
  return opacity < 0.04 ? null : { opacity, daylight, ring: o.fraction < 0.25 }
}
