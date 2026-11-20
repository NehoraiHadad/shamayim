import { seeded } from '../../data/landmarks/hash'
import type { AnimSpec, Pulse, Ramp, Track } from './types'

/**
 * The animation of a layer at `phase` (seconds from the loop's start, never the clock), applied when its cached canvas is
 * laid into the surface: how far it has drifted and how bright it is. Pure functions of the spec and the phase, so a frame
 * is the same pixels whenever it is drawn (the anidoodle contract).
 */

/** How far (surface px, in `0…period`) a drifting layer has moved at `phase`; 0 without a drift. */
export function driftAt(spec: AnimSpec | undefined, phase: number): number {
  if (!spec?.speed || !spec.period) return 0
  const d = (spec.speed * phase) % spec.period
  return d < 0 ? d + spec.period : d + 0
}

/** A flash's own light over time (s since it struck): a stroke, a dip, a weaker return stroke, then the fade. */
function stroke(t: number, twice: boolean): number {
  if (t < 0) return 0
  if (t < 0.06) return 1
  if (t < 0.12) return 1 - 0.75 * ((t - 0.06) / 0.06)
  if (twice && t < 0.2) return 0.25 + 0.55 * Math.sin(((t - 0.12) / 0.08) * Math.PI)
  const from = twice ? 0.2 : 0.12
  return t < from + 0.25 ? 0.25 * (1 - (t - from) / 0.25) : 0
}

/** The schedule repeats after this long (s): long enough that no one sees the pattern. */
const CYCLE = 600

/** The strike times (s) within one cycle and whether each strikes twice, seeded. */
export function strikes(pulse: Pulse): { at: number; twice: boolean }[] {
  const r = seeded(pulse.seed)
  const out: { at: number; twice: boolean }[] = []
  let t = pulse.first
  while (t < (pulse.cycle ?? CYCLE)) {
    out.push({ at: t, twice: r() < 0.4 })
    t += pulse.every[0] + (pulse.every[1] - pulse.every[0]) * r()
  }
  return out
}

/** A meteor's light over time (s since it began): flaring over 0.08 s, burning ~0.35 s, gone by 0.7 s. */
function meteorLight(t: number): number {
  if (t < 0) return 0
  if (t < 0.08) return t / 0.08
  if (t < 0.35) return 1
  return t < 0.7 ? 1 - (t - 0.35) / 0.35 : 0
}

/** The flash's alpha at `phase` (0 between flashes); 1 for a layer that does not pulse. */
export function flashAt(spec: AnimSpec | undefined, phase: number): number {
  const pulse = spec?.pulse
  if (!pulse) return 1
  const list = strikes(pulse)
  const t = phase % (pulse.cycle ?? CYCLE)
  let alpha = 0
  for (const s of list) {
    if (s.at > t) break
    alpha = Math.max(alpha, pulse.look === 'meteor' ? meteorLight(t - s.at) : stroke(t - s.at, s.twice))
  }
  return alpha
}

/** The frame of a strip laid at `phase` (C7): `floor(phase × fps)` round the strip; 0 without frames. */
export function frameAt(spec: AnimSpec | undefined, phase: number): number {
  const frames = spec?.frames
  if (!frames || frames.count <= 1) return 0
  return Math.floor(Math.max(0, phase) * frames.fps + 1e-6) % frames.count
}

/** The phase (s) a strip's frame `i` is painted at. */
export const framePhase = (spec: AnimSpec | undefined, i: number) => (spec?.frames ? i / spec.frames.fps : 0)

/** How many frames a layer's canvas holds (1 unless it is a strip). */
export const frameCount = (spec: AnimSpec | undefined) => Math.max(1, spec?.frames?.count ?? 1)

const wrapTo = (v: number, period: number) => {
  const m = v % period
  return m < 0 ? m + period : m + 0
}

/**
 * Where a falling tile's pattern stands at `phase` (C7, surface px within `0…tile`): carried by its fall speed (the wind
 * across, the fall down), swayed across by `sway` for snow. A pure function of the spec and the phase.
 */
export function fallAt(spec: AnimSpec | undefined, phase: number, tile: { w: number; h: number }): { x: number; y: number } {
  const fall = spec?.fall
  if (!fall) return { x: 0, y: 0 }
  const sway = fall.sway && fall.swayPeriod ? fall.sway * Math.sin((2 * Math.PI * phase) / fall.swayPeriod) : 0
  return { x: wrapTo(fall.vx * phase + sway, tile.w), y: wrapTo(fall.vy * phase, tile.h) }
}

