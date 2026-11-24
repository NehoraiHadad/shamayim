import type { OutsideItem, Shine, Tones } from '../../../model/types'
import { rng } from '../../shared/base/core'
import { mix, type Ctx2D } from '../../shared/base/hand'
import { towerSetback } from '../outsideTower'
import { boxResolved, emitWindow, towerResolved } from '../outsideWindows'

/*
 * The lit windows of a body whose storeys are too fine to stand apart (the tall towers, the mass of a big town): several
 * storeys to one point of light, so such a body is not dark in the evening. The share still goes with the model's.
 */

const ACROSS = 1.3
const DOWN = 1.5
const SIZE = .5
/** Of the windows a point stands for, so few show through: a tower's, and a block's of the mass (others stand before it). */
const TOWER = .5
const BLOCK = .35

export function paintFoldedWindows(ctx: Ctx2D, item: OutsideItem, tiers: readonly Tones[], s: Shine): void {
  if (item.kind === 'tower') {
    const top = item.base - item.h + towerSetback(item)
    if (!item.industrial && !towerResolved(item, top)) points(ctx, item, top, item.base, TOWER, tiers[item.tier], s)
  } else if (item.kind === 'box' && item.w >= 1.2 && !boxResolved(item)) {
    points(ctx, item, item.top, item.foot, BLOCK, tiers[item.tier], s)
  }
}

function points(ctx: Ctx2D, b: { x: number; w: number; seed: number }, top: number, foot: number, share: number, t: Tones, s: Shine) {
  const r = rng(b.seed ^ 0x5b7), warm = mix(t.wall, t.win, .7)
  const columns = Math.max(1, Math.floor((b.w - .8) / ACROSS)), x0 = b.x - columns * ACROSS / 2 + (ACROSS - SIZE) / 2
  for (let y = top + 1; y < foot - 1; y += DOWN) {
    for (let k = 0; k < columns; k++) {
      if (r() < share * s.windows) emitWindow(ctx, x0 + k * ACROSS, y, SIZE, SIZE, warm)
    }
  }
}
