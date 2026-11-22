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

/** A sheet laid moving with its wind from the minute's start (`from`, a phase): bands down its rows, each at its speed. */
export function carriedSheet(sheet: LayerOf<'cloudSheet'>, from: number): LayerOf<'cloudSheet'> {
  const { ys, speeds } = sheet
  return carried(sheet, from, ys[0], ys[ys.length - 1], (y) => speedAt(ys, speeds, y))
}

/** Add the sheet's advection from top to bottom in BAND_PX bands. */
function carried(layer: LayerOf<'cloudSheet'>, from: number, top: number, bottom: number,
  speedOf: (y: number) => number): LayerOf<'cloudSheet'> {
  const bands: { y: number; speed: number }[] = []
  for (let y = top; y < bottom; y += BAND_PX) bands.push({ y, speed: speedOf(y + BAND_PX / 2) })
  if (!bands.some((band) => band.speed)) return layer
  const advect: Advect = { from, bands }
  return { ...layer, animated: { ...layer.animated, mode: 'drift', advect } }
}

/** The speed at `y`, linear between the rows around it, the nearest row's beyond them; 0 with no rows. */
function speedAt(ys: readonly number[], speeds: readonly number[], y: number): number {
  if (ys.length < 2) return speeds[0] ?? 0
  let row = 0
  while (row + 2 < ys.length && ys[row + 1] < y) row++
  const h = ys[row + 1] - ys[row]
  const t = h > 0 ? Math.min(1, Math.max(0, (y - ys[row]) / h)) : 0
  return speeds[row] + (speeds[row + 1] - speeds[row]) * t
}
