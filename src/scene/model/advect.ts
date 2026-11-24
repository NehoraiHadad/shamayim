import { rowValues } from './rowValues'
import type { Advect, AnimSpec, LayerOf, LifeClock } from './types'

/*
 * The wind's carry between minutes (`Advect`): the field is drawn at the shown minute, and until the next minute's model
 * takes over its layers are laid moving with the wind, the sky and the shadows it casts on one clock. Pure: the model's
 * numbers and the phase.
 */

/** Longest a layer is carried past its minute (s): a held minute's clouds stop a little after the minute's end. */
const CARRIED_MAX_S = 75
/** A band's height (surface px): its speed differs from its neighbours' by so little that no seam opens between them. */
const BAND_PX = 6

/** The phase at which the shown minute began: the field's snapshot time on the scene clock. */
export const minuteStart = (life: LifeClock) => life.laidAt - life.sinceS

/**
 * Seconds a layer has been carried at `phase`: 0 before its minute, without an advection or under reduced motion (the
 * minute as the field drew it), at most `CARRIED_MAX_S`.
 */
export function carriedS(spec: AnimSpec | undefined, phase: number, still = false): number {
  const advect = spec?.advect
  return advect && !still ? Math.min(CARRIED_MAX_S, Math.max(0, phase - advect.from)) : 0
}

/**
 * How fast the wind carries a point across the view, px/s: its azimuth's rate of change, `vel` (east, north km/min) across
 * the unit `look` (east, north) at `rangeKm`, times `pxPerRad` (signed: + when x grows with azimuth).
 */
export function acrossSpeed(vel: readonly [number, number], look: readonly [number, number], rangeKm: number, pxPerRad: number) {
  if (!(rangeKm > 0)) return 0
  return ((look[1] * vel[0] - look[0] * vel[1]) / rangeKm / 60) * pxPerRad
}

/** Surface px per radian of azimuth at `x`, signed: + when x grows with azimuth. */
export function pxPerRadAt(azimuthAt: (x: number) => number, x: number): number {
  const turn = ((azimuthAt(x + 1) - azimuthAt(x) + 540) % 360) - 180
  return turn ? 180 / Math.PI / turn : 0
}

/** A sheet laid moving with its wind from the minute's start (`from`, a phase): bands down its rows, each at its speed, and what of it
 *  is under eye level (`below` px) at its last row's. */
export function carriedSheet(given: LayerOf<'cloudSheet'>, from: number, below = 0): LayerOf<'cloudSheet'> {
  const { ys, speeds, bounds } = given
  const sheet = below > 0 ? { ...given, below, bounds: { ...bounds, h: bounds.h + below } } : given
  return carried(sheet, from, ys[0], ys[ys.length - 1] + Math.max(0, below), rowValues(ys, speeds))
}

/** Towers carried as one: the median of their speeds (a tower spans many bands; per band it would shear). */
export function carriedCells(layer: LayerOf<'cloudCells'>, from: number): LayerOf<'cloudCells'> {
  const speeds = layer.cells.map((cell) => cell.speed).sort((a, b) => a - b)
  const speed = speeds[Math.floor(speeds.length / 2)] ?? 0
  const { y, h } = layer.bounds
  return carried(layer, from, y, y + h, () => speed)
}

/** `layer` with an advection from `top` to `bottom` (surface px) in `BAND_PX` bands; as it was if nothing moves. */
function carried<L extends LayerOf<'cloudSheet' | 'cloudCells'>>(layer: L, from: number, top: number, bottom: number,
  speedOf: (y: number) => number): L {
  const bands: { y: number; speed: number }[] = []
  for (let y = top; y < bottom; y += BAND_PX) bands.push({ y, speed: speedOf(y + BAND_PX / 2) })
  if (!bands.some((band) => band.speed)) return layer
  const advect: Advect = { from, bands }
  return { ...layer, animated: { ...layer.animated, mode: 'drift', advect } }
}
