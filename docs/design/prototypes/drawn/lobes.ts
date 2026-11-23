import { rng } from '../../../../src/scene/paint/shared/base/core'
import { css, type Ctx2D } from '../../../../src/scene/paint/shared/base/hand'
import type { RGB } from '../../../../src/scene/model/types'

/*
 * A cloud mass as lobes of cut paper: round discs inscribed in the mass the model gives, the largest first, each stepping
 * a little over its edge on top and lying flat at the foot. They are laid from the mass's lit top to its shaded foot in a
 * few flat values, each lobe with a paler cap. Pure: the mask and the seed.
 */

/** A mass on a grid: over 0 inside, `side` its place in the mass (1 top … -1 foot), `most` a row's largest lobe (cells). */
export interface Mass { cols: number; rows: number; at: Float32Array; side: Float32Array; most: (row: number) => number; seed: number }
export interface Lobe { x: number; y: number; r: number; side: number }
/** A value of the mass: the place in it a lobe takes it down to, its plane and its caps. */
export interface Value { down: number; rgb: RGB; cap: RGB }
interface Place { x: number; y: number; step: number; toward: number }

/** A lobe's most against its distance to the edge: a round mass is several lobes, not one ball. */
const INNER = 0.78
const DIAG = Math.SQRT2, LEAST = 1.15, APART = 0.62, BIN = 12
/** How far a lobe swells (against its radius); it rises by as much, so that its foot stays in the mass. */
const OVER = 0.3
const CAP = 0.84, CAP_UP = 0.17, CAP_ACROSS = 0.12, CAP_LEAST = 2.5
/** Lobes smaller than this share of their row's most stand only on a top; none stand at the foot or in the far rows (cells). */
const SMALL = 0.42, TOP = 0.05, FOOT = -0.5, NEAR = 6

/** Each cell's distance to the mass's edge (cells): two passes over its neighbours. */
function inside({ cols, rows, at }: Mass): Float32Array {
  const d = Float32Array.from(at, (v) => (v > 0 ? 1e6 : 0))
  for (const by of [1, -1]) {
    for (let q = 0; q < rows * cols; q++) {
      const n = by > 0 ? q : rows * cols - 1 - q, i = n % cols, j = (n - i) / cols
      if (!d[n]) continue
      const was = i - by >= 0 && i - by < cols, will = i + by >= 0 && i + by < cols, above = j - by >= 0 && j - by < rows
      let v = d[n]
      if (was) v = Math.min(v, d[n - by] + 1)
      if (above) {
        const back = n - by * cols
        v = Math.min(v, d[back] + 1)
        if (was) v = Math.min(v, d[back - by] + DIAG)
        if (will) v = Math.min(v, d[back + by] + DIAG)
      }
      d[n] = v
    }
  }
  return d
}

export function lobesOf(mass: Mass): Lobe[] {
  const { cols, rows, seed } = mass, d = inside(mass), found: Lobe[] = []
  for (let j = 0; j < rows; j++) {
    const most = mass.most(j), step = Math.max(1, Math.floor(most / 5))
    if (j % step || most < NEAR) continue
    for (let i = (j / step) % 2 ? step >> 1 : 0; i < cols; i += step) {
      const n = j * cols + i
      if (d[n] < LEAST || mass.side[n] < FOOT) continue
      const r = Math.min(INNER * d[n], most * (0.5 + 0.5 * rng(seed + i * 7919 + j * 104729)()))
      if (r >= SMALL * most || mass.side[n] > TOP) found.push({ x: i, y: j, r, side: mass.side[n] })
    }
  }
  found.sort((a, b) => b.r - a.r)
  const bins = new Map<number, Lobe[]>(), key = (x: number, y: number) => Math.floor(y / BIN) * 4096 + Math.floor(x / BIN)
  const kept = found.filter((l) => {
    const reach = Math.ceil((mass.most(l.y) * 1.1) / BIN)
    for (let v = -reach; v <= reach; v++) {
      for (let u = -reach; u <= reach; u++) {
        for (const k of bins.get(key(l.x + u * BIN, l.y + v * BIN)) ?? []) {
          if (Math.hypot(k.x - l.x, k.y - l.y) < APART * k.r + 0.3 * l.r) return false
        }
      }
    }
    const at = key(l.x, l.y)
    bins.set(at, [...(bins.get(at) ?? []), l])
    return true
  })
  return agreed(kept).map((l) => {
    const r = l.r * (1 + OVER * (0.6 + 0.6 * rng(seed + l.x * 31 + l.y * 6151)()))
    return { ...l, r, y: l.y - (r - l.r) }
  })
}

/** Each lobe's place taken with its neighbours': a value is a group of lobes, not one ball. */
function agreed(lobes: readonly Lobe[]): Lobe[] {
  return lobes.map((l) => {
    let sum = 0, whole = 0
    for (const k of lobes) {
      if (Math.abs(k.y - l.y) > 1.2 * (k.r + l.r) || Math.hypot(k.x - l.x, k.y - l.y) > 1.2 * (k.r + l.r)) continue
      sum += k.side * k.r
      whole += k.r
    }
    return { ...l, side: 0.5 * l.side + 0.5 * (sum / whole) }
  })
}

/** The lobes value by value, the mass's top first, so that a lower one stands before it. */
export function paintLobes(ctx: Ctx2D, lobes: readonly Lobe[], values: readonly Value[], f: Place) {
  let from = Infinity
  for (const value of values) {
    const mine = lobes.filter((l) => l.side <= from && l.side > value.down)
    from = value.down
    plane(ctx, mine, 1, 0, 0, value.rgb, f)
    plane(ctx, mine.filter((l) => l.r > CAP_LEAST), CAP, f.toward * CAP_ACROSS, -CAP_UP, value.cap, f)
  }
}

function plane(ctx: Ctx2D, lobes: readonly Lobe[], by: number, dx: number, dy: number, rgb: RGB, f: Place) {
  if (!lobes.length) return
  ctx.beginPath()
  for (const l of lobes) {
    const x = f.x + (l.x + dx * l.r) * f.step, y = f.y + (l.y + dy * l.r) * f.step, r = l.r * by * f.step
    ctx.moveTo(x + r, y)
    ctx.ellipse(x, y, r, r * 0.94, 0, 0, Math.PI * 2)
  }
  ctx.fillStyle = css(rgb)
  ctx.fill()
}