/** Eased in and out (smoothstep), exactly 0 at or before 0 and exactly 1 at or past 1. */
export function ease(t: number): number {
  if (t <= 0) return 0
  if (t >= 1) return 1
  return t * t * (3 - 2 * t)
}

const progress = (at: number, dur: number, phase: number) => (dur > 0 ? (phase - at) / dur : phase >= at ? 1 : 0)

/** A ramp's value at `phase` (C8): `from` before `at`, `to` after `at + dur`, eased between. */
export function rampAt(ramp: Ramp, phase: number): number {
  return ramp.from + (ramp.to - ramp.from) * ease(progress(ramp.at, ramp.dur, phase))
}

/**
 * The alpha a layer is laid with at `phase` besides its flashes (C8): its fade (the land coming in, the mist going) and its
 * breath (the forming line). 1 for a layer with neither. Under reduced motion (`still`) the fade still runs (a simple fade
 * is all that is left of the arrival); the breath does not.
 */
export function fadeAt(spec: AnimSpec | undefined, phase: number, still = false): number {
  if (!spec) return 1
  const fade = spec.fade ? rampAt(spec.fade, phase) : 1
  const b = spec.breath && !still ? 1 - spec.breath.depth * 0.5 * (1 - Math.cos((2 * Math.PI * phase) / spec.breath.period)) : 1
  return Math.min(1, Math.max(0, fade * b))
}

/** How far (surface px) a gliding layer still stands off its place at `phase` (C8); 0 without a glide, or under reduced motion. */
export function glideAt(spec: AnimSpec | undefined, phase: number, still = false): number {
  const glide = spec?.glide
  if (!glide || still) return 0
  return glide.dy * (1 - ease(progress(glide.at, glide.dur, phase)))
}

/**
 * How far either side of `reveal.x` a forming layer reaches at `phase` (C8, surface px): 0 before `at`, everything at
 * `at + dur`, eased out (quick from the place, slowing toward the edges). Infinity for a layer with no reveal; under
 * reduced motion the whole layer (`still: 'whole'`) or none of it (`'hide'`, which gives −1).
 */
export function revealAt(spec: AnimSpec | undefined, phase: number, width: number, still = false): number {
  const reveal = spec?.reveal
  if (!reveal) return Infinity
  if (still) return reveal.still === 'whole' ? Infinity : -1
  const t = progress(reveal.at, reveal.dur, phase)
  if (t >= 1) return Infinity
  if (t <= 0) return 0
  const reach = Math.max(reveal.x, width - reveal.x) + reveal.feather
  return reach * (1 - (1 - t) ** 2.2)
}

/** The end (s of the phase) of the layers' timed arrival motions: the loop runs to it, even under reduced motion. */
export function settleEnd(specs: readonly (AnimSpec | undefined)[]): number {
  let end = 0
  for (const spec of specs) {
    if (!spec) continue
    if (spec.fade) end = Math.max(end, spec.fade.at + spec.fade.dur)
    if (spec.glide) end = Math.max(end, spec.glide.at + spec.glide.dur)
    if (spec.reveal) end = Math.max(end, spec.reveal.at + spec.reveal.dur)
  }
  return end
}

/**
 * Where a layer flying a track stands at `phase` (C10): its offset (surface px) from where it stands at phase 0, or null
 * while it is off the track (between passes). Under reduced motion (`still`) it stands at phase 0.
 */
export function trackAt(track: Track | undefined, phase: number, still = false): { x: number; y: number } | null {
  if (!track) return { x: 0, y: 0 }
  const t = still ? track.at : ((((phase + track.at) % track.cycle) + track.cycle) % track.cycle)
  const end = (track.path.length - 1) * track.step
  if (t > end + 1e-9 || track.path.length === 0) return null
  const f = track.step > 0 ? t / track.step : 0
  const i = Math.min(track.path.length - 1, Math.floor(f))
  const j = Math.min(track.path.length - 1, i + 1)
  const k = f - i
  const [x0, y0] = track.path[i], [x1, y1] = track.path[j]
  return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k }
}

/** The x range (surface px) a wake is laid over at `phase` (C10): from its tail to its plane, the whole trail once it has gone. */
export function wakeAt(spec: AnimSpec | undefined, phase: number, still = false): [number, number] | null {
  const wake = spec?.wake
  if (!wake) return null
  const at = trackAt(wake, phase, still)
  const last = wake.path.at(-1) ?? [0, 0]
  const head = wake.head + (at ? at.x : last[0])
  return [Math.min(wake.tail, head), Math.max(wake.tail, head)]
}
