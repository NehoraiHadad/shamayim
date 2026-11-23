import type { LayerOf, OutsideItem, RGB, Tones, TreeDesc } from '../../model/types'
import { castShadow, TOWER_CAST, TOWER_CONTACT } from '../shared/town/castShadow'
import { drawLamps, glyphLight, glyphShadow } from '../shared/town/glyphs'
import type { Lamp } from '../shared/town/glyphs/kit'
import { mix, type Ctx2D, type PaintEnv } from '../shared/base/hand'
import { grain, rockOf, tree } from '../shared/town/marks'
import { stripPhase } from '../shared/town/stripPhase'
import { paintOutsideLand, paintOutsideSea } from '../shared/town/outsideGround'
import { skyFormIn } from './outsideOwn'
import { paintBlock } from './townBlock'
import { townBodies } from './townBlocks'
import { paintTownGlyph } from './townGlyph'
import { townLight } from './townLight'
import { paintDrawnTower } from './townTower'

/*
 * The place seen from outside in the drawn hand (v1b's Haifa on its hill): the model's land, sea, houses, towers, trees and
 * marks, in the model's own order and places, gathered into bodies that read (`townBlocks`), each of clear lit
 * and shaded planes. Pure: the desc and its seeds.
 */

/** The paper's grain, as a share of the hand's. */
const GRAIN = 0.25
/** A tree of the town reads as a clump: its size against its own, at least this wide (px); taller by this at most. */
const GROWN = 1.2, GROWN_MIN = 2.3, GROWN_TALL = 1.25
/** A crown's body against its lit half: how far it goes to the deep (a clump reads as one dark mass, lit on its side). */
const LEAF = 0.4
/** How far the farthest row of a place recedes into its own air, over the rows' real spread (px at full
 *  depth); none where its tiers' own air already spreads this far (tone). */
const RECEDE = 0.3, RECEDE_OVER = 16, TIERS_OWN = 0.14

export function paintDrawnOutside(ctx: Ctx2D, desc: LayerOf<'outside'>, env: PaintEnv): void {
  const { shine: s, tiers } = desc, form = skyFormIn(desc)
  if (!form) return
  const light = townLight(s, form), lateral = glyphLight(s), far = receding(desc.items, tiers)
  if (desc.land) paintOutsideLand(ctx, desc.land, s)
  if (desc.sea) paintOutsideSea(ctx, desc.sea, s, stripPhase(desc, env))
  for (const item of desc.items) {
    if (item.kind === 'tower') castShadow(ctx, item, tiers[item.tier], s.cast, TOWER_CONTACT, TOWER_CAST)
    else if (item.kind === 'mark') glyphShadow(ctx, item.glyph, s)
  }
  const lamps: Lamp[] = []
  for (const { block, item } of townBodies(desc.items)) {
    if (block) paintBlock(ctx, block, far(block.tier, block.foot), light, form, lamps, s.windows)
    else if (item.kind === 'tower') paintDrawnTower(ctx, item, far(item.tier, item.base), light, form, s, lamps)
    else if (item.kind === 'tree') tree(ctx, grown(item.tree), far(item.tier, item.tree.base), s, lateral, rockOf(desc, env, item.tree.seed))
    else lamps.push(...paintTownGlyph(ctx, item.glyph, s))
  }
  grain(ctx, env, 13, GRAIN * (1 - 0.4 * s.night))
  drawLamps(ctx, lamps, 1 / env.scale)
}

function grown(tree: TreeDesc): TreeDesc {
  const by = Math.max(GROWN, GROWN_MIN / tree.w)
  return { ...tree, w: tree.w * by, h: tree.h * Math.min(by, GROWN_TALL) }
}

/** Each tier's tones as its rows recede: the farther up the place a body stands, the more of its air lies before it. */
function receding(items: readonly OutsideItem[], tiers: readonly Tones[]): (tier: number, foot: number) => Tones {
  const feet = items.map((i) => i.kind === 'box' ? (i.beyond ? Infinity : i.foot) : i.kind === 'tower' ? i.base : -Infinity)
    .filter(Number.isFinite)
  const near = Math.max(...feet, 0), span = Math.max(1, near - Math.min(...feet, near))
  const walls = items.flatMap((i) => i.kind === 'box' && !i.beyond ? [tiers[i.tier].wall[1]] : [])
  const aloft = walls.length ? Math.max(...walls) - Math.min(...walls) : 0
  const deep = RECEDE * Math.min(1, span / RECEDE_OVER) * Math.max(0, 1 - aloft / TIERS_OWN)
  const made = new Map<number, Tones>()
  return (tier, foot) => {
    const step = Math.round(8 * Math.min(1, Math.max(0, (near - foot) / span))), key = tier * 16 + step
    let tones = made.get(key)
    if (!tones) made.set(key, tones = aired(tiers[tier], (deep * step) / 8))
    return tones
  }
}

const LIGHTS: ReadonlySet<string> = new Set(['win', 'gold', 'mist'])

function aired(t: Tones, share: number): Tones {
  const out = { ...t }
  for (const key of Object.keys(t) as (keyof Tones)[]) if (!LIGHTS.has(key)) out[key] = mix(t[key] as RGB, t.mist, share)
  out.green = mix(out.green, out.deep, LEAF)
  return out
}
