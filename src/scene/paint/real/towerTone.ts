import type { RGB } from '../../../world/types'
import type { CloudSprite } from '../../model/cloudSprite'
import { mix } from '../shared/base/hand'
import type { TowerShape } from './towerShape'

/*
 * A tower's colour at a point: greyer at the base, the body above, the light's side lit, its lumps modelled softly by the
 * light, the crown silvered against a sun behind. Every tone is the model's. Pure (the returned colour is reused).
 */

/** How far the lumps' relief moves the colour: toward the lit tone facing the light, toward the shade away from it. */
const MODEL_LIT = 0.6, MODEL_SHADE = 0.45
/** The step over which the relief's slope is read, against the width. */
const STEP = 0.08

type Colour = [number, number, number]

/** `bump` is the shape's relief at (x, y). */
export function towerTone(s: CloudSprite, shape: TowerShape): (x: number, y: number, bump: number) => Readonly<Colour> {
  const under = mix(s.shade, s.lit, 0.6 * s.glow)
  const bottom = shape.depth, [tx, ty] = s.toward ?? [0, -1]
  const reach = Math.max(s.w, s.tall) * 0.6, mid = -s.tall * 0.55
  const step = STEP * s.w, lit = Math.min(1, s.litA), lowColumn = mix(under, s.body, 0.4)
  const c: Colour = [0, 0, 0]
  // What a row shares: the column's tone up its height, and how much of the base's shade lies on it.
  let rowY = NaN, tone = under, shaded = 0
  const toRow = (y: number) => {
    rowY = y
    // The lower column stands in the shade of the tower above it: the base's dark climbs a third of the way up.
    const up = Math.max(0, (bottom - y) / (bottom + s.tall))
    tone = up < 0.2 ? mix(under, lowColumn, up / 0.2) : mix(lowColumn, s.body, Math.min(1, (up - 0.2) / 0.35))
    // The sun lights the side, not the underside: the base stays in its own shade, darkest at the bottom.
    const b = Math.min(1, Math.max(0, (bottom - y) / (bottom + 0.3 * s.tall)))
    shaded = b < 0.4 ? 0.9 - (0.45 * b) / 0.4 : (0.45 * (1 - b)) / 0.6
  }
  return (x, y, bump) => {
    if (y !== rowY) toRow(y)
    c[0] = tone[0]; c[1] = tone[1]; c[2] = tone[2]
    const facing = bump - shape.relief(x + tx * step, y + ty * step)
    if (facing > 0) pull(c, s.lit, Math.min(0.5, MODEL_LIT * facing * (0.25 + 0.75 * lit)))
    else pull(c, s.shade, Math.min(0.4, -MODEL_SHADE * facing))
    if (lit > 0.02) {
      const p = ((x * tx + (y - mid) * ty) / reach + 1) / 2
      pull(c, s.lit, lit * Math.max(0, p < 0.55 ? (0.25 * p) / 0.55 : 0.25 + 0.6 * Math.min(1, (p - 0.55) / 0.45)))
    }
    pull(c, under, shaded)
    if (s.silver > 0.05) {
      const dx = x - tx * s.w * 0.3, dy = y + s.tall * 0.85
      pull(c, s.lit, 0.6 * s.silver * Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / (s.w * 0.6)))
    }
    return c
  }
}

/** Moves a colour toward another, in place. */
function pull(c: Colour, to: RGB, t: number) {
  for (let n = 0; n < 3; n++) c[n] += (to[n] - c[n]) * t
}
