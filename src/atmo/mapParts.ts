import type { AirInput, AirState, Particles } from './airTypes'

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp(t)
const ramp = (v: number, from: number, to: number) => clamp((v - from) / (to - from))
const NONE: Particles = { count: 0, speed: 0, length: 0, alpha: 0 }

const RAIN_CODES = (c: number) => (c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95

/** −1…1 on-screen drift: the scene looks north, so a westerly (from 270°) moves left → right. */
export function windU(direction: number): number {
  return -Math.sin((direction * Math.PI) / 180)
}

export function streaks(kmh: number, u: number): Particles {
  const t = ramp(kmh, 18, 52)
  if (t === 0) return NONE
  const along = Math.abs(u) < 0.35 ? 0.3 : 1
  return {
    count: Math.round(44 * t),
    speed: 12 * kmh,
    length: lerp(40, 220, ramp(kmh, 20, 52)) * along,
    alpha: lerp(0.24, 0.4, t),
  }
}

/** Current rain rate; a rain code with a near-zero rate still shows drizzle. */
export function rainRate(i: AirInput): number {
  if (i.snowfall > 0 && i.temperature <= 2) return 0
  return RAIN_CODES(i.weatherCode) && i.precipitation < 0.1 ? 0.2 : i.precipitation
}

export function rain(r: number, kmh: number, u: number, code: number): AirState['rain'] {
  if (r <= 0) return { ...NONE, slant: 0, breathe: false }
  const s = Math.sqrt(r)
  // Apparent fall speed (km/h-equivalent) tuned by eye: drizzle drifts, heavy rain stays rain-like.
  const fall = r < 0.5 ? 20 : 60
  const slant = Math.min((50 * Math.PI) / 180, Math.atan((kmh * Math.abs(u)) / fall))
  return {
    count: Math.round(Math.min(480, 90 * s)),
    length: Math.min(28, 6 + 5 * s),
    speed: Math.min(1600, 500 + 220 * s),
    alpha: lerp(0.18, 0.32, ramp(s, 0.3, 4.5)),
    slant: Math.sign(u || 1) * slant,
    breathe: code >= 80 && code <= 82,
  }
}

export function snow(cmh: number): AirState['snow'] {
  if (cmh <= 0) return { ...NONE, sway: 0 }
  const t = ramp(Math.sqrt(cmh), 0.1, 1.5)
  return { count: Math.round(Math.min(220, 90 * Math.sqrt(cmh))), speed: lerp(60, 120, t), length: lerp(1.5, 3, t), alpha: 0.7, sway: 12 }
}

/** Dust level: dust concentration when known, else PM10. */
const dustLevel = (i: AirInput) => i.dust ?? i.pm10 ?? 0

export function grains(i: AirInput): Particles {
  const d = dustLevel(i)
  if (d < 150) return NONE
  const t = ramp(d, 150, 500)
  return { count: Math.round(lerp(60, 200, t)), speed: Math.max(8, 6 * i.windSpeed), length: lerp(1, 1.5, t), alpha: lerp(0.12, 0.2, t) }
}

/** Visibility in km: the measured value, tightened by a rough dust estimate. */
export function visibilityKm(i: AirInput): number {
  const fromDust = i.pm10 ? 1300 / i.pm10 : 40
  return clamp(Math.min(i.visibilityKm ?? 40, fromDust), 1, 40)
}

export function haze(i: AirInput, r: number, hot: boolean): AirState['haze'] {
  const v = visibilityKm(i)
  const extra = r >= 20 ? 0.5 : r >= 7.5 ? 0.3 : 0
  const farFade = clamp(Math.pow(clamp(1 - (v - 3) / 22), 1.5) + extra)
  const nearFade = 0.6 * clamp(1 - (v - 1) / 5)
  const color = dustLevel(i) >= 50 ? '#D7BE8C' : r >= 0.5 ? '#6F8FA0' : hot ? '#F2CF92' : '#C9D2D8'
  return { farFade, nearFade, amount: farFade, color }
}

export function heat(i: AirInput, r: number): AirState['heat'] {
  const h = Math.max(i.temperature, i.feelsLike)
  const sunny = i.sunElevation > 15 && i.cloudCover < 60 && r === 0
  if (!sunny || h < 30) return { band: 0, amplitude: 0, bloom: 0 }
  const bloom = clamp((h - 30) / 14)
  if (h < 35) return { band: 0, amplitude: 0, bloom }
  const t = ramp(h, 35, 45)
  return { band: lerp(24, 56, t), amplitude: lerp(0.6, 1.8, t), bloom }
}

export function cloud(cover: number, r: number): AirState['cloud'] {
  const c = cover / 100
  const darken = Math.max(c > 0.85 ? (r > 2.5 ? 0.25 : 0.1) : 0, r >= 7.5 ? 0.08 : 0)
  // Linear, so 20% cover already shows a few separate clouds (smoothstep left anything under ~40% invisible).
  return { coverage: cover < 10 ? 0 : c, low: cover > 30, darken }
}

export function rays(i: AirInput, r: number): number {
  const e = i.sunElevation
  if (r > 0 || i.cloudCover < 30 || i.cloudCover > 75 || e < 4 || e > 30) return 0
  return 0.1 * (e < 10 ? ramp(e, 4, 10) : 1 - ramp(e, 10, 30))
}
