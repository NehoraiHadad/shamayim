import type { Ctx2D } from './hand'

/** Optional observer for recording semantic passes on an instrumented canvas. */
export const PAINT_PASS = Symbol('paintPass')
type Pass = 'background' | 'emission'

export function paintPass(ctx: Ctx2D, pass: Pass, draw: () => void) {
  const observe = (ctx as Ctx2D & { [PAINT_PASS]?: (pass: Pass, draw: () => void) => true })[PAINT_PASS]
  if (observe?.(pass, draw) !== true) draw()
}
