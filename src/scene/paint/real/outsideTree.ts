import type { Shine, Tones, TreeDesc } from '../../model/types'
import { rng } from '../shared/base/core'
import { css, mix, type Ctx2D } from '../shared/base/hand'
import { receiverBrush } from '../shared/land/receiverBrush'
import { tree } from '../shared/town/marks'
import { BODY, foliage, LARGE, TOPS, UNDER, WHOLE } from './foliage'

/** The lit leaves' shift to the light's side, of a clump; their strength in the light and under an even sky. */
const ACROSS = 0.5, LIT = 0.8, EVEN = 0.4

/** A round tree among the houses: leaf clumps, lit on the light's side (`l`, its strength) and on top; the others as everywhere. */
export function paintTree(ctx: Ctx2D, tr: TreeDesc, t: Tones, s: Shine, l: number, rock: number): void {
  if (tr.kind !== 'tree') return tree(ctx, tr, t, s, l, rock)
  const { w, seed } = tr, r = rng(seed), rx = w * 0.56, ry = w / 2, y = -ry - 0.2
  ctx.save()
  ctx.translate(tr.x, tr.base)
  // The lean and the gust of every tree of the town (`tree`).
  ctx.transform(1, 0, -(s.lean * (0.6 + 0.4 * r()) + (s.sway ?? 0) * rock * (0.7 + 0.3 * Math.sin(seed))), 1, 0, 0)
  ctx.fillStyle = css(t.deep, 0.45)
  ctx.fillRect(-w * 0.45, -0.3, w * 0.9 + 0.6, 0.6)
  ctx.fillRect(-0.3, y, 0.6, -y)
  const layer = foliage(receiverBrush(ctx), { x: 0, y, rx, ry }, seed)
  if (rx < LARGE) layer([t.green], 0.94, WHOLE)
  else {
    layer([mix(t.green, t.shade, 0.4)], 0.96, UNDER)
    layer([t.green], 0.9, BODY)
  }
  for (const side of [-1, 1]) layer([t.greenLit], LIT * Math.max(0, -side * l), { ...TOPS, across: side * ACROSS })
  layer([t.greenLit], EVEN * (1 - Math.abs(l)), TOPS)
  ctx.restore()
}
