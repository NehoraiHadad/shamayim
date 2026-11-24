import { isField, type GlyphKind } from '../../../../world/glyphSpecs'
import type { LayerOf, OutsideItem, RGB } from '../../../model/types'
import { rng } from '../../shared/base/core'
import { mix, type Ctx2D, type PaintEnv } from '../../shared/base/hand'
import { paintPass } from '../../shared/base/paintPass'
import type { Lamp } from '../../shared/town/glyphs/kit'
import { glowSprite } from './glowSprite'

/*
 * A town's own light by night, from the model's darkness and its share of lit windows: a pool of street light at the foot
 * of some houses and of every landmark among them (painted after its body and before the nearer ones, so a roof stands
 * dark on the lit street behind it), the lit air over a house, a bloom round the windows' halos. Added light, no filter.
 */

const STREET: RGB = [1, .74, .42]
/** The model's share of lit windows on a full evening (`shineOf`): two in five. */
const EVENING = .4
/** The share of lit windows by which the streets are on. */
const STREETS_ON = .04
/** A mark nobody lights a street for. */
const UNLIT: ReadonlySet<GlyphKind> = new Set(['palms', 'turbine', 'mast'])

export interface NightLight {
  /** The streets' light (0–1: the small hours keep half of the evening's) and the windows'. */
  street: number
  windows: number
  /** The model's lamp, and the street's colour. */
  lamp: RGB
  rgb: RGB
  top: number
  bottom: number
}

/** The town's light at this hour; null by day, and where the model lights no window. */
export function nightLight({ shine, tiers, bounds }: LayerOf<'outside'>): NightLight | null {
  const evening = Math.min(1, shine.windows / EVENING), on = Math.min(1, shine.windows / STREETS_ON)
  const street = shine.night * on * (.5 + .5 * evening)
  if (!tiers.length || street < 1 / 255) return null
  const lamp = tiers[0].win
  return { street, windows: shine.night * evening, lamp, rgb: mix(lamp, STREET, .4), top: bounds.y, bottom: bounds.y + bounds.h }
}

export interface Stand { x: number; foot: number; w: number; h: number; seed: number }

/** Where a body of the town stands; null for a tree, a field or a mark off the streets. */
function standOf(item: OutsideItem): Stand | null {
  if (item.kind === 'box') return { x: item.x, foot: item.foot, w: item.w, h: item.foot - item.top, seed: item.seed }
  if (item.kind === 'tower') return { x: item.x, foot: item.base, w: item.w, h: item.h, seed: item.seed }
  if (item.kind !== 'mark') return null
  const g = item.glyph
  return isField(g.kind) || UNLIT.has(g.kind) ? null : { x: g.x, foot: g.base, w: g.w, h: g.h * g.scale, seed: g.seed }
}

/** The body's stand where its street is lit: some of the houses, every landmark. */
export function litStand(item: OutsideItem): Stand | null {
  const stand = standOf(item)
  return stand && (item.kind === 'mark' || rng(stand.seed ^ 0x2d9)() < .55) ? stand : null
}

/** One glow, its upper and lower halves each kept inside the layer (whose edge would cut it). */
function glow(ctx: Ctx2D, env: PaintEnv, light: NightLight, x: number, y: number, rx: number, ry: number, alpha: number) {
  const high = Math.min(ry, y - light.top), low = Math.min(ry, light.bottom - y)
  if (high <= 0 || low <= 0) return
  const sprite = glowSprite(env, light.rgb), { width, height } = sprite, half = height / 2
  ctx.globalAlpha = alpha
  ctx.drawImage(sprite, 0, 0, width, half, x - rx, y - high, 2 * rx, high)
  ctx.drawImage(sprite, 0, half, width, half, x - rx, y, 2 * rx, low)
}

function added(ctx: Ctx2D, draw: () => void) {
  paintPass(ctx, 'emission', () => {
    ctx.globalCompositeOperation = 'lighter'
    draw()
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  })
}

/** The street light round one body of the town, over its own foot and the ground by it. */
export function paintStreetLight(ctx: Ctx2D, env: PaintEnv, item: OutsideItem, light: NightLight): void {
  const stand = litStand(item)
  if (!stand) return
  const { x, foot, w, h, seed } = stand, mark = item.kind === 'mark', r = rng(seed ^ 0x71a)
  const size = Math.max(1.6, w * (.55 + .45 * r()))
  const aside = mark ? 0 : (r() - .5) * w, strength = mark ? 1 : .4 + r()
  added(ctx, () => {
    glow(ctx, env, light, x + aside, foot - .3, size, Math.max(1, .6 * size), .3 * light.street * strength)
    if (r() < .3) glow(ctx, env, light, x, foot - .4 * h, 4 * w, 3 * w, .05 * light.windows)
  })
}

/** A bloom round the halos the windows threw (not the aviation lights: the model's own). */
export function paintWindowBloom(ctx: Ctx2D, env: PaintEnv, lamps: readonly Lamp[], light: NightLight): void {
  const windows = lamps.filter(({ c }) => c.every((v, i) => v === light.lamp[i]))
  if (!windows.length) return
  added(ctx, () => {
    for (const { x, y, r, a, fade = 1 } of windows) glow(ctx, env, light, x, y, 2 * r, 2 * r, .5 * a * fade * light.windows)
  })
}
