import { rng } from '../core'
import type { Ctx2D, PaintEnv } from '../hand'
import { paintAltocumulus } from './altocumulus'
import { paintCirrus } from './cirrus'
import type { Rand } from './contour'
import { paintCumulus } from './cumulus'
import { paintDeck } from './deck'
import { lightMass } from './light'
import { paintPad } from './pads'
import { spriteBox, type CloudSprite, type SpriteGenus } from './sprite'

export type { CloudSprite, SpriteGenus } from './sprite'
export { paintShaft, type Shaft } from './shaft'

type Painter = (c: Ctx2D, s: CloudSprite, r: Rand) => void

const PAINTERS: Record<SpriteGenus, Painter> = {
  cu: paintCumulus, cg: paintCumulus, cb: paintCumulus,
  sc: paintPad, st: paintPad,
  ac: paintAltocumulus,
  as: paintDeck, ns: paintDeck,
  ci: paintCirrus, cs: paintCirrus,
}

/** Genera with bodies (they get the thin rims, silver and glow); fibres and veils are already their own light. */
const MASSED = new Set<SpriteGenus>(['cu', 'cg', 'cb', 'sc', 'st', 'ac', 'as', 'ns'])

/**
 * Paints one cloud cell onto `c` with its origin (near base middle) at (x, y), in css px. Pure: the form is seeded by
 * `s.seed`, the sheet comes from `env`. The cell is painted at full alpha on its own sheet, its light laid on the whole
 * mass, then the sheet is laid at `share` (a forming cell is seen through).
 */
export function paintCloud(c: Ctx2D, s: CloudSprite, x: number, y: number, env: PaintEnv): void {
  if (s.w < 0.5 || s.share <= 0.005) return
  const box = spriteBox(s)
  const k = env.scale
  const w = Math.max(1, Math.ceil(box.w * k)), h = Math.max(1, Math.ceil(box.h * k))
  const sheet = env.canvas(w, h)
  const sc = sheet.ctx
  sc.setTransform(k, 0, 0, k, -box.x * k, -box.y * k)
  PAINTERS[s.genus](sc, s, rng(s.seed))
  if (MASSED.has(s.genus)) lightMass({ sheet, w, h, k }, s, env)
  c.save()
  c.globalAlpha *= MASSED.has(s.genus) ? s.share : 1
  c.drawImage(sheet.canvas as CanvasImageSource, x + box.x, y + box.y, box.w, box.h)
  c.restore()
}
