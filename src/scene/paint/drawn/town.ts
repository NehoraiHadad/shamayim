import type { LayerOf, OutsideItem, RGB, Tones, TreeDesc } from '../../model/types'
import { castShadow } from '../shared/town/castShadow'
import { drawLamps, glyphLight, glyphShadow } from '../shared/town/glyphs'
import type { Lamp } from '../shared/town/glyphs/kit'
import { mix, type Ctx2D, type PaintEnv } from '../shared/base/hand'
import { grain, rockOf, tree } from '../shared/town/marks'
import { stripPhase } from '../shared/town/stripPhase'
import { paintOutsideLand, paintOutsideSea } from '../shared/town/outsideGround'
import { skyFormIn } from './outsideOwn'
import { paintBlock } from './townBlock'
import { townBodies, townGround, type Block } from './townBlocks'
import { penFor, type KeyTier, type Pen } from './townKey'
import { paintTownGlyph } from './townGlyph'
import { townLight } from './townLight'
import { inkedLand, inkedSea, inkedTones } from './townTones'
import { paintDrawnTower } from './townTower'

/*
 * The place seen from outside in the drawn hand (v1b's Haifa on its hill): the model's land, sea, houses, towers, trees and
 * marks, in the model's own order and places, gathered into bodies that read (`townBlocks`), each of clear lit
 * and shaded planes in the block's inks, inside a key line. Pure: the desc and its seeds.
 */

/** The paper's grain, as a share of the hand's. */
const GRAIN = 0.25
/** A tree of the town reads as a clump: its size against its own, at least this wide (px); taller by this at most. */
const GROWN = 1.2, GROWN_MIN = 2.3, GROWN_TALL = 1.25
/** A crown's body against its lit half: how far it goes to the deep (a clump reads as one dark mass, lit on its side). */
const LEAF = 0.4
/** How far the farthest row of a place recedes into its own air, over the rows' real spread (px at full
 *  depth); none where its tiers' own air already spreads this far (tone). The same step the land under the rows takes
 *  over that depth (its print lightens toward the air by about a tenth from the town's front row to its back one), so a
 *  house stands in the air of the ground it is on. */
const RECEDE = 0.1, RECEDE_OVER = 16, TIERS_OWN = 0.14
/** The rows past this share of the place's depth take the far key. */
const FAR_ROWS = 0.5
/** The ground's shade under a body: its contact along the foot, and its cast, a flat block of the ground's shade ink. */
const CONTACT = { alpha: 0.75, height: 0.8 }
const CAST = { alpha: 0.85, inset: 0.3, edgeY: -0.2, tipY: 0.35, bottomY: 0.8, tipInset: () => 0.9 }
/** A body seated on its own front row: how far above the ground there it may stand and still be on it (px). */
const SEATED = 0.8
/** The steepest fall across a body a hill gives (px down per px across): a deeper step beside it is a row in front of it,
 *  not its ground. */
const FALL = 0.45

export function paintDrawnOutside(ctx: Ctx2D, desc: LayerOf<'outside'>, env: PaintEnv): void {
  const { shine: s } = desc, tiers = desc.tiers.map(inkedTones), form = skyFormIn(desc)
  if (!form) return
  const light = townLight(s, form), lateral = glyphLight(s), far = receding(desc.items, tiers)
  const bodies = townBodies(desc.items), ground = townGround(bodies), pens = new Map<KeyTier, Pen>()
  // The town stands on its own ground, a step behind the near land's crest: its front rows take the far key, the rows
  // up the place and the towns beyond it the back one, towers and houses alike (the key steps with distance alone).
  const pen = (beyond: boolean, foot: number) => {
    const tier: KeyTier = beyond || far.depth(foot) > FAR_ROWS ? 'back' : 'far'
    let p = pens.get(tier)
    if (!p) pens.set(tier, p = penFor(tier, env.scale))
    return p
  }
  if (desc.land) paintOutsideLand(ctx, inkedLand(desc.land), s)
  if (desc.sea) paintOutsideSea(ctx, inkedSea(desc.sea), s, stripPhase(desc, env))
  // Every body's seat first, under all of them: its contact on the ground and its cast, so none stands pasted on.
  for (const { block, item } of bodies) {
    if (block) castShadow(ctx, { x: block.x, base: seatOf(block, ground)?.low ?? block.foot, w: block.w, h: block.foot - block.top },
      shadeInk(far(block.tier, block.foot)), s.cast, CONTACT, CAST)
    else if (item.kind === 'tower') castShadow(ctx, item, shadeInk(far(item.tier, item.base)), s.cast, CONTACT, CAST)
    else if (item.kind === 'mark') glyphShadow(ctx, item.glyph, s)
  }
  const lamps: Lamp[] = []
  for (const { block, item } of bodies) {
    if (block) paintBlock(ctx, block, far(block.tier, block.foot), light, lamps, s.windows, pen(block.beyond, block.foot), seatOf(block, ground))
    else if (item.kind === 'tower') paintDrawnTower(ctx, item, far(item.tier, item.base), light, s, lamps, pen(false, item.base))
    else if (item.kind === 'tree') tree(ctx, grown(item.tree), far(item.tier, item.tree.base), s, lateral, rockOf(desc, env, item.tree.seed))
    else lamps.push(...paintTownGlyph(ctx, { ...item.glyph, tones: inkedTones(item.glyph.tones) }, s))
  }
  grain(ctx, env, 13, GRAIN * (1 - 0.4 * s.night))
  drawLamps(ctx, lamps, 1 / env.scale)
}

