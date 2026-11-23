import type { Arch } from '../../../model/types'
import { css } from '../base/hand'

/** Earth's shadow and the belt, as stops on an ellipse round the antisolar point on the horizon. */
export function archStops(a: Arch): [number, string][] {
  const f = (px: number) => Math.min(1, px / a.belt)
  return [[0, css(a.shadowRgb, 0.42 * a.alpha)], [f(a.shadow * 0.8), css(a.shadowRgb, 0.36 * a.alpha)],
    [f(a.shadow * 1.25), css(a.beltRgb, 0.3 * a.alpha)], [f(a.shadow + 0.45 * (a.belt - a.shadow)), css(a.beltRgb, 0.22 * a.alpha)],
    [1, css(a.beltRgb, 0)]]
}
