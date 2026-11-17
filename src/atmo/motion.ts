import type { AirState } from './airTypes'
import { FIELDS, type FieldName } from './gl/particles'
import { clamp } from './mapParts'

/** Numbers the renderer animates between states. */
export interface Scalars {
  rainD: number; rainV: number; rainL: number; rainA: number; slant: number
  snowD: number; snowV: number; snowL: number
  grainD: number; grainV: number; grainA: number
  streakD: number; streakV: number; streakL: number; streakA: number
  u: number; kmh: number; gust: number; drift: number
  coverage: number; low: number; darken: number; haze: number
  heatBand: number; heatAmp: number; bloom: number; rays: number; coin: number
}

export function scalarsOf(s: AirState): Scalars {
  const d = (n: FieldName, count: number) => count / FIELDS[n].cap
  return {
    rainD: d('rain', s.rain.count), rainV: s.rain.speed, rainL: s.rain.length, rainA: s.rain.alpha, slant: s.rain.slant,
    snowD: d('snow', s.snow.count), snowV: s.snow.speed, snowL: s.snow.length,
    grainD: d('grains', s.grains.count), grainV: s.grains.speed, grainA: s.grains.alpha,
    streakD: d('streaks', s.streaks.count), streakV: s.streaks.speed, streakL: s.streaks.length, streakA: s.streaks.alpha,
    u: s.wind.u, kmh: s.wind.kmh, gust: s.wind.gustExcess, drift: s.wind.cloudDrift,
    coverage: s.cloud.coverage, low: s.cloud.low ? 1 : 0, darken: s.cloud.darken, haze: s.haze.amount,
    heatBand: s.heat.band, heatAmp: s.heat.amplitude, bloom: s.heat.bloom, rays: s.rays.alpha, coin: s.sunCoin,
  }
}

/** The same state with every particle field empty (the intro ramps them in). */
export function withoutParticles(s: AirState): AirState {
  const z = { count: 0 }
  return { ...s, rain: { ...s.rain, ...z }, snow: { ...s.snow, ...z }, grains: { ...s.grains, ...z }, streaks: { ...s.streaks, ...z } }
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

/**
 * Moves between air states without pops, and adds the timed events: gust swells,
 * shower breathing and in-cloud flashes. All randomness is seeded.
 */
export class AirMotion {
  cur: Scalars
  private from: Scalars
  private to: Scalars
  private t0 = 0
  /** When the last glide started (s). */
  get lastSet() { return this.t0 }
  private dur = 1
  private seed = 99
  private nextGust = 2
  private nextFlash = 12
  breathe = false
  thunder = false
  gustEnv = 0
  flash = 0
  travel: Record<FieldName, number> = { rain: 0, snow: 0, grains: 0, streaks: 0 }
  drift = 0

  constructor(s: AirState) {
    this.cur = this.from = this.to = scalarsOf(s)
    this.setFlags(s)
  }

  private rand() { return (this.seed = (this.seed * 16807) % 2147483647) / 2147483647 }
  private setFlags(s: AirState) { this.breathe = s.rain.breathe; this.thunder = s.thunder }

  /** Glide to a new state over `ms` (320 for a preview, 520 back, 1600 for live updates). */
  set(s: AirState, now: number, ms: number) {
    this.from = { ...this.cur }
    this.to = scalarsOf(s)
    this.t0 = now
    this.dur = Math.max(1, ms)
    this.setFlags(s)
  }

  /** Advance to time `t` (s) by `dt` (s). */
  step(t: number, dt: number) {
    const k = ease(clamp((t - this.t0) / (this.dur / 1000)))
    const c = {} as Scalars
    for (const key of Object.keys(this.to) as (keyof Scalars)[]) c[key] = this.from[key] + (this.to[key] - this.from[key]) * k
    this.cur = c

    if (c.gust > 0 && t >= this.nextGust) {
      this.lastGust = t
      this.nextGust = t + 5 + 4 * this.rand()
    }
    if (this.thunder && t >= this.nextFlash) {
      this.lastFlash = t
      this.nextFlash = t + 9 + 16 * this.rand()
    }
    const g = t - this.lastGust
    this.gustEnv = c.gust > 0 ? (g < 0.3 ? g / 0.3 : Math.max(0, 1 - (g - 0.3) / 0.9)) : 0
    const f = t - this.lastFlash
    this.flash = !this.thunder ? 0 : f < 0.08 ? 0.12 : f < 0.2 ? 0.12 * (1 - (f - 0.08) / 0.12) : 0

    const windEff = c.kmh + c.gust * this.gustEnv
    const gustK = c.kmh > 0 ? windEff / c.kmh : 1
    this.travel.rain += c.rainV * dt
    this.travel.snow += Math.hypot(c.snowV, 4 * c.kmh * c.u) * dt
    this.travel.grains += c.grainV * gustK * dt
    this.travel.streaks += c.streakV * gustK * dt
    this.drift += c.drift * dt
  }

  private lastGust = -100
  private lastFlash = -100
}