/** The ground's shade ink under a body: the town's shade gone toward its deep, as the land's own shade block is. */
const shadeInk = (t: Tones) => ({ deep: mix(t.shade, t.deep, 0.7), shade: mix(t.shade, t.deep, 0.35) })

/** Where the ground lies under a body of the front row, at its two corners, and its low side; none for one behind. */
function seatOf(b: Block, ground: (x: number) => number | undefined) {
  if (b.beyond) return undefined
  const x0 = b.x - b.w / 2, x1 = b.x + b.w / 2, at = ground(b.x)
  if (at === undefined || b.foot < at - SEATED) return undefined
  const most = b.foot + FALL * (b.w + 1)
  const side = (x: number) => { const g = ground(x) ?? b.foot; return g > most ? b.foot : Math.max(b.foot, g) }
  const left = side(x0 - 0.5), right = side(x1 + 0.5)
  return { left, right, low: Math.max(left, right) }
}

function grown(tree: TreeDesc): TreeDesc {
  const by = Math.max(GROWN, GROWN_MIN / tree.w)
  return { ...tree, w: tree.w * by, h: tree.h * Math.min(by, GROWN_TALL) }
}

/** Each tier's tones as its rows recede: the farther up the place a body stands, the more of its air lies before it. */
function receding(items: readonly OutsideItem[], tiers: readonly Tones[]) {
  const feet = items.map((i) => i.kind === 'box' ? (i.beyond ? Infinity : i.foot) : i.kind === 'tower' ? i.base : -Infinity)
    .filter(Number.isFinite)
  const near = Math.max(...feet, 0), span = Math.max(1, near - Math.min(...feet, near))
  const walls = items.flatMap((i) => i.kind === 'box' && !i.beyond ? [tiers[i.tier].wall[1]] : [])
  const aloft = walls.length ? Math.max(...walls) - Math.min(...walls) : 0
  const deep = RECEDE * Math.min(1, span / RECEDE_OVER) * Math.max(0, 1 - aloft / TIERS_OWN)
  const made = new Map<number, Tones>()
  const at = (tier: number, foot: number) => {
    const step = Math.round(8 * Math.min(1, Math.max(0, (near - foot) / span))), key = tier * 16 + step
    let tones = made.get(key)
    if (!tones) made.set(key, tones = aired(tiers[tier], (deep * step) / 8))
    return tones
  }
  /** How far up the place's rows a foot stands: 0 its nearest, 1 its farthest. */
  return Object.assign(at, { depth: (foot: number) => Math.min(1, Math.max(0, (near - foot) / span)) })
}

const LIGHTS: ReadonlySet<string> = new Set(['win', 'gold', 'mist'])

function aired(t: Tones, share: number): Tones {
  const out = { ...t }
  for (const key of Object.keys(t) as (keyof Tones)[]) if (!LIGHTS.has(key)) out[key] = mix(t[key] as RGB, t.mist, share)
  out.green = mix(out.green, out.deep, LEAF)
  return out
}
