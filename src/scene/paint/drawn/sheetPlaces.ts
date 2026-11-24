import { smoothstep } from '../../../domain/smoothstep'
import type { LayerOf } from '../../model/types'

/*
 * A sheet's own air on the screen: where a place over the ground stands, and how many px a km of cloud takes there, both read
 * between the model's nodes as the sheet's alpha is. Pure: the desc alone.
 */

type Sheet = LayerOf<'cloudSheet'>
/** A place on the sheet's sky: px, px for a km as the eye sees it (the mean of across and down), and how far it counts (0 … 1). */
interface Seen { x: number; y: number; perKm: number; there: number }

export interface Places {
  /** Where a place (km from the eye) is seen; null off the sheet, or nearest the zenith, which has no size. */
  seen: (east: number, north: number) => Seen | null
  /** Whether anything within `about` km of a place may be seen. */
  near: (east: number, north: number, about: number, from: number, to: number) => boolean
  /** The px for a km at each row, the first as at its nearest place, and the range (km) of that. */
  perKm: readonly number[]
  nearest: number
}

/** How far off the sheet's sides (in columns) a place still counts; where over its second row one begins to, and wholly does (of that row's range). */
const ASIDE = 2, BEGINS = 0.2, WHOLE = 0.5

/** An angle in -π … π. */
const wrapped = (a: number) => a - 2 * Math.PI * Math.round(a / (2 * Math.PI))

export function placesOf({ xs, ys }: Pick<Sheet, 'xs' | 'ys'>, { ranges, east, north }: NonNullable<Sheet['air']>): Places {
  const first = Math.atan2(east[0], north[0]), turn = wrapped(Math.atan2(east[1], north[1]) - first), step = xs[1] - xs[0]
  const last = ranges.length - 1, cols = xs.length - 1, perAngle = step / Math.abs(turn), nearest = Math.max(ranges[0], BEGINS * ranges[1])
  const perKm = ranges.map((range, r) => {
    const a = Math.max(1, r - 1), b = Math.min(last, r + 1)
    return r ? Math.sqrt((perAngle / range) * ((ys[b] - ys[a]) / Math.max(1e-6, ranges[b] - ranges[a]))) : 0
  })
  // Over the second row a km takes as much down as at it, and more across the nearer it is.
  const overhead = (range: number) => perKm[1] * Math.sqrt(ranges[1] / range)
  perKm[0] = overhead(nearest)
  const middle = first + (turn * cols) / 2, half = Math.abs(turn) * (cols / 2 + ASIDE)
  const [e0, n0, open] = [Math.sin(middle), Math.cos(middle), half >= Math.PI / 2 ? -1 : Math.cos(half)]
  return {
    perKm,
    nearest,
    near: (e, n, about, from, to) => {
      const range = Math.sqrt(e * e + n * n)
      return range >= from - about && range <= to + about && e * e0 + n * n0 >= open * range - about
    },
    seen: (e, n) => {
      const range = Math.sqrt(e * e + n * n)
      if (!(range > nearest) || range > ranges[last]) return null
      const col = cols / 2 + wrapped(Math.atan2(e, n) - middle) / turn
      if (col < -ASIDE || col > cols + ASIDE) return null
      let lo = 0, hi = last
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1
        if (ranges[mid] > range) hi = mid
        else lo = mid
      }
      const u = (range - ranges[lo]) / Math.max(1e-9, ranges[hi] - ranges[lo])
      return { x: xs[0] + col * step, y: ys[lo] + (ys[hi] - ys[lo]) * u, perKm: lo ? perKm[lo] + (perKm[hi] - perKm[lo]) * u : overhead(range),
        there: lo ? 1 : smoothstep(BEGINS, WHOLE, range / ranges[1]) }
    },
  }
}
